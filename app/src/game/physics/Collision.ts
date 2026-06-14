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
  BOMB_TRIGGER_RADIUS,
  MOVING_SPIKE_HEIGHT,
  MOVING_SPIKE_HITBOX,
} from '../../utils/constants';
import type { StageElement } from '../../utils/types';
import type { Ball } from '../entities/Ball';
import { blinkSolid, blinkStateOf, movingSpikeOffset } from './blink';

/** 'wave'(셧다운 웨이브)·'monster'(추격 몬스터)는 충돌이 아닌 GameEngine이 직접 판정 */
export type DeathReason = 'fall' | 'spike' | 'ceiling-spike' | 'explosive' | 'wave' | 'monster';

export interface CollisionResult {
  death?: DeathReason;
  /** 죽음을 유발한 엘리먼트 인덱스 (보호막 처리에 필요. fall이면 undefined) */
  deathIndex?: number;
  landedFloor?: { el: StageElement; index: number; perfect: boolean };
  /** 발사 패드 착지 — 엔진이 launch()로 수평 발사 처리 */
  landedLauncher?: { el: StageElement; index: number };
  wallHit?: { side: 'left' | 'right'; x: number };
  collectedParts: number[];
  collectedShields: number[];
  /** 이번 프레임에 공이 점화 반경에 들어온 폭탄 인덱스 (이미 점화/폭발된 것 포함 — 엔진이 거름) */
  touchedBombs: number[];
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
 * Floor: y는 윗면, width는 좌→우. 두께는 상수. (blink면 소멸 반주기엔 통과)
 * Spike: x는 좌, y는 바닥의 윗면(가시 밑변). 위로 SPIKE_HEIGHT. (fake면 무해)
 * CeilingSpike: x는 좌, y는 위(가시 윗변). 아래로 CEILING_SPIKE_HEIGHT.
 * Part/Shield/Bomb: x,y는 중심점. 원 거리 판정.
 * Wall/CrackedWall: x는 좌, y는 위, width, height. (cracked는 폭탄으로 파괴되면 통과)
 * Launcher: floor처럼 착지 — 엔진이 수평 발사 처리.
 * MovingSpike: y + 왕복 오프셋(stageMs 결정적) 위치의 살상 블록, 후한 히트박스.
 *
 * stageMs/bouncePeriodSec — 점멸·이동 가시의 결정적 상태 계산용 (스테이지 시작 기준 게임 시계).
 */
export function detectCollisions(
  ball: Ball,
  elements: StageElement[],
  stageHeight: number,
  stageWidth: number,
  prevX: number,
  prevY: number,
  brokenFloors: Set<number>,
  collectedItems: Set<number>,
  stageMs: number,
  bouncePeriodSec: number,
): CollisionResult {
  const result: CollisionResult = {
    collectedParts: [],
    collectedShields: [],
    touchedBombs: [],
    nearMissSpikes: [],
  };

  const r = ball.radius;
  const curX = ball.position.x;
  const curY = ball.position.y;
  const curBottom = curY + r;
  const prevBottom = prevY + r;
  const curTop = curY - r;
  const prevTop = prevY - r;
  // 속도 스냅샷 — 루프 중 bounceOnFloor가 velocity를 바꿔 뒤쪽 발판 판정을
  // 오염시키지 않도록 (리뷰 확정 버그: 배열 순서에 따라 폭발/생존이 갈렸음)
  const vy = ball.velocity.y;

  if (curTop > stageHeight + 200) {
    result.death = 'fall';
    return result;
  }

  // 발판은 1패스에서 후보만 모으고, 루프 후 "공 중심의 접점" 기준으로 하나를 고른다.
  // 원이 평면에 닿는 접점은 중심 바로 아래 1점 — AABB 겹침만으로 폭발을 판정하면
  // 안전 발판 중앙에 착지해도 16px 옆 폭발 발판에 죽는 비대칭이 생긴다.
  let bestFloor: { el: StageElement; index: number; overlap: number; centerOn: boolean } | null = null;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];

    if (el.type === 'floor' || el.type === 'launcher') {
      // 부서진 바닥은 충돌하지 않음 (기존 버그: 보이지 않는 바닥에서 계속 튕겼음)
      if (brokenFloors.has(i)) continue;
      // 점멸 발판: 소멸 반주기에는 통과
      if (el.blinkPeriodMult && !blinkSolid(blinkStateOf(el, stageMs, bouncePeriodSec))) continue;
      const fw = el.width ?? 0;
      const floorTop = el.y;
      const overlapX = curX + r > el.x && curX - r < el.x + fw;
      // 스윕: 이전 프레임에는 윗면 위에 있었고, 이번 프레임에 윗면을 넘어 내려갔다
      const sweptDown = vy >= 0 && prevBottom <= floorTop + 1 && curBottom >= floorTop;
      // 보조: 윗면 바로 아래 얕은 구간에서의 겹침 (저속·접지 유지용)
      const shallow = vy >= 0 && curBottom >= floorTop && curBottom <= floorTop + FLOOR_THICKNESS + 8;
      if (overlapX && (sweptDown || shallow)) {
        const centerOn = curX >= el.x && curX <= el.x + fw;
        const overlap = Math.min(curX + r, el.x + fw) - Math.max(curX - r, el.x);
        // 우선순위: ① 윗면이 더 높은(y 작은) 발판 — 낙하 스윕에서 먼저 닿는 쪽이
        // 물리적으로 옳다 (리뷰 확정: 높이 다른 발판 겹침에서 아래쪽이 이기던 버그)
        // ② 공 중심이 올라간 발판 ③ 겹침 폭
        if (
          !bestFloor ||
          el.y < bestFloor.el.y ||
          (el.y === bestFloor.el.y &&
            ((centerOn && !bestFloor.centerOn) ||
              (centerOn === bestFloor.centerOn && overlap > bestFloor.overlap)))
        ) {
          bestFloor = { el, index: i, overlap, centerOn };
        }
      }
    } else if (el.type === 'spike') {
      // 가짜 가시(CB2 가짜 폭탄 문법): 무해 — 죽음도 근소실패도 없음
      if (el.fake) continue;
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
    } else if (el.type === 'wall' || el.type === 'cracked_wall') {
      // 금 간 벽: 폭탄으로 파괴되면(brokenFloors 재사용) 통과
      if (el.type === 'cracked_wall' && brokenFloors.has(i)) continue;
      // 점멸 벽: 소멸 반주기에는 통과 (벽 반동 타이밍 퍼즐 — S20)
      if (el.blinkPeriodMult && !blinkSolid(blinkStateOf(el, stageMs, bouncePeriodSec))) continue;
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
        // 점멸 벽이 공 몸통 위치에서 실체화된 경우(이전 스텝에도 이미 겹쳐 있었음):
        // 사출하지 않고 분리될 때까지 통과 — 순간이동·경계 진동 방지 (리뷰 확정)
        const prevInside =
          prevX + r > wx && prevX - r < wx + ww && prevY + r > wy && prevY - r < wy + wh;
        if (prevInside && el.blinkPeriodMult) continue;
        let fromLeft = prevX < wx + ww / 2;
        // 월드 경계를 벗어나는 면으로는 사출 금지 — 경계 밀착 벽에서 공이 월드 밖으로
        // 튕겨 120Hz 진동하던 버그 수정 (리뷰 확정, S20 점멸 벽)
        if (!fromLeft && wx + ww + r > stageWidth) fromLeft = true;
        else if (fromLeft && wx - r < 0) fromLeft = false;
        result.wallHit = { side: fromLeft ? 'right' : 'left', x: fromLeft ? wx : wx + ww };
      }
    } else if (el.type === 'bomb') {
      // 점화 판정 — 부품과 같은 원 거리. 이미 점화/폭발된 폭탄의 필터링은 엔진 몫
      const dx = curX - el.x;
      const dy = curY - el.y;
      if (dx * dx + dy * dy <= BOMB_TRIGGER_RADIUS * BOMB_TRIGGER_RADIUS) {
        result.touchedBombs.push(i);
      }
    } else if (el.type === 'moving_spike') {
      // 상하 왕복 가시 — 위치는 stageMs에서 결정적으로 계산 (일시정지·재현 안전)
      const sw = el.width ?? 40;
      const offset = movingSpikeOffset(el, stageMs, bouncePeriodSec);
      const top = el.y + offset;
      const bottom = top + MOVING_SPIKE_HEIGHT;
      // 후한 히트박스(시각 크기의 75%) — 조사된 공정성 원칙
      const mx = (sw * (1 - MOVING_SPIKE_HITBOX)) / 2;
      const my = (MOVING_SPIKE_HEIGHT * (1 - MOVING_SPIKE_HITBOX)) / 2;
      if (
        curX + r * MOVING_SPIKE_HITBOX > el.x + mx &&
        curX - r * MOVING_SPIKE_HITBOX < el.x + sw - mx &&
        curBottom > top + my &&
        curTop < bottom - my
      ) {
        result.death = 'spike';
        result.deathIndex = i;
        return result;
      }
    }
  }

  // 2패스: 선택된 단일 발판으로 폭발/발사/바운스 확정 (가시 사망이 이미 결정됐으면 생략)
  if (!result.death && bestFloor) {
    const { el, index } = bestFloor;
    if (el.type === 'launcher') {
      // 발사 패드 — 바운스 위치만 잡고 수평 발사는 엔진이 launch()로 처리
      ball.bounceOnFloor(el.y);
      result.landedLauncher = { el, index };
    } else if (el.variant === 'explosive') {
      result.death = 'explosive';
      result.deathIndex = index;
    } else {
      const fw = el.width ?? 0;
      const zone = perfectZoneWidth(fw);
      const centerX = el.x + fw / 2;
      const perfect = Math.abs(curX - centerX) <= zone / 2;
      ball.bounceOnFloor(el.y);
      result.landedFloor = { el, index, perfect };
    }
  }

  return result;
}

/** 탈출구 도달 — 공 중심이 탈출 영역 안에 들어오면 클리어 (상하좌우 모든 방향 지원) */
export function reachedGoal(
  ball: Ball,
  exit: { x: number; y: number; width: number; height: number },
): boolean {
  const { x, y } = ball.position;
  return x >= exit.x && x <= exit.x + exit.width && y >= exit.y && y <= exit.y + exit.height;
}
