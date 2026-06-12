import {
  BALL_RADIUS,
  FLOOR_THICKNESS,
  SPIKE_HEIGHT,
  SPIKE_WIDTH,
  CEILING_SPIKE_HEIGHT,
  COMBO_OVERCLOCK,
} from '../../utils/constants';
import type { StageData, StageElement } from '../../utils/types';
import type { Ball } from '../entities/Ball';
import type { Camera } from '../camera/Camera';
import type { ParticleSystem } from '../effects/Particles';
import type { SkinId } from '../../utils/skins';
import { perfectZoneWidth } from '../physics/Collision';
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

    // 월드 좌표계로 이동 — scale은 카메라 뷰포트(월드 단위) 계산과 반드시 일치해야 함
    ctx.save();
    const scale = viewportHeight / state.stage.height;
    ctx.scale(scale, scale);
    ctx.translate(
      -state.camera.x + state.camera.shakeOffsetX,
      -state.camera.y + state.camera.shakeOffsetY,
    );

    // 배경 점선 가이드 (먼 LCD 느낌)
    this.drawBackgroundDots(state.stage, state.camera, viewportWidth / scale);

    // 골 표시 (B안: 코어 셀)
    this.drawGoal(state.stage, state.timeMs);

    // 엘리먼트 렌더링
    for (let i = 0; i < state.stage.elements.length; i++) {
      const el = state.stage.elements[i];
      if ((el.type === 'part' || el.type === 'shield') && state.collectedItems.has(i)) continue;
      this.drawElement(el, i, state.brokenFloors, state.timeMs);
    }

    // 잔상(스킨) → 공 → 파티클 순서
    this.drawTrail(state);
    this.drawBall(state);
    state.particles.draw(ctx, state.timeMs);

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

  private drawBackgroundDots(stage: StageData, camera: { x: number }, visibleWorldW: number) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    const step = 40;
    const startX = Math.max(0, Math.floor(camera.x / step) * step);
    const endX = Math.min(stage.width, camera.x + visibleWorldW + step);
    for (let x = startX; x < endX; x += step) {
      for (let y = 40; y < stage.height; y += step) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  private drawGoal(stage: StageData, t: number) {
    const ctx = this.ctx;
    const x = stage.goal.x;
    ctx.strokeStyle = FG;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -t * 0.02; // 살아있는 전원선 느낌으로 흐르는 점선
    ctx.beginPath();
    ctx.moveTo(x, 60);
    ctx.lineTo(x, stage.height - 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // 코어 셀 심볼: 점멸하는 이중 사각형 (전원 코어)
    const blink = Math.floor(t / 500) % 2 === 0;
    ctx.strokeStyle = FG;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 11, 88, 22, 22);
    if (blink) {
      ctx.fillStyle = FG;
      ctx.fillRect(x - 5, 94, 10, 10);
    }
    ctx.fillStyle = FG;
    ctx.font = `700 18px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('CORE', x + 18, 99);
  }

  private drawElement(el: StageElement, index: number, broken: Set<number>, t: number) {
    const ctx = this.ctx;
    if (el.type === 'floor') {
      if (broken.has(index)) return;
      const w = el.width ?? 0;
      const variant = el.variant ?? 'normal';
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
      const baseY = el.y;
      const tipY = baseY - SPIKE_HEIGHT;
      const segments = Math.max(1, Math.floor(w / 14));
      const segW = w / segments;
      ctx.fillStyle = FG;
      ctx.beginPath();
      for (let i = 0; i < segments; i++) {
        const sx = el.x + i * segW;
        ctx.moveTo(sx, baseY);
        ctx.lineTo(sx + segW / 2, tipY);
        ctx.lineTo(sx + segW, baseY);
      }
      ctx.closePath();
      ctx.fill();
    } else if (el.type === 'ceiling_spike') {
      const w = el.width ?? SPIKE_WIDTH;
      const baseY = el.y;
      const tipY = baseY + CEILING_SPIKE_HEIGHT;
      // 납땜 침이 위에서 매달려 내려온 모습 — 천장까지 와이어
      ctx.strokeStyle = FG;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(el.x + w / 2, 0);
      ctx.lineTo(el.x + w / 2, baseY);
      ctx.stroke();
      const segments = Math.max(1, Math.floor(w / 14));
      const segW = w / segments;
      ctx.fillStyle = FG;
      ctx.beginPath();
      for (let i = 0; i < segments; i++) {
        const sx = el.x + i * segW;
        ctx.moveTo(sx, baseY);
        ctx.lineTo(sx + segW / 2, tipY);
        ctx.lineTo(sx + segW, baseY);
      }
      ctx.closePath();
      ctx.fill();
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
      ctx.fillStyle = FG;
      ctx.fillRect(el.x, el.y, el.width ?? 6, el.height ?? 0);
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
  }
}
