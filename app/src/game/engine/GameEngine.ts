import { Ball } from '../entities/Ball';
import { Camera } from '../camera/Camera';
import { detectCollisions, reachedGoal, type DeathReason } from '../physics/Collision';
import { InputHandler } from './InputHandler';
import { Renderer, type TrailPoint } from './Renderer';
import { ParticleSystem } from '../effects/Particles';
import { getStage } from '../stages/StageLoader';
import type { StageData } from '../../utils/types';
import {
  DEATH_FREEZE_MS,
  STAGE_INTRO_COOLDOWN_MS,
  SPIKE_HEIGHT,
  CEILING_SPIKE_HEIGHT,
  COMBO_OVERCLOCK,
  NEAR_MISS_HITSTOP_MS,
  SHIELD_INVULN_MS,
  PHYSICS_STEP,
  DESIGN_HEIGHT,
  WALL_KICK_WINDOW_MS,
  WALL_HIT_MIN_SPEED,
  BOMB_FUSE_MS,
  BOMB_BLAST_RADIUS,
  BOMB_KNOCKBACK_RADIUS,
} from '../../utils/constants';
import { sound } from '../../services/sound';
import { haptic } from '../../services/haptic';
import type { SkinId } from '../../utils/skins';
import { DEFAULT_SKIN } from '../../utils/skins';

export type GamePhase = 'intro' | 'playing' | 'dying' | 'cleared';

export interface GameEvents {
  /** 사망 '계수' — 연출 시작 즉시 발화 (사망 프리즈 중 일시정지→재시도로
   *  지연 콜백이 증발해 노데스 기록이 오염되던 익스플로잇 차단, 리뷰 확정) */
  onDeathCounted: () => void;
  /** 사망 '처리' — 연출(450ms) 종료 후 발화: 목숨 차감·재시작/게임오버 전환 */
  onDeath: (reason: DeathReason) => void;
  /** 클리어 시 — 이번 시도에서 모은 부품 수 + 부품 전량 수집 여부 (완수 메타 기록용) */
  onStageClear: (stageId: number, partsCollected: number, allParts: boolean) => void;
  /** 이번 시도의 부품 수 변동 — HUD 갱신용 */
  onPartsChange: (parts: number) => void;
}

/** 추격 벽(셧다운 웨이브)의 출발 x — 화면 밖 왼쪽 (공정성: 스폰 직후 여유 거리) */
const WAVE_START_X = -260;

export class GameEngine {
  private rafId: number | null = null;
  private lastTime = 0;
  private renderer: Renderer;
  private input: InputHandler;
  private ball = new Ball();
  private camera = new Camera();
  private stage: StageData | null = null;
  private brokenFloors = new Set<number>();
  /** 2회 벽돌(brick) 중 1회 밟혀 균열된 인덱스 — 다음 착지에 brokenFloors로 넘어간다 */
  private crackedBricks = new Set<number>();
  /** 점화된 폭탄: 인덱스 → 점화 시각(게임 시계). BOMB_FUSE_MS 후 폭발 */
  private bombIgnited = new Map<number, number>();
  private bombExploded = new Set<number>();
  /** 추격 벽(셧다운 웨이브) 현재 x — chase 없는 스테이지는 null */
  private waveX: number | null = null;
  private trailEnabled = true;
  private collectedItems = new Set<number>();
  private nearMissSeen = new Set<number>();
  private particles = new ParticleSystem();
  private trail: TrailPoint[] = [];
  private combo = 0;
  private runParts = 0;
  private shield = false;
  private invulnUntil = 0;
  private hitstopUntil = 0;
  /** 벽 반동 점프 대기 — 벽 충돌 후 150ms 안에 반대 방향 입력 시 발동 */
  private pendingKick: { dir: 1 | -1; until: number } | null = null;
  private flashAmount = 0;
  private phase: GamePhase = 'intro';
  private deathReason: DeathReason | null = null;
  private deathStartTime = 0;
  private introStart = 0;
  /**
   * 게임 시계(ms) — update()에서만 dt만큼 누적된다.
   * 일시정지 중에는 멈추므로 인트로 유예·사망 프리즈·무적·히트스톱이
   * 일시정지를 무시하고 소진되지 않는다. (벽시계 사용은 리뷰 확정 버그였음)
   */
  private timeMs = 0;
  /**
   * 물리 시계(ms) — stepPhysics에서만 1스텝(1/120s)씩 누적된다 (V2 리뷰 확정 수정).
   * 점멸·이동 가시·웨이브·폭탄 퓨즈·무적·반동 창의 기준 시계.
   * timeMs(프레임 시계)를 쓰면 ① 한 프레임의 모든 서브스텝이 같은 시각을 공유해
   * 저사양(30fps)에서 판정이 최대 50ms 양자화되고 ② 히트스톱 중 공만 얼고
   * 세계(웨이브·점멸)는 흘러 박자가 영구 탈동기됐다 — 둘 다 이 시계로 해결.
   */
  private physMs = 0;
  /** 고정 타임스텝 누적기 — 점프 높이가 기기 프레임레이트와 무관해진다 */
  private accumulator = 0;
  private paused = false;
  private destroyed = false;
  private skin: SkinId = DEFAULT_SKIN;
  private canvas: HTMLCanvasElement;
  private dpr: number = window.devicePixelRatio || 1;
  private viewportWidth = 0;
  private viewportHeight = 0;

  constructor(canvas: HTMLCanvasElement, private events: GameEvents) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.renderer = new Renderer(ctx);
    this.input = new InputHandler(() => this.viewportWidth);
  }

  attach(touchTarget: HTMLElement) {
    this.input.attach(touchTarget);
  }

  detach() {
    this.input.detach();
  }

  destroy() {
    this.destroyed = true;
    this.stop();
    this.detach();
  }

  setSkin(skin: SkinId) {
    this.skin = skin;
  }

  /** 잔상 트레일 토글 (설정) — OFF면 콤보 잔상까지 모두 끈다 (멀미 민감 배려) */
  setTrailEnabled(value: boolean) {
    this.trailEnabled = value;
  }

  resize(width: number, height: number) {
    this.dpr = window.devicePixelRatio || 1;
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.renderer.resize(width, height, this.dpr);
    this.updateCameraViewport();
  }

  /**
   * 카메라 뷰포트를 "월드 좌표" 단위로 갱신.
   * 렌더러가 scale = 화면높이/DESIGN_HEIGHT 로 그리므로, 카메라의 가시 폭은
   * 화면폭 ÷ scale 이어야 한다. 스테이지 height가 DESIGN_HEIGHT보다 크면
   * 세로 스크롤 맵이 된다 (상하 방향 탈출 지원).
   */
  private updateCameraViewport() {
    if (!this.stage || this.viewportHeight === 0) return;
    const scale = this.viewportHeight / DESIGN_HEIGHT;
    this.camera.setViewport(this.viewportWidth / scale, DESIGN_HEIGHT);
  }

  loadStage(stageId: number) {
    const stage = getStage(stageId);
    if (!stage) throw new Error(`Stage ${stageId} not found`);
    this.stage = stage;
    this.ball.setStage(stageId);
    this.ball.spawn(stage.spawn.x, stage.spawn.y);
    this.camera.setWorld(stage.width, stage.height);
    this.updateCameraViewport();
    this.camera.snapTo(stage.spawn.x, stage.spawn.y);
    this.camera.clearShake(); // 일시정지 경유 재시작 시 이전 시도의 흔들림 잔존 방지 (리뷰 확정)
    this.physMs = 0; // 물리 시계 리셋 — 점멸·이동 가시 위상이 매 시도 동일 (결정성)
    this.pendingKick = null;
    this.brokenFloors.clear();
    this.crackedBricks.clear();
    this.bombIgnited.clear();
    this.bombExploded.clear();
    this.waveX = stage.chase ? WAVE_START_X : null;
    this.collectedItems.clear();
    this.nearMissSeen.clear();
    this.particles.clear();
    this.trail = [];
    this.combo = 0;
    this.shield = false;
    this.invulnUntil = 0;
    this.hitstopUntil = 0;
    this.accumulator = 0;
    this.runParts = 0;
    this.events.onPartsChange(0);
    this.flashAmount = 0;
    this.phase = 'intro';
    this.deathReason = null;
    this.input.clear();
    // 게임 시계 기준 인트로 — setTimeout(경합)도 벽시계(일시정지 무시)도 아님
    this.introStart = this.timeMs;
  }

  start() {
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    const loop = (time: number) => {
      if (this.destroyed) return;
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;
      if (!this.paused) {
        this.update(dt);
      }
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  pause() {
    this.paused = true;
    this.input.clear();
  }

  resume() {
    this.paused = false;
    this.lastTime = performance.now();
  }

  isPaused(): boolean {
    return this.paused;
  }

  private update(dt: number) {
    if (!this.stage) return;

    this.timeMs += dt * 1000; // 게임 시계 — 일시정지 중에는 update가 불리지 않아 자동 정지
    this.camera.update(dt * 1000);
    this.particles.update(dt);

    if (this.phase === 'intro') {
      if (this.timeMs - this.introStart >= STAGE_INTRO_COOLDOWN_MS) {
        this.phase = 'playing';
      }
      this.camera.follow(this.ball.position.x, this.ball.position.y, dt);
      return;
    }

    if (this.phase === 'dying') {
      this.flashAmount = Math.max(0, this.flashAmount - dt * 2);
      if (this.timeMs - this.deathStartTime > DEATH_FREEZE_MS) {
        if (this.deathReason) {
          this.events.onDeath(this.deathReason);
          this.deathReason = null;
        }
      }
      return;
    }

    if (this.phase === 'cleared') {
      this.ball.update(dt, { left: false, right: false });
      this.updateTrail();
      this.camera.follow(this.ball.position.x, this.ball.position.y, dt);
      return;
    }

    // 근소실패 히트스톱 — 짧은 시간 물리 정지 (연출)
    if (this.timeMs < this.hitstopUntil) {
      this.camera.follow(this.ball.position.x, this.ball.position.y, dt);
      return;
    }

    // 고정 타임스텝 물리 — 프레임레이트가 달라도 점프 높이·궤적이 동일
    const input = this.input.getInput();
    this.accumulator += dt;
    while (this.accumulator >= PHYSICS_STEP && this.phase === 'playing') {
      this.accumulator -= PHYSICS_STEP;
      this.stepPhysics(PHYSICS_STEP, input);
      if (this.timeMs < this.hitstopUntil) break; // 근소실패 발생 — 남은 스텝 중단
    }

    if (this.phase === 'playing' || this.phase === 'cleared') {
      this.updateTrail();
    }
    this.camera.follow(this.ball.position.x, this.ball.position.y, dt);
  }

  /** 물리 1스텝 (PHYSICS_STEP 고정) — 이동·충돌·게임 이벤트 */
  private stepPhysics(step: number, input: { left: boolean; right: boolean }) {
    if (!this.stage) return;

    // 물리 시계 — 스텝마다 누적 (서브스텝 양자화·히트스톱 누수 방지, 리뷰 확정)
    this.physMs += step * 1000;

    const prevX = this.ball.position.x;
    const prevY = this.ball.position.y;

    this.ball.update(step, input);

    // 추격 벽(셧다운 웨이브) — 물리 시계 기반 절대 위치: 일시정지·히트스톱에 안전.
    // 물리 시계는 인트로 동안 멈춰 있으므로 유예(delayMs)만 빼면 된다 (스폰 3초 무입력 생존)
    if (this.stage.chase && this.waveX !== null) {
      const elapsed = this.physMs - this.stage.chase.delayMs;
      this.waveX = WAVE_START_X + (Math.max(0, elapsed) * this.stage.chase.speed) / 1000;
      // 결승선 동시 도달은 플레이어 우대 — 탈출구 위에서 웨이브에 잡히지 않는다 (리뷰 확정)
      if (this.ball.position.x < this.waveX && !reachedGoal(this.ball, this.stage.exit)) {
        // 소멸 벽에 잡힘 — 보호막 무효 (낙사와 같은 등급의 즉사)
        this.triggerDeath('wave');
        return;
      }
    }

    // 점화된 폭탄의 퓨즈 소진 → 폭발 (넉백이 적용된 채 아래 충돌 검사로 이어진다)
    if (this.bombIgnited.size > 0) {
      for (const [idx, ignitedAt] of this.bombIgnited) {
        if (this.physMs - ignitedAt >= BOMB_FUSE_MS) {
          this.explodeBomb(idx);
        }
      }
    }

    // 벽 - 스테이지 좌우 경계 (벽 반동 점프 가능)
    // 일정 속도 이상으로 부딪힐 때만 '충돌' — 벽에 밀착해 누르고 있을 때
    // 효과음이 초당 120회 연타되고 반동 창이 무한해지던 버그 수정
    if (this.ball.position.x - this.ball.radius < 0) {
      const impact = this.ball.velocity.x < -WALL_HIT_MIN_SPEED;
      this.ball.bounceOnWall('left', 0);
      if (impact) {
        sound.play('wall');
        this.armWallKick(1);
      }
    }
    if (this.ball.position.x + this.ball.radius > this.stage.width) {
      const impact = this.ball.velocity.x > WALL_HIT_MIN_SPEED;
      this.ball.bounceOnWall('right', this.stage.width);
      if (impact) {
        sound.play('wall');
        this.armWallKick(-1);
      }
    }

    // 벽 반동 점프 발동 체크 — 충돌 후 150ms 창 안에 벽 반대 방향 입력
    if (this.pendingKick) {
      if (this.physMs > this.pendingKick.until) {
        this.pendingKick = null;
      } else if (
        (this.pendingKick.dir === 1 && input.right) ||
        (this.pendingKick.dir === -1 && input.left)
      ) {
        this.ball.wallKick(this.pendingKick.dir);
        this.pendingKick = null;
        sound.play('wallkick');
        haptic('medium');
        this.particles.burst(this.ball.position.x, this.ball.position.y, {
          count: 6, speed: 180, size: 3.5, life: 0.4, gravity: 500, upBias: 0.6,
        });
        this.particles.ring(this.ball.position.x, this.ball.position.y, 56, 320);
      }
    }

    // 충돌 처리 (스윕 방식 — 고속 낙하 터널링 방지)
    // physMs: 물리 시계 — 점멸·이동 가시의 결정적 상태 계산용 (충돌·렌더 공유)
    const collision = detectCollisions(
      this.ball,
      this.stage.elements,
      this.stage.height,
      this.stage.width,
      prevX,
      prevY,
      this.brokenFloors,
      this.collectedItems,
      this.physMs,
      this.stage.bouncePeriod,
    );

    // 폭탄 점화 — 이미 점화/폭발된 폭탄은 무시
    for (const idx of collision.touchedBombs) {
      if (this.bombIgnited.has(idx) || this.bombExploded.has(idx)) continue;
      this.bombIgnited.set(idx, this.physMs);
      const el = this.stage.elements[idx];
      sound.play('fuse');
      haptic('soft');
      this.particles.ring(el.x, el.y, 44, 280);
    }

    // 부품(◆) 수집
    for (const idx of collision.collectedParts) {
      this.collectedItems.add(idx);
      const el = this.stage.elements[idx];
      const gain = this.combo >= COMBO_OVERCLOCK ? 2 : 1; // 오버클럭 중 2배
      this.runParts += gain;
      this.events.onPartsChange(this.runParts);
      sound.play('collect');
      this.particles.burst(el.x, el.y, { count: 5, speed: 120, size: 3, life: 0.4, gravity: 300, upBias: 0.3 });
    }

    // 백업 셀(보호막) 획득
    for (const idx of collision.collectedShields) {
      this.collectedItems.add(idx);
      const el = this.stage.elements[idx];
      this.shield = true;
      sound.play('shield');
      this.particles.ring(el.x, el.y, 60, 300);
    }

    if (collision.death) {
      const lethal = collision.death;
      if (lethal !== 'fall' && this.physMs < this.invulnUntil) {
        // 보호막 소모 직후 무적 — 위험 방향에 따라 탈출 (천장 가시는 아래로)
        this.pendingKick = null; // 반동이 탈출 방향을 덮어쓰지 않게
        if (lethal === 'explosive' && collision.deathIndex !== undefined) {
          // 무적 중 폭발 발판 착지: consumeShield와 동일하게 발판을 파괴하고
          // 윗면에서 바운스 — 안 부수면 무적 종료 직후 같은 발판에서 즉사 (리뷰 확정)
          this.brokenFloors.add(collision.deathIndex);
          sound.play('explosive');
          this.ball.bounceOnFloor(this.stage.elements[collision.deathIndex].y);
        } else if (lethal === 'ceiling-spike') {
          this.ball.reboundDown();
        } else {
          this.ball.rebound();
        }
      } else if (lethal !== 'fall' && this.shield) {
        this.consumeShield(lethal, collision.deathIndex);
      } else {
        this.triggerDeath(lethal);
        return;
      }
    }

    if (collision.wallHit) {
      const impact =
        collision.wallHit.side === 'left'
          ? this.ball.velocity.x < -WALL_HIT_MIN_SPEED
          : this.ball.velocity.x > WALL_HIT_MIN_SPEED;
      this.ball.bounceOnWall(collision.wallHit.side, collision.wallHit.x);
      if (impact) {
        sound.play('wall');
        // side는 벽이 공의 어느 쪽에 있는지 — 반동 방향은 그 반대
        this.armWallKick(collision.wallHit.side === 'left' ? 1 : -1);
      }
    }

    if (collision.landedFloor) {
      this.handleLanding(collision.landedFloor);
    }

    // 발사 패드 착지 — 화살표 방향 수평 발사 (꺾어 멈추기는 Ball의 제동이 처리)
    if (collision.landedLauncher) {
      this.pendingKick = null; // 발사가 반동 입력 창을 덮어쓰지 않게
      const { el } = collision.landedLauncher;
      const dir = el.dir ?? 1;
      this.ball.launch(dir);
      sound.play('launch');
      haptic('medium');
      const lx = this.ball.position.x;
      const ly = this.ball.position.y + this.ball.radius;
      this.particles.burst(lx, ly, { count: 6, speed: 200, size: 3.5, life: 0.4, gravity: 400, upBias: 0.3 });
      this.particles.ring(lx, ly, 48, 320);
      // 콤보는 유지·미적립 — 발사 패드는 퍼펙트 존이 없는 중립 발판
    }

    // 근소실패(아슬아슬 회피) — 가시 1개당 시도 내 1회만 연출
    for (const idx of collision.nearMissSpikes) {
      if (this.nearMissSeen.has(idx)) continue;
      this.nearMissSeen.add(idx);
      const el = this.stage.elements[idx];
      const w = el.width ?? 40;
      this.hitstopUntil = this.timeMs + NEAR_MISS_HITSTOP_MS;
      // 반동 창(physMs 기준)은 히트스톱 동안 물리 시계가 함께 얼어 자동 보존된다
      // (기존의 수동 연장 보정은 physMs 도입으로 불필요해져 제거 — 리뷰 확정 수정)
      sound.play('whoosh');
      this.camera.shake(3, 120);
      this.particles.ring(el.x + w / 2, el.y - SPIKE_HEIGHT, 36, 260);
    }

    // 탈출구 체크 (상하좌우 모든 방향 지원)
    if (reachedGoal(this.ball, this.stage.exit)) {
      this.phase = 'cleared';
      this.bombIgnited.clear(); // 클리어 연출 중 미폭발 점멸이 영원히 남지 않게 (리뷰 확정)
      sound.play('clear');
      haptic('success');
      this.particles.burst(this.ball.position.x, this.ball.position.y, {
        count: 18, speed: 260, size: 5, life: 0.8, gravity: 500, upBias: 0.8,
      });
      this.particles.ring(this.ball.position.x, this.ball.position.y, 140, 320);
      // 부품 전량 수집 여부 (완수 메타) — 개수 기준 (오버클럭 2배 적립과 무관)
      let totalParts = 0;
      let gotParts = 0;
      for (let i = 0; i < this.stage.elements.length; i++) {
        if (this.stage.elements[i].type !== 'part') continue;
        totalParts++;
        if (this.collectedItems.has(i)) gotParts++;
      }
      this.events.onStageClear(this.stage.id, this.runParts, totalParts > 0 && gotParts === totalParts);
    }
  }

  /** 벽 충돌 직후 반동 점프 대기 시작 — dir은 벽에서 멀어지는 방향 (물리 시계 기준) */
  private armWallKick(dir: 1 | -1) {
    this.pendingKick = { dir, until: this.physMs + WALL_KICK_WINDOW_MS };
  }

  /** 착지 처리 — 퍼펙트 콤보(중독성 장치의 핵심) 포함 */
  private handleLanding(landed: { el: StageData['elements'][number]; index: number; perfect: boolean }) {
    if (!this.stage) return;
    // 착지하면 벽 반동 창 소멸 — 바닥 위에서 '고스트 벽킥'이 발동하던 버그 수정
    this.pendingKick = null;
    const { el, index, perfect } = landed;
    const variant = el.variant ?? 'normal';
    const bx = this.ball.position.x;
    const by = this.ball.position.y + this.ball.radius;

    if (perfect) {
      this.combo += 1;
      // 콤보가 쌓일수록 반음씩 상승 (12콤보 = 한 옥타브)
      const pitch = Math.pow(2, Math.min(this.combo, 12) / 12);
      sound.play('perfect', { pitch });
      this.particles.burst(bx, by, { count: 4, speed: 140, size: 3, life: 0.35, gravity: 400, upBias: 0.9 });
      this.particles.ring(bx, by, Math.min(40 + this.combo * 8, 120), 280);
      haptic('soft');
    } else {
      if (this.combo >= 3) sound.play('comboBreak');
      this.combo = 0;
      sound.play('bounce');
      this.particles.burst(bx, by, { count: 2, speed: 80, size: 2.5, life: 0.3, gravity: 350, upBias: 0.4 });
      this.particles.ring(bx, by, 28, 240);
      haptic('soft');
    }

    if (variant === 'fragile' && !this.brokenFloors.has(index)) {
      // 1회 착지 후 붕괴 — 이후 충돌은 detectCollisions가 건너뜀
      // (기존 버그: 부서져 안 보이는 바닥이 계속 충돌했음 — 수정 완료)
      this.brokenFloors.add(index);
      sound.play('fragile');
      haptic('medium');
      const w = el.width ?? 0;
      this.particles.burst(el.x + w / 2, el.y, {
        count: 8, speed: 160, size: 4, life: 0.5, gravity: 800, upBias: 0.1,
      });
    }

    // 2회 벽돌(V2): 1회째 균열(잔여 내구도 시각화 — 렌더러가 균열+점멸 표시), 2회째 붕괴
    if (variant === 'brick' && !this.brokenFloors.has(index)) {
      const w = el.width ?? 0;
      if (!this.crackedBricks.has(index)) {
        this.crackedBricks.add(index);
        sound.play('fragile');
        haptic('soft');
        this.particles.burst(this.ball.position.x, el.y, {
          count: 4, speed: 110, size: 3, life: 0.35, gravity: 700, upBias: 0.2,
        });
      } else {
        this.brokenFloors.add(index);
        sound.play('brickBreak');
        haptic('medium');
        this.particles.burst(el.x + w / 2, el.y, {
          count: 12, speed: 190, size: 4.5, life: 0.55, gravity: 850, upBias: 0.15,
        });
      }
    }
  }

  /**
   * 폭탄 폭발 (V2) — 항상 동일한 순서·세기 (공정성):
   * ① 반경 내 금 간 벽 전부 파괴 ② 반경 내 공이면 폭심 반대 방향 수평 넉백.
   * 넉백 후 착지는 플레이어 책임 — 좌우 입력 제동으로 '버티는' 것이 이 기믹의 도전.
   */
  private explodeBomb(index: number) {
    if (!this.stage) return;
    this.bombIgnited.delete(index);
    this.bombExploded.add(index);
    const bomb = this.stage.elements[index];
    sound.play('blast');
    haptic('error');
    this.camera.shake(8, 320);
    this.particles.burst(bomb.x, bomb.y, {
      count: 16, speed: 320, size: 5, life: 0.7, gravity: 600, upBias: 0.5,
    });
    this.particles.ring(bomb.x, bomb.y, BOMB_BLAST_RADIUS, 520);

    // 금 간 벽 파괴 — 벽 사각형과 폭심의 최근접 거리 기준
    for (let i = 0; i < this.stage.elements.length; i++) {
      const w = this.stage.elements[i];
      if (w.type !== 'cracked_wall' || this.brokenFloors.has(i)) continue;
      const ww = w.width ?? 6;
      const wh = w.height ?? 0;
      const nearX = Math.max(w.x, Math.min(bomb.x, w.x + ww));
      const nearY = Math.max(w.y, Math.min(bomb.y, w.y + wh));
      const dx = nearX - bomb.x;
      const dy = nearY - bomb.y;
      if (dx * dx + dy * dy <= BOMB_BLAST_RADIUS * BOMB_BLAST_RADIUS) {
        this.brokenFloors.add(i);
        this.particles.burst(w.x + ww / 2, w.y + wh / 2, {
          count: 10, speed: 220, size: 4, life: 0.6, gravity: 750, upBias: 0.3,
        });
      }
    }

    // 공 넉백 — 폭심 반대 방향 (반경 밖이면 안전)
    const bdx = this.ball.position.x - bomb.x;
    const bdy = this.ball.position.y - bomb.y;
    if (bdx * bdx + bdy * bdy <= BOMB_KNOCKBACK_RADIUS * BOMB_KNOCKBACK_RADIUS) {
      this.pendingKick = null; // 반동 입력 창이 넉백을 덮어쓰지 않게
      this.ball.knockback(bdx >= 0 ? 1 : -1);
    }
  }

  /** 백업 셀 소모 — 가시/폭발 1회 무효화 후 위험 반대 방향으로 탈출 + 짧은 무적 */
  private consumeShield(reason: Exclude<DeathReason, 'fall'>, deathIndex?: number) {
    if (!this.stage) return;
    this.shield = false;
    this.invulnUntil = this.physMs + SHIELD_INVULN_MS; // 물리 시계 — 히트스톱에 잠식되지 않음
    this.combo = 0;
    this.pendingKick = null;
    sound.play('shieldBreak');
    haptic('medium');
    this.camera.shake(5, 200);
    this.particles.burst(this.ball.position.x, this.ball.position.y, {
      count: 10, speed: 200, size: 4, life: 0.5, gravity: 600, upBias: 0.5, blink: true,
    });
    if (reason === 'ceiling-spike') {
      // 천장 가시: 아래로 탈출 + 가시 띠 아래로 위치 보정
      if (deathIndex !== undefined) {
        const el = this.stage.elements[deathIndex];
        this.ball.position.y = el.y + CEILING_SPIKE_HEIGHT + this.ball.radius + 2;
      }
      this.ball.reboundDown();
      return;
    }
    if (reason === 'explosive' && deathIndex !== undefined) {
      // 폭발 발판은 보호막이 흡수해도 파괴된다 (직후 착지 지점은 플레이어 책임 — 의도된 설계)
      this.brokenFloors.add(deathIndex);
      sound.play('explosive');
    }
    this.ball.rebound();
  }

  private triggerDeath(reason: DeathReason) {
    this.phase = 'dying';
    this.deathReason = reason;
    this.deathStartTime = this.timeMs;
    this.flashAmount = 1.0;
    this.combo = 0;
    this.bombIgnited.clear(); // 사망 연출 중 미폭발 점멸이 남지 않게 (리뷰 확정)
    // 사망 '계수'는 즉시 — 연출 450ms 중 일시정지→재시도로 onDeath가 증발해도
    // 노데스 기록·사망 통계가 오염되지 않는다 (리뷰 확정 익스플로잇 차단)
    this.events.onDeathCounted();
    if (reason === 'spike' || reason === 'ceiling-spike') {
      sound.play('spike');
    } else if (reason === 'explosive' || reason === 'wave') {
      sound.play('explosive');
    } else {
      sound.play('gameover');
    }
    haptic('error');
    this.camera.shake(6, 250);
    this.particles.burst(this.ball.position.x, this.ball.position.y, {
      count: 14, speed: 280, size: 5, life: 0.6, gravity: 700, upBias: 0.6,
    });
    this.input.clear();
  }

  private updateTrail() {
    // 잔상 트레일 토글(설정) — OFF면 콤보 잔상 포함 전부 끔 (멀미 민감 배려)
    if (!this.trailEnabled) {
      if (this.trail.length > 0) this.trail = [];
      return;
    }
    // 잔상 길이: 기본 상시 + 콤보 보너스. V2: 원작 BOUND의 포물선 잔상 오마주로
    // 기본 스킨도 상시 잔상을 갖는다 (벽 반동 궤적 학습 보조 — 조사 P10).
    const base = this.skin === 'dot' ? 10 : 8;
    const comboBonus = this.combo >= 3 ? Math.min(6 + this.combo * 2, 18) : 0;
    const maxLen = Math.min(base + comboBonus, 22);
    this.trail.push({ x: this.ball.position.x, y: this.ball.position.y });
    while (this.trail.length > maxLen) this.trail.shift();
  }

  private render() {
    if (!this.stage) return;
    this.renderer.render(
      {
        ball: this.ball,
        stage: this.stage,
        camera: this.camera,
        brokenFloors: this.brokenFloors,
        crackedBricks: this.crackedBricks,
        bombIgnited: this.bombIgnited,
        bombExploded: this.bombExploded,
        waveX: this.waveX,
        stageMs: this.physMs, // 물리 시계 — 충돌 판정과 동일 기준 (보이는 것 = 죽는 것)
        collectedItems: this.collectedItems,
        flashAmount: this.flashAmount,
        goalReached: this.phase === 'cleared',
        timeMs: this.timeMs,
        particles: this.particles,
        trail: this.trail,
        skin: this.skin,
        combo: this.combo,
        runParts: this.runParts,
        shieldActive: this.shield,
        invulnActive: this.physMs < this.invulnUntil,
        showIntro: this.phase === 'intro',
      },
      this.viewportWidth,
      this.viewportHeight,
    );
  }
}
