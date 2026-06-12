import { FLOOR_THICKNESS, SPIKE_HEIGHT, CEILING_SPIKE_HEIGHT } from '../../utils/constants';
import type { StageElement } from '../../utils/types';
import type { Ball } from '../entities/Ball';

export interface CollisionResult {
  death?: 'fall' | 'spike' | 'ceiling-spike' | 'explosive';
  landedFloor?: StageElement;
  wallHit?: { side: 'left' | 'right'; x: number };
}

/**
 * 단순 AABB + 원 충돌. 게임이 작아서 충분.
 * Floor: y는 윗면, width는 좌→우. 두께는 상수.
 * Spike: x는 좌, y는 바닥의 윗면(가시 끝). width.
 * CeilingSpike: x는 좌, y는 위 (가시의 윗면 = 천장). width.
 * Wall: x는 좌, y는 위, width, height.
 */
export function detectCollisions(ball: Ball, elements: StageElement[], stageHeight: number): CollisionResult {
  const result: CollisionResult = {};

  if (ball.position.y - ball.radius > stageHeight + 200) {
    result.death = 'fall';
    return result;
  }

  for (const el of elements) {
    if (el.type === 'floor') {
      const fx = el.x;
      const fy = el.y;
      const fw = el.width ?? 0;
      const floorTop = fy;
      const floorBottom = fy + FLOOR_THICKNESS;

      if (
        ball.velocity.y >= 0 &&
        ball.position.x + ball.radius > fx &&
        ball.position.x - ball.radius < fx + fw &&
        ball.position.y + ball.radius >= floorTop &&
        ball.position.y + ball.radius <= floorBottom + 24
      ) {
        if (el.variant === 'explosive') {
          result.death = 'explosive';
          return result;
        }
        ball.bounceOnFloor(floorTop);
        result.landedFloor = el;
      }
    } else if (el.type === 'spike') {
      const sw = el.width ?? 0;
      const top = el.y - SPIKE_HEIGHT;
      const bottom = el.y;
      if (
        ball.position.x + ball.radius * 0.7 > el.x &&
        ball.position.x - ball.radius * 0.7 < el.x + sw &&
        ball.position.y + ball.radius >= top &&
        ball.position.y + ball.radius <= bottom + 6
      ) {
        result.death = 'spike';
        return result;
      }
    } else if (el.type === 'ceiling_spike') {
      const sw = el.width ?? 0;
      const top = el.y;
      const bottom = el.y + CEILING_SPIKE_HEIGHT;
      if (
        ball.position.x + ball.radius * 0.7 > el.x &&
        ball.position.x - ball.radius * 0.7 < el.x + sw &&
        ball.position.y - ball.radius <= bottom &&
        ball.position.y - ball.radius >= top - 6
      ) {
        result.death = 'ceiling-spike';
        return result;
      }
    } else if (el.type === 'wall') {
      const wx = el.x;
      const wy = el.y;
      const ww = el.width ?? 6;
      const wh = el.height ?? 0;
      if (
        ball.position.y + ball.radius > wy &&
        ball.position.y - ball.radius < wy + wh &&
        ball.position.x + ball.radius > wx &&
        ball.position.x - ball.radius < wx + ww
      ) {
        const fromLeft = ball.position.x < wx + ww / 2;
        result.wallHit = { side: fromLeft ? 'right' : 'left', x: fromLeft ? wx : wx + ww };
      }
    }
  }

  return result;
}

export function reachedGoal(ball: Ball, goalX: number): boolean {
  return ball.position.x >= goalX;
}
