import {
  BALL_RADIUS,
  FLOOR_THICKNESS,
  SPIKE_HEIGHT,
  SPIKE_WIDTH,
  CEILING_SPIKE_HEIGHT,
} from '../../utils/constants';
import type { StageData, StageElement } from '../../utils/types';
import type { Ball } from '../entities/Ball';
import type { Camera } from '../camera/Camera';

const FG = '#ffffff';
const BG = '#000000';

export interface RenderState {
  ball: Ball;
  stage: StageData;
  camera: Camera;
  brokenFloors: Set<number>;
  flashAmount: number; // 0~1, 사망 등 화면 깜빡임
  goalReached: boolean;
  timeMs: number;
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

    // 월드 좌표계로 이동 (가운데 정렬: 스테이지가 짧으면 캔버스 가운데에)
    ctx.save();
    const scale = viewportHeight / state.stage.height;
    ctx.scale(scale, scale);
    ctx.translate(-state.camera.x, -state.camera.y);

    // 배경 점선 가이드 (먼 LCD 느낌)
    this.drawBackgroundDots(state.stage, state.camera, viewportWidth / scale);

    // 골 표시
    this.drawGoal(state.stage);

    // 엘리먼트 렌더링
    for (let i = 0; i < state.stage.elements.length; i++) {
      const el = state.stage.elements[i];
      this.drawElement(el, i, state.brokenFloors, state.timeMs);
    }

    // 공
    this.drawBall(state.ball);

    ctx.restore();

    // 화면 깜빡임(사망)
    if (state.flashAmount > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, state.flashAmount)})`;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);
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

  private drawGoal(stage: StageData) {
    const ctx = this.ctx;
    const x = stage.goal.x;
    ctx.strokeStyle = FG;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(x, 60);
    ctx.lineTo(x, stage.height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = FG;
    ctx.font = '700 22px Inter, Pretendard, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('GOAL', x + 12, 80);
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
      } else if (variant === 'fragile') {
        ctx.strokeStyle = FG;
        ctx.lineWidth = FLOOR_THICKNESS;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(el.x, el.y + FLOOR_THICKNESS / 2);
        ctx.lineTo(el.x + w, el.y + FLOOR_THICKNESS / 2);
        ctx.stroke();
        ctx.setLineDash([]);
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
    } else if (el.type === 'wall') {
      ctx.fillStyle = FG;
      ctx.fillRect(el.x, el.y, el.width ?? 6, el.height ?? 0);
    }
  }

  private drawBall(ball: Ball) {
    const ctx = this.ctx;
    ctx.fillStyle = FG;
    ctx.beginPath();
    ctx.arc(ball.position.x, ball.position.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    // inner dot (LCD pixel feel)
    ctx.fillStyle = BG;
    ctx.beginPath();
    ctx.arc(ball.position.x - 4, ball.position.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
