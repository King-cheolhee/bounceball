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
} from '../../utils/constants';
import { sound } from '../../services/sound';
import { haptic } from '../../services/haptic';
import type { SkinId } from '../../utils/skins';
import { DEFAULT_SKIN } from '../../utils/skins';

export type GamePhase = 'intro' | 'playing' | 'dying' | 'cleared';

export interface GameEvents {
  onDeath: (reason: DeathReason) => void;
  /** 클리어 시 — 이번 시도에서 모은 부품 수를 함께 전달 (클리어해야 적립) */
  onStageClear: (stageId: number, partsCollected: number) => void;
  /** 이번 시도의 부품 수 변동 — HUD 갱신용 */
  onPartsChange: (parts: number) => void;
}

export class GameEngine {
  private rafId: number | null = null;
  private lastTime = 0;
  private renderer: Renderer;
  private input: InputHandler;
  private ball = new Ball();
  private camera = new Camera();
  private stage: StageData | null = null;
  private brokenFloors = new Set<number>();
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
    this.pendingKick = null;
    this.brokenFloors.clear();
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

    const prevX = this.ball.position.x;
    const prevY = this.ball.position.y;

    this.ball.update(step, input);

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
      if (this.timeMs > this.pendingKick.until) {
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
    const collision = detectCollisions(
      this.ball,
      this.stage.elements,
      this.stage.height,
      prevX,
      prevY,
      this.brokenFloors,
      this.collectedItems,
    );

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
      if (lethal !== 'fall' && this.timeMs < this.invulnUntil) {
        // 보호막 소모 직후 무적 — 위험 방향에 따라 탈출 (천장 가시는 아래로)
        this.pendingKick = null; // 반동이 탈출 방향을 덮어쓰지 않게
        if (lethal === 'ceiling-spike') this.ball.reboundDown();
        else this.ball.rebound();
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

    // 근소실패(아슬아슬 회피) — 가시 1개당 시도 내 1회만 연출
    for (const idx of collision.nearMissSpikes) {
      if (this.nearMissSeen.has(idx)) continue;
      this.nearMissSeen.add(idx);
      const el = this.stage.elements[idx];
      const w = el.width ?? 40;
      this.hitstopUntil = this.timeMs + NEAR_MISS_HITSTOP_MS;
      // 히트스톱이 벽 반동 입력 창을 잠식하지 않도록 창을 같은 만큼 연장
      if (this.pendingKick) this.pendingKick.until += NEAR_MISS_HITSTOP_MS;
      sound.play('whoosh');
      this.camera.shake(3, 120);
      this.particles.ring(el.x + w / 2, el.y - SPIKE_HEIGHT, 36, 260);
    }

    // 탈출구 체크 (상하좌우 모든 방향 지원)
    if (reachedGoal(this.ball, this.stage.exit)) {
      this.phase = 'cleared';
      sound.play('clear');
      haptic('success');
      this.particles.burst(this.ball.position.x, this.ball.position.y, {
        count: 18, speed: 260, size: 5, life: 0.8, gravity: 500, upBias: 0.8,
      });
      this.particles.ring(this.ball.position.x, this.ball.position.y, 140, 320);
      this.events.onStageClear(this.stage.id, this.runParts);
    }
  }

  /** 벽 충돌 직후 반동 점프 대기 시작 — dir은 벽에서 멀어지는 방향 */
  private armWallKick(dir: 1 | -1) {
    this.pendingKick = { dir, until: this.timeMs + WALL_KICK_WINDOW_MS };
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
  }

  /** 백업 셀 소모 — 가시/폭발 1회 무효화 후 위험 반대 방향으로 탈출 + 짧은 무적 */
  private consumeShield(reason: Exclude<DeathReason, 'fall'>, deathIndex?: number) {
    if (!this.stage) return;
    this.shield = false;
    this.invulnUntil = this.timeMs + SHIELD_INVULN_MS;
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
    if (reason === 'spike' || reason === 'ceiling-spike') {
      sound.play('spike');
    } else if (reason === 'explosive') {
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
    // 잔상 길이: 스킨별 기본 + 콤보 보너스. 기본 스킨은 3콤보부터 잔상이 생긴다.
    const base = this.skin === 'dot' ? 0 : 8;
    const comboBonus = this.combo >= 3 ? Math.min(6 + this.combo * 2, 18) : 0;
    const maxLen = Math.min(base + comboBonus, 22);
    if (maxLen === 0) {
      if (this.trail.length > 0) this.trail = [];
      return;
    }
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
        invulnActive: this.timeMs < this.invulnUntil,
        showIntro: this.phase === 'intro',
      },
      this.viewportWidth,
      this.viewportHeight,
    );
  }
}
