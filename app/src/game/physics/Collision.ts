import {
  FLOOR_THICKNESS,
  SPIKE_HEIGHT,
  CEILING_SPIKE_HEIGHT,
  PERFECT_ZONE_RATIO,
  PERFECT_ZONE_MIN,
  PERFECT_ZONE_MAX,
  NEAR_MISS_DIST,
  PART_PICKUP_RADIUS,
  SHIELD_PICKUP_RADIUS,
} from '../../utils/constants';
import type { StageElement } from '../../utils/types';
import type { Ball } from '../entities/Ball';

export type DeathReason = 'fall' | 'spike' | 'ceiling-spike' | 'explosive';

export interface CollisionResult {
  death?: DeathReason;
  /** 죽음을 유발한 엘리먼트 인덱스 (보호막 처리에 필요. fall이면 undefined) */
  deathIndex?: number;
  landedFloor?: { el: StageElement; index: number; perfect: boolean };
  wallHit?: { side: 'left' | 'right'; x: number };
  collectedParts: number[];
  collectedShields: number[];
  /** 이번 프레임에 아슬아슬하게 스친 가시 인덱스 (근소실패 연출용) */
  nearMissSpikes: number[];
}

/** 퍼펙트 존 폭: 발판 중앙 기준. 넓은 바닥에서도 조준할 가치가 있도록 상한 적용. */
export function perfectZoneWidth(floorWidth: number): number {
  return Math.min(PERFECT_ZONE_MAX, Math.max(PERFECT_ZONE_MIN, floorWidth * PERFECT_ZONE_RATIO));
}

/**
 * 스윕(swept) 충돌 — 이전 프레임 위치(prevX/prevY)와 현재 위치 사이의 "통과"를 검사한다.
 * 후반 스테이지(주기 0.4초)의 낙하 속도는 프레임당 50~150px에 달해, 단순 겹침 검사로는
 * 바닥/가시를 그대로 뚫는 터널링이 발생했다 — 출시 전 필수 수정 사항.
 *
 * Floor: y는 윗면, width는 좌→우. 두께는 상수.
 * Spike: x는 좌, y는 바닥의 윗면(가시 밑변). 위로 SPIKE_HEIGHT.
 * CeilingSpike: x는 좌, y는 위(가시 윗변). 아래로 CEILING_SPIKE_HEIGHT.
 * Part/Shield: x,y는 중심점. 원 거리 판정.
 * Wall: x는 좌, y는 위, width, height.
 */
export function detectCollisions(
  ball: Ball,
  elements: StageElement[],
  stageHeight: number,
  prevX: number,
  prevY: number,
  brokenFloors: Set<number>,
  collectedItems: Set<number>,
): CollisionResult {
  const result: CollisionResult = {
    collectedParts: [],
    collectedShields: [],
    nearMissSpikes: [],
  };

  const r = ball.radius;
  const curX = ball.position.x;
  const curY = ball.position.y;
  const curBottom = curY + r;
  const prevBottom = prevY + r;
  const curTop = curY - r;
  const prevTop = prevY - r;

  if (curTop > stageHeight + 200) {
    result.death = 'fall';
    return result;
  }

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];

    if (el.type === 'floor') {
      // 부서진 바닥은 충돌하지 않음 (기존 버그: 보이지 않는 바닥에서 계속 튕겼음)
      if (brokenFloors.has(i)) continue;
      const fw = el.width ?? 0;
      const floorTop = el.y;
      const overlapX = curX + r > el.x && curX - r < el.x + fw;
      // 스윕: 이전 프레임에는 윗면 위에 있었고, 이번 프레임에 윗면을 넘어 내려갔다
      const sweptDown = ball.velocity.y >= 0 && prevBottom <= floorTop + 1 && curBottom >= floorTop;
      // 보조: 윗면 바로 아래 얕은 구간에서의 겹침 (저속·접지 유지용)
      const shallow =
        ball.velocity.y >= 0 && curBottom >= floorTop && curBottom <= floorTop + FLOOR_THICKNESS + 8;
      if (overlapX && (sweptDown || shallow)) {
        if (el.variant === 'explosive') {
          result.death = 'explosive';
          result.deathIndex = i;
          return result;
        }
        const zone = perfectZoneWidth(fw);
        const centerX = el.x + fw / 2;
        const perfect = Math.abs(curX - centerX) <= zone / 2;
        ball.bounceOnFloor(floorTop);
        result.landedFloor = { el, index: i, perfect };
      }
    } else if (el.type === 'spike') {
      const sw = el.width ?? 0;
      const top = el.y - SPIKE_HEIGHT;
      const bottom = el.y;
      const overlapX = curX + r * 0.7 > el.x && curX - r * 0.7 < el.x + sw;
      const sweptIntoBand = prevBottom <= top && curBottom >= top; // 위에서 낙하 통과
      const insideBand = curBottom >= top && curBottom <= bottom + 6; // 수평 진입
      if (overlapX && (sweptIntoBand || insideBand)) {
        result.death = 'spike';
        result.deathIndex = i;
        return result;
      }
      // 근소실패: 죽지 않고 가시 위/옆 24px 이내를 스쳐 지나감
      const nearX =
        curX + r > el.x - NEAR_MISS_DIST && curX - r < el.x + sw + NEAR_MISS_DIST;
      const nearY = curBottom >= top - NEAR_MISS_DIST && curTop <= bottom;
      if (nearX && nearY) {
        result.nearMissSpikes.push(i);
      }
    } else if (el.type === 'ceiling_spike') {
      const sw = el.width ?? 0;
      const top = el.y;
      const bottom = el.y + CEILING_SPIKE_HEIGHT;
      const overlapX = curX + r * 0.7 > el.x && curX - r * 0.7 < el.x + sw;
      const sweptUp = prevTop >= bottom && curTop <= bottom; // 아래에서 상승 통과
      const insideBand = curTop <= bottom && curTop >= top - 6;
      if (overlapX && (sweptUp || insideBand)) {
        result.death = 'ceiling-spike';
        result.deathIndex = i;
        return result;
      }
    } else if (el.type === 'part') {
      if (collectedItems.has(i)) continue;
      const dx = curX - el.x;
      const dy = curY - el.y;
      if (dx * dx + dy * dy <= PART_PICKUP_RADIUS * PART_PICKUP_RADIUS) {
        result.collectedParts.push(i);
      }
    } else if (el.type === 'shield') {
      if (collectedItems.has(i)) continue;
      const dx = curX - el.x;
      const dy = curY - el.y;
      if (dx * dx + dy * dy <= SHIELD_PICKUP_RADIUS * SHIELD_PICKUP_RADIUS) {
        result.collectedShields.push(i);
      }
    } else if (el.type === 'wall') {
      const wx = el.x;
      const wy = el.y;
      const ww = el.width ?? 6;
      const wh = el.height ?? 0;
      if (
        curY + r > wy &&
        curY - r < wy + wh &&
        curX + r > wx &&
        curX - r < wx + ww
      ) {
        const fromLeft = prevX < wx + ww / 2;
        result.wallHit = { side: fromLeft ? 'right' : 'left', x: fromLeft ? wx : wx + ww };
      }
    }
  }

  return result;
}

export function reachedGoal(ball: Ball, goalX: number): boolean {
  return ball.position.x >= goalX;
}
