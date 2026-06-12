import { Ball } from '../entities/Ball';
import { Camera } from '../camera/Camera';
import { detectCollisions, reachedGoal } from '../physics/Collision';
import { InputHandler } from './InputHandler';
import { Renderer } from './Renderer';
import { getStage } from '../stages/StageLoader';
import type { StageData } from '../../utils/types';
import { DEATH_FREEZE_MS } from '../../utils/constants';
import { sound } from '../../services/sound';
import { haptic } from '../../services/haptic';

export type GamePhase = 'intro' | 'playing' | 'dying' | 'cleared';

export interface GameEvents {
  onDeath: (reason: 'fall' | 'spike' | 'ceiling-spike' | 'explosive') => void;
  onStageClear: (stageId: number) => void;
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
  private flashAmount = 0;
  private phase: GamePhase = 'intro';
  private deathReason: 'fall' | 'spike' | 'ceiling-spike' | 'explosive' | null = null;
  private deathStartTime = 0;
  private timeMs = 0;
  private paused = false;
  private destroyed = false;
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

  resize(width: number, height: number) {
    this.dpr = window.devicePixelRatio || 1;
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.renderer.resize(width, height, this.dpr);
    this.camera.setViewport(width, height);
  }

  loadStage(stageId: number) {
    const stage = getStage(stageId);
    if (!stage) throw new Error(`Stage ${stageId} not found`);
    this.stage = stage;
    this.ball.setStage(stageId);
    this.ball.spawn(stage.spawn.x, stage.spawn.y);
    this.camera.setWorld(stage.width, stage.height);
    this.camera.snapTo(stage.spawn.x);
    this.brokenFloors.clear();
    this.flashAmount = 0;
    this.phase = 'intro';
    this.deathReason = null;
    this.input.clear();
    setTimeout(() => {
      if (this.phase === 'intro' && !this.destroyed) {
        this.phase = 'playing';
      }
    }, 300);
  }

  start() {
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    const loop = (time: number) => {
      if (this.destroyed) return;
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;
      this.timeMs = time;
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
      this.camera.follow(this.ball.position.x);
      return;
    }

    if (this.phase !== 'playing') {
      this.camera.follow(this.ball.position.x);
      return;
    }

    const input = this.input.getInput();
    this.ball.update(dt, input);

    // 벽 - 스테이지 좌우 경계
    if (this.ball.position.x - this.ball.radius < 0) {
      this.ball.bounceOnWall('left', 0);
      sound.play('wall');
    }
    if (this.ball.position.x + this.ball.radius > this.stage.width) {
      this.ball.bounceOnWall('right', this.stage.width);
      sound.play('wall');
    }

    // 충돌 처리
    const collision = detectCollisions(this.ball, this.stage.elements, this.stage.height);

    if (collision.death) {
      this.triggerDeath(collision.death);
      return;
    }

    if (collision.wallHit) {
      this.ball.bounceOnWall(collision.wallHit.side, collision.wallHit.x);
      sound.play('wall');
    }

    if (collision.landedFloor) {
      const idx = this.stage.elements.indexOf(collision.landedFloor);
      const variant = collision.landedFloor.variant ?? 'normal';
      if (variant === 'normal') {
        sound.play('bounce');
        haptic('soft');
      } else if (variant === 'fragile') {
        if (!this.brokenFloors.has(idx)) {
          this.brokenFloors.add(idx);
          sound.play('fragile');
          haptic('medium');
        } else {
          sound.play('bounce');
        }
      }
    }

    // 골 체크
    if (reachedGoal(this.ball, this.stage.goal.x)) {
      this.phase = 'cleared';
      sound.play('clear');
      haptic('success');
      this.events.onStageClear(this.stage.id);
    }

    this.camera.follow(this.ball.position.x);
  }

  private triggerDeath(reason: 'fall' | 'spike' | 'ceiling-spike' | 'explosive') {
    this.phase = 'dying';
    this.deathReason = reason;
    this.deathStartTime = this.timeMs;
    this.flashAmount = 1.0;
    if (reason === 'spike' || reason === 'ceiling-spike') {
      sound.play('spike');
    } else if (reason === 'explosive') {
      sound.play('explosive');
    } else {
      sound.play('gameover');
    }
    haptic('error');
    this.input.clear();
  }

  private render() {
    if (!this.stage) return;
    this.renderer.render(
      {
        ball: this.ball,
        stage: this.stage,
        camera: this.camera,
        brokenFloors: this.brokenFloors,
        flashAmount: this.flashAmount,
        goalReached: this.phase === 'cleared',
        timeMs: this.timeMs,
      },
      this.viewportWidth,
      this.viewportHeight,
    );
  }
}
