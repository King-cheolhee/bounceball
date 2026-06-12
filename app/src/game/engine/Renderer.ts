import {
  BALL_RADIUS,
  FLOOR_THICKNESS,
  SPIKE_HEIGHT,
  SPIKE_WIDTH,
  CEILING_SPIKE_HEIGHT,
  COMBO_OVERCLOCK,
  DESIGN_HEIGHT,
  BOMB_FUSE_MS,
  BOMB_BLAST_RADIUS,
  BOMB_KNOCKBACK_RADIUS,
  MOVING_SPIKE_HEIGHT,
} from '../../utils/constants';
import type { StageData, StageElement } from '../../utils/types';
import type { Ball } from '../entities/Ball';
import type { Camera } from '../camera/Camera';
import type { ParticleSystem } from '../effects/Particles';
import type { SkinId } from '../../utils/skins';
import { perfectZoneWidth } from '../physics/Collision';
import { blinkStateOf, movingSpikeOffset, type BlinkState } from '../physics/blink';
import { getChapter } from '../../utils/story';

const FG = '#ffffff';
const BG = '#000000';
const FONT = 'Inter, Pretendard, sans-serif';

export interface TrailPoint {
  x: number;
  y: number;
}

export interface RenderState {
  ball: Ball;
  stage: StageData;
  camera: Camera;
  brokenFloors: Set<number>;
  /** 2회 벽돌 중 균열 상태 인덱스 (V2 — 잔여 내구도 시각화) */
  crackedBricks: Set<number>;
  /** 점화된 폭탄: 인덱스 → 점화 시각 (점멸 가속 연출) */
  bombIgnited: Map<number, number>;
  bombExploded: Set<number>;
  /** 추격 벽 현재 x — chase 없는 스테이지는 null */
  waveX: number | null;
  /** 스테이지 시작 기준 게임 시계 — 점멸·이동 가시 상태 (충돌과 동일 기준) */
  stageMs: number;
  /** 수집된 부품/백업 셀 인덱스 — 그리지 않음 */
  collectedItems: Set<number>;
  flashAmount: number; // 0~1, 사망 등 화면 깜빡임
  goalReached: boolean;
  timeMs: number;
  particles: ParticleSystem;
  trail: TrailPoint[];
  skin: SkinId;
  combo: number;
  runParts: number;
  shieldActive: boolean;
  invulnActive: boolean;
  /** intro 페이즈일 때만 — 스테이지 이름 연출 */
  showIntro: boolean;
}

export class Renderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  resize(width: number, height: number, dpr: number) {
    const canvas = this.ctx.canvas;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(state: RenderState, viewportWidth: number, viewportHeight: number) {
    const ctx = this.ctx;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    // 월드 좌표계로 이동 — scale은 카메라 뷰포트(월드 단위) 계산과 반드시 일치해야 함.
    // DESIGN_HEIGHT 기준이므로 스테이지가 더 높으면 세로 스크롤이 된다.
    ctx.save();
    const scale = viewportHeight / DESIGN_HEIGHT;
    ctx.scale(scale, scale);
    ctx.translate(
      -state.camera.x + state.camera.shakeOffsetX,
      -state.camera.y + state.camera.shakeOffsetY,
    );

    // 배경 점선 가이드 (먼 LCD 느낌)
    this.drawBackgroundDots(state.stage, state.camera, viewportWidth / scale, DESIGN_HEIGHT);

    // 탈출구 표시 (상하좌우 어느 방향이든)
    this.drawExit(state.stage, state.timeMs, state.goalReached);

    // 엘리먼트 렌더링
    for (let i = 0; i < state.stage.elements.length; i++) {
      const el = state.stage.elements[i];
      if ((el.type === 'part' || el.type === 'shield') && state.collectedItems.has(i)) continue;
      this.drawElement(el, i, state);
    }

    // 잔상(스킨) → 공 → 파티클 순서
    this.drawTrail(state);
    this.drawBall(state);
    state.particles.draw(ctx, state.timeMs);

    // 추격 벽(셧다운 웨이브) — 모든 월드 오브젝트 위를 덮는다
    this.drawWave(state, DESIGN_HEIGHT);

    ctx.restore();

    // 화면 깜빡임(사망)
    if (state.flashAmount > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, state.flashAmount)})`;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);
    }

    // 콤보 / 오버클럭 HUD (화면 좌표)
    this.drawComboHud(state, viewportWidth, viewportHeight);

    // 스테이지 인트로 (화면 좌표)
    if (state.showIntro) {
      this.drawIntro(state.stage, viewportWidth, viewportHeight);
    }
  }

  private drawBackgroundDots(
    stage: StageData,
    camera: { x: number; y: number },
    visibleWorldW: number,
    visibleWorldH: number,
  ) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    const step = 40;
    const startX = Math.max(0, Math.floor(camera.x / step) * step);
    const endX = Math.min(stage.width, camera.x + visibleWorldW + step);
    const startY = Math.max(40, Math.floor(camera.y / step) * step);
    const endY = Math.min(stage.height, camera.y + visibleWorldH + step);
    for (let x = startX; x < endX; x += step) {
      for (let y = startY; y < endY; y += step) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  /** 탈출구 — 흐르는 점선 사각형 + 점멸 코어. 상하좌우 어느 방향이든 동일 표현 */
  private drawExit(stage: StageData, t: number, reached: boolean) {
    const ctx = this.ctx;
    const e = stage.exit;
    if (reached) {
      // 클리어 순간 — 탈출구가 점등되는 피드백
      const pulse = 0.35 + 0.3 * Math.sin(t * 0.02);
      ctx.fillStyle = `rgba(255,255,255,${pulse})`;
      ctx.fillRect(e.x, e.y, e.width, e.height);
    }
    ctx.strokeStyle = FG;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -t * 0.02; // 살아있는 전원선 느낌으로 흐르는 점선
    ctx.strokeRect(e.x, e.y, e.width, e.height);
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // 코어 셀 심볼: 점멸하는 이중 사각형 (전원 코어)
    const cx = e.x + e.width / 2;
    const cy = e.y + e.height / 2;
    const blink = Math.floor(t / 500) % 2 === 0;
    ctx.strokeStyle = FG;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 11, cy - 11, 22, 22);
    if (blink) {
      ctx.fillStyle = FG;
      ctx.fillRect(cx - 5, cy - 5, 10, 10);
    }
    ctx.fillStyle = FG;
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', cx, e.y - 14);
  }

  private drawElement(el: StageElement, index: number, state: RenderState) {
    const ctx = this.ctx;
    const broken = state.brokenFloors;
    const t = state.timeMs;
    const period = state.stage.bouncePeriod;
    // 점멸 요소(발판·벽 공통): 소멸 반주기에는 점선 예고만 그린다
    const blink: BlinkState = el.blinkPeriodMult ? blinkStateOf(el, state.stageMs, period) : 'on';

    if (el.type === 'floor') {
      if (broken.has(index)) return;
      const w = el.width ?? 0;
      const variant = el.variant ?? 'normal';
      if (el.blinkPeriodMult) {
        this.drawBlinkFloor(el, w, blink, t);
        return;
      }
      if (variant === 'brick') {
        this.drawBrick(el, w, state.crackedBricks.has(index), t);
        return;
      }
      if (variant === 'normal') {
        ctx.fillStyle = FG;
        ctx.fillRect(el.x, el.y, w, FLOOR_THICKNESS);
        this.drawPerfectZone(el, w);
      } else if (variant === 'fragile') {
        ctx.strokeStyle = FG;
        ctx.lineWidth = FLOOR_THICKNESS;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(el.x, el.y + FLOOR_THICKNESS / 2);
        ctx.lineTo(el.x + w, el.y + FLOOR_THICKNESS / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        this.drawPerfectZone(el, w);
      } else if (variant === 'explosive') {
        const flash = 0.55 + 0.45 * Math.sin(t * 0.012);
        ctx.fillStyle = `rgba(255,255,255,${flash})`;
        ctx.fillRect(el.x, el.y, w, FLOOR_THICKNESS);
        // hatching above
        ctx.strokeStyle = `rgba(255,255,255,${flash})`;
        ctx.lineWidth = 2;
        for (let xx = el.x; xx < el.x + w; xx += 10) {
          ctx.beginPath();
          ctx.moveTo(xx, el.y - 10);
          ctx.lineTo(xx + 10, el.y);
          ctx.stroke();
        }
      }
    } else if (el.type === 'spike') {
      const w = el.width ?? SPIKE_WIDTH;
      // 진짜 가시는 0.9초마다 200ms 동안 윤곽선으로 반전(전기 플리커) — 가짜는 완전
      // 정지 (V2 관찰 문법). 리뷰 확정: 기존 2px 검은 선은 실전에서 식별 불가 +
      // '깜빡임=진짜' 규칙을 천장·이동 가시에도 적용해 S17 힌트가 문자 그대로 참이 되게.
      this.drawSpikeTeeth(el.x, el.y, w, -SPIKE_HEIGHT, !el.fake && this.spikeFlicker(t));
    } else if (el.type === 'ceiling_spike') {
      const w = el.width ?? SPIKE_WIDTH;
      const baseY = el.y;
      // 납땜 침이 매달려 내려온 모습 — 짧은 와이어
      // (y=0부터 그리면 세로 맵에서 선반·탈출구를 관통하므로 120px로 제한)
      ctx.strokeStyle = FG;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(el.x + w / 2, Math.max(0, baseY - 120));
      ctx.lineTo(el.x + w / 2, baseY);
      ctx.stroke();
      // 천장 가시도 진짜이므로 같은 플리커 — '깜빡임=진짜' 문법 통일 (리뷰 확정)
      this.drawSpikeTeeth(el.x, baseY, w, CEILING_SPIKE_HEIGHT, this.spikeFlicker(t));
    } else if (el.type === 'part') {
      // 부품(◆): 회전하는 마름모 픽셀 — 살짝 떠다니는 펄스
      const pulse = 1 + 0.15 * Math.sin(t * 0.006 + index);
      const s = 8 * pulse;
      ctx.save();
      ctx.translate(el.x, el.y + Math.sin(t * 0.004 + index * 2) * 4);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = FG;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    } else if (el.type === 'shield') {
      // 백업 셀: 점선 원 안의 작은 코어
      ctx.strokeStyle = FG;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -t * 0.03;
      ctx.beginPath();
      ctx.arc(el.x, el.y, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.fillStyle = FG;
      ctx.fillRect(el.x - 3, el.y - 3, 6, 6);
    } else if (el.type === 'wall') {
      if (el.blinkPeriodMult) {
        this.drawBlinkWall(el, blink, t);
        return;
      }
      ctx.fillStyle = FG;
      ctx.fillRect(el.x, el.y, el.width ?? 6, el.height ?? 0);
    } else if (el.type === 'cracked_wall') {
      // 금 간 벽 — 폭탄으로 파괴 가능. 부서지면 그리지 않음
      if (broken.has(index)) return;
      const ww = el.width ?? 6;
      const wh = el.height ?? 0;
      ctx.fillStyle = FG;
      ctx.fillRect(el.x, el.y, ww, wh);
      // 균열: 지그재그 검은 선 — "여긴 부술 수 있다"는 시각 신호
      ctx.strokeStyle = BG;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const cx = el.x + ww / 2;
      let yy = el.y + 8;
      ctx.moveTo(cx, yy);
      let flip = 1;
      while (yy < el.y + wh - 10) {
        yy += 18;
        ctx.lineTo(cx + flip * Math.min(ww * 0.3, 5), yy);
        flip = -flip;
      }
      ctx.stroke();
    } else if (el.type === 'bomb') {
      this.drawBomb(el, index, state);
    } else if (el.type === 'launcher') {
      this.drawLauncher(el, t);
    } else if (el.type === 'moving_spike') {
      this.drawMovingSpike(el, state.stageMs, period, t);
    }
  }

  /** 진짜 가시 공통 플리커 신호: 0.9초 주기, 200ms 동안 윤곽선 반전 (가짜=정지) */
  private spikeFlicker(t: number): boolean {
    return t % 900 < 200;
  }

  /** 가시 톱니 공통 드로잉 — height 부호로 방향(음수=위로), flicker면 윤곽선만 */
  private drawSpikeTeeth(x: number, baseY: number, w: number, height: number, flicker: boolean) {
    const ctx = this.ctx;
    const tipY = baseY + height;
    const segments = Math.max(1, Math.floor(w / 14));
    const segW = w / segments;
    ctx.beginPath();
    for (let i = 0; i < segments; i++) {
      const sx = x + i * segW;
      ctx.moveTo(sx, baseY);
      ctx.lineTo(sx + segW / 2, tipY);
      ctx.lineTo(sx + segW, baseY);
    }
    ctx.closePath();
    if (flicker) {
      ctx.strokeStyle = FG;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = FG;
      ctx.fill();
    }
  }

  /** 퍼펙트 존 마커: 발판 중앙 위 2px 띠 — 조준 목표를 시각화 */
  private drawPerfectZone(el: StageElement, w: number) {
    if (w < 60) return;
    const ctx = this.ctx;
    const zone = perfectZoneWidth(w);
    const cx = el.x + w / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(cx - zone / 2, el.y - 4, zone, 2);
  }

  /** 점멸 발판 (V2) — 통일 문법: 실선=실체 / 빠른 점멸=곧 소멸 / 점선=곧 등장 / 무=소멸 */
  private drawBlinkFloor(el: StageElement, w: number, state: BlinkState, t: number) {
    const ctx = this.ctx;
    if (state === 'off') return;
    if (state === 'preview') {
      // 재등장 예고 — 점선 윤곽 (충돌 없음)
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.strokeRect(el.x, el.y, w, FLOOR_THICKNESS);
      ctx.setLineDash([]);
      return;
    }
    // 'warn': 사라지기 직전 — 빠른 점멸 (80ms 주기). 'on': 실선
    if (state === 'warn' && Math.floor(t / 80) % 2 === 0) {
      ctx.strokeStyle = FG;
      ctx.lineWidth = 2;
      ctx.strokeRect(el.x, el.y, w, FLOOR_THICKNESS);
      this.drawPerfectZone(el, w); // 충돌은 살아 있으므로 조준 보조 유지 (리뷰 확정)
      return;
    }
    ctx.fillStyle = FG;
    ctx.fillRect(el.x, el.y, w, FLOOR_THICKNESS);
    // 점멸 발판도 일반 발판과 같은 퍼펙트 존 판정을 받는다 — 마커 누락 수정 (리뷰 확정)
    this.drawPerfectZone(el, w);
  }

  /** 점멸 벽 (V2, S20) — 발판과 같은 상태 문법의 세로 버전 */
  private drawBlinkWall(el: StageElement, state: BlinkState, t: number) {
    const ctx = this.ctx;
    const ww = el.width ?? 6;
    const wh = el.height ?? 0;
    if (state === 'off') return;
    if (state === 'preview') {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.strokeRect(el.x, el.y, ww, wh);
      ctx.setLineDash([]);
      return;
    }
    if (state === 'warn' && Math.floor(t / 80) % 2 === 0) {
      ctx.strokeStyle = FG;
      ctx.lineWidth = 2;
      ctx.strokeRect(el.x, el.y, ww, wh);
      return;
    }
    ctx.fillStyle = FG;
    ctx.fillRect(el.x, el.y, ww, wh);
  }

  /** 2회 벽돌 (V2) — 잔여 내구도 시각화: 온전=벽돌 무늬 / 균열=금 간 무늬 + 미세 점멸 */
  private drawBrick(el: StageElement, w: number, cracked: boolean, t: number) {
    const ctx = this.ctx;
    const h = 12; // 일반 바닥(6px)보다 두툼한 벽돌 덩어리
    // 균열 상태: 1.0초마다 90ms 윤곽선만 — "한 번 더 밟으면 무너진다"
    if (cracked && t % 1000 < 90) {
      ctx.strokeStyle = FG;
      ctx.lineWidth = 2;
      ctx.strokeRect(el.x, el.y, w, h);
    } else {
      ctx.fillStyle = FG;
      ctx.fillRect(el.x, el.y, w, h);
    }
    // 벽돌 줄눈 (검은 선) — 위아래 2단, 엇갈린 세로 줄눈
    ctx.fillStyle = BG;
    ctx.fillRect(el.x, el.y + h / 2 - 1, w, 2);
    for (let xx = el.x + 20; xx < el.x + w; xx += 40) {
      ctx.fillRect(xx, el.y, 2, h / 2);
      const lower = xx + 20;
      if (lower < el.x + w) ctx.fillRect(lower, el.y + h / 2, 2, h / 2);
    }
    if (cracked) {
      // 균열: 가운데를 가로지르는 지그재그 금
      ctx.strokeStyle = BG;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const cy = el.y + h / 2;
      let xx = el.x + w * 0.15;
      ctx.moveTo(xx, el.y);
      let flip = 1;
      while (xx < el.x + w * 0.85) {
        xx += Math.max(10, w * 0.12);
        ctx.lineTo(xx, cy + flip * (h / 2 - 1));
        flip = -flip;
      }
      ctx.stroke();
    }
    this.drawPerfectZone(el, w);
  }

  /** 폭탄(과충전 콘덴서, V2) — 점화 전: 반경 힌트 / 점화 후: 가속 점멸 예고.
   *  점선 원 2겹: 안쪽=벽 파괴 반경(170), 바깥=넉백 반경(320) — 넉백 반경이
   *  안 보이면 '원 밖인 줄 알았는데 밀려남'이 생긴다 (리뷰 확정 공정성 수정) */
  private drawBomb(el: StageElement, index: number, state: RenderState) {
    if (state.bombExploded.has(index)) return;
    const ctx = this.ctx;
    const t = state.timeMs;
    const ignitedAt = state.bombIgnited.get(index);

    // 안쪽 원 — 벽 파괴 반경 (공정성: 예고 없는 폭발 금지. 0.18은 식별 불가라 상향)
    ctx.strokeStyle = `rgba(255,255,255,${ignitedAt !== undefined ? 0.5 : 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.arc(el.x, el.y, BOMB_BLAST_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    // 바깥 원 — 넉백 반경 (대시 패턴을 다르게: 성긴 점선 = 밀려나는 영역)
    ctx.strokeStyle = `rgba(255,255,255,${ignitedAt !== undefined ? 0.3 : 0.12})`;
    ctx.setLineDash([3, 14]);
    ctx.beginPath();
    ctx.arc(el.x, el.y, BOMB_KNOCKBACK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 본체: 콘덴서 원통 (둥근 사각) + 위로 솟은 단자 2개
    let lit = true;
    if (ignitedAt !== undefined) {
      // 퓨즈 진행에 따라 점멸 가속: 4Hz → 14Hz (물리 시계 기준 — 점화 기록과 동일 시계)
      const p = Math.min(1, (state.stageMs - ignitedAt) / BOMB_FUSE_MS);
      const hz = 4 + p * 10;
      lit = Math.floor((state.stageMs - ignitedAt) / (500 / hz)) % 2 === 0;
    }
    ctx.fillStyle = FG;
    if (lit) {
      ctx.fillRect(el.x - 11, el.y - 12, 22, 24);
      ctx.fillStyle = BG;
      ctx.fillRect(el.x - 6, el.y - 5, 12, 2); // 콘덴서 마이너스 표기
      ctx.fillRect(el.x - 1, el.y, 2, 7);
    } else {
      ctx.strokeStyle = FG;
      ctx.lineWidth = 2;
      ctx.strokeRect(el.x - 11, el.y - 12, 22, 24);
    }
    ctx.fillStyle = FG;
    ctx.fillRect(el.x - 7, el.y - 17, 3, 5); // 단자
    ctx.fillRect(el.x + 4, el.y - 17, 3, 5);
  }

  /** 발사 패드 (V2) — 진행 방향으로 흐르는 셰브론(>>) */
  private drawLauncher(el: StageElement, t: number) {
    const ctx = this.ctx;
    const w = el.width ?? 46;
    const dir = el.dir ?? 1;
    ctx.fillStyle = FG;
    ctx.fillRect(el.x, el.y, w, FLOOR_THICKNESS + 2);
    // 패드 위 셰브론 3개 — 발사 방향으로 흐른다 (방향과 기능의 무언 교육)
    const cycle = 600;
    const slide = ((t % cycle) / cycle) * 14 * dir;
    ctx.strokeStyle = FG;
    ctx.lineWidth = 2.5;
    const cy = el.y - 9;
    const baseX = el.x + w / 2 - dir * 14;
    for (let i = 0; i < 3; i++) {
      const cx = baseX + dir * i * 14 + slide;
      if (cx < el.x + 4 || cx > el.x + w - 4) continue;
      ctx.beginPath();
      ctx.moveTo(cx - dir * 5, cy - 5);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx - dir * 5, cy + 5);
      ctx.stroke();
    }
  }

  /** 이동 가시 (V2) — 상하 왕복 납땜 침 뭉치. 경로 점선 = 공정성(이동 범위 예고) */
  private drawMovingSpike(el: StageElement, stageMs: number, period: number, t: number) {
    const ctx = this.ctx;
    const w = el.width ?? 40;
    const range = el.range ?? 0;
    const offset = movingSpikeOffset(el, stageMs, period);
    const top = el.y + offset;
    const midY = top + MOVING_SPIKE_HEIGHT / 2;

    // 이동 경로 가이드 (점선) — 어디까지 내려오는지 항상 보인다
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.moveTo(el.x + w / 2, el.y + MOVING_SPIKE_HEIGHT / 2);
    ctx.lineTo(el.x + w / 2, el.y + range + MOVING_SPIKE_HEIGHT / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 본체: 위아래 양방향 톱니 (밟는 면이 없는 '순수 위험물'임이 보이게).
    // 진짜 가시 공통 플리커 적용 — '깜빡임=진짜' 문법 통일 (리뷰 확정)
    const flicker = this.spikeFlicker(t);
    const segments = Math.max(1, Math.floor(w / 14));
    const segW = w / segments;
    ctx.beginPath();
    for (let i = 0; i < segments; i++) {
      const sx = el.x + i * segW;
      // 위쪽 톱니
      ctx.moveTo(sx, midY);
      ctx.lineTo(sx + segW / 2, top - 2);
      ctx.lineTo(sx + segW, midY);
      // 아래쪽 톱니
      ctx.moveTo(sx, midY);
      ctx.lineTo(sx + segW / 2, top + MOVING_SPIKE_HEIGHT + 2);
      ctx.lineTo(sx + segW, midY);
    }
    ctx.closePath();
    if (flicker) {
      ctx.strokeStyle = FG;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = FG;
      ctx.fill();
      ctx.fillRect(el.x, midY - 2, w, 4); // 중심 코어 띠
    }
  }

  /** 추격 벽 「셧다운 웨이브」 (V2, S19) — 왼쪽에서 화면을 지우며 다가오는 소멸 전선 */
  private drawWave(state: RenderState, visibleWorldH: number) {
    const wx = state.waveX;
    if (wx === null) return;
    const ctx = this.ctx;
    const cam = state.camera;
    const t = state.timeMs;
    const left = cam.x - 40;
    if (wx <= left) return; // 아직 화면 밖
    const top = cam.y - 40;
    const h = visibleWorldH + 80;

    // 지워진 영역 — 완전한 무(배경색으로 덮음)
    ctx.fillStyle = BG;
    ctx.fillRect(left, top, wx - left, h);

    // 소멸 전선: 들쭉날쭉한 픽셀 톱니 (결정적 의사 노이즈)
    ctx.fillStyle = FG;
    for (let yy = top; yy < top + h; yy += 14) {
      const n = Math.sin(yy * 0.37 + t * 0.012) + Math.sin(yy * 0.11 - t * 0.007);
      const len = 6 + Math.abs(n) * 14;
      const on = Math.sin(yy * 1.7 + t * 0.02) > -0.6; // 일부 행은 빠진다 — 글리치감
      if (on) ctx.fillRect(wx - len, yy, len, 8);
    }
    // 전선 바로 뒤 죽어가는 픽셀 점멸
    for (let i = 0; i < 14; i++) {
      const py = top + ((i * 73 + Math.floor(t / 90) * 37) % h);
      const px = wx - 20 - ((i * 131) % 130);
      if (px < left) continue;
      if ((i + Math.floor(t / 90)) % 3 === 0) continue;
      ctx.fillRect(px, py, 3, 3);
    }
  }

  private drawTrail(state: RenderState) {
    const { trail, skin, timeMs } = state;
    if (trail.length === 0) return;
    const ctx = this.ctx;
    ctx.fillStyle = FG;
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      const t = (i + 1) / trail.length; // 0(오래됨)→1(최근)
      if (skin === 'glitch' && Math.floor((timeMs + i * 37) / 70) % 2 === 0) continue;
      let s: number;
      if (skin === 'block') s = Math.max(2, 14 * t);
      else if (skin === 'cursor') s = Math.max(1, 5 * t);
      else if (skin === 'glitch') s = Math.max(2, 10 * t);
      else s = Math.max(1, 6 * t); // dot 기본 (콤보 시에만 채워짐)
      if (skin === 'block' || skin === 'glitch') {
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawBall(state: RenderState) {
    const { ball, skin, timeMs, shieldActive, invulnActive } = state;
    const ctx = this.ctx;
    // 무적(보호막 소모 직후)일 때 점멸
    if (invulnActive && Math.floor(timeMs / 90) % 2 === 0) return;

    let bx = ball.position.x;
    let by = ball.position.y;
    if (skin === 'glitch') {
      // 결정적 지터 — 화면이 버티지 못하는 느낌
      bx += Math.sin(timeMs * 0.05) > 0.6 ? 2 : 0;
      by += Math.cos(timeMs * 0.07) > 0.7 ? -2 : 0;
    }

    ctx.fillStyle = FG;
    if (skin === 'block') {
      const s = BALL_RADIUS * 1.8;
      ctx.fillRect(bx - s / 2, by - s / 2, s, s);
      ctx.fillStyle = BG;
      ctx.fillRect(bx - 5, by - 5, 4, 4);
    } else if (skin === 'cursor') {
      ctx.beginPath();
      ctx.arc(bx, by, BALL_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.fill();
      // 십자 틱
      ctx.fillRect(bx - 1.5, by - BALL_RADIUS - 6, 3, 8);
      ctx.fillRect(bx - 1.5, by + BALL_RADIUS - 2, 3, 8);
      ctx.fillRect(bx - BALL_RADIUS - 6, by - 1.5, 8, 3);
      ctx.fillRect(bx + BALL_RADIUS - 2, by - 1.5, 8, 3);
    } else {
      ctx.beginPath();
      ctx.arc(bx, by, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      // inner dot (LCD pixel feel)
      ctx.fillStyle = BG;
      ctx.beginPath();
      ctx.arc(bx - 4, by - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 백업 셀 보유: 공 주위 회전 점선 링
    if (shieldActive) {
      ctx.strokeStyle = FG;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -timeMs * 0.04;
      ctx.beginPath();
      ctx.arc(ball.position.x, ball.position.y, BALL_RADIUS + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
  }

  private drawComboHud(state: RenderState, vw: number, vh: number) {
    const ctx = this.ctx;
    if (state.combo >= 2) {
      const overclocked = state.combo >= COMBO_OVERCLOCK;
      ctx.fillStyle = FG;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `900 ${overclocked ? 22 : 16}px ${FONT}`;
      // y=52 — 상단 중앙의 일시정지 버튼(React HUD)과 겹치지 않게
      ctx.fillText(
        overclocked ? `OVERCLOCK ×${state.combo}` : `COMBO ×${state.combo}`,
        vw / 2,
        52,
      );
      if (overclocked) {
        // 화면 가장자리 펄스 — 전류가 흐른다 (부품 2배 획득 중)
        const pulse = 0.25 + 0.2 * Math.sin(state.timeMs * 0.01);
        ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, vw - 8, vh - 8);
      }
    }
  }

  private drawIntro(stage: StageData, vw: number, vh: number) {
    const ctx = this.ctx;
    const chapter = getChapter(stage.id);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, vh / 2 - 64, vw, 128);
    ctx.fillStyle = FG;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `500 12px ${FONT}`;
    ctx.fillText(`${chapter.en} · ${chapter.name}`, vw / 2, vh / 2 - 34);
    ctx.font = `900 34px ${FONT}`;
    ctx.fillText(stage.name, vw / 2, vh / 2);
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText(`STAGE ${String(stage.id).padStart(2, '0')}`, vw / 2, vh / 2 + 34);
    if (stage.hint) {
      ctx.font = `500 13px ${FONT}`;
      ctx.fillText(`— ${stage.hint} —`, vw / 2, vh / 2 + 58);
    }
  }
}
