import { BLINK_WARN_MS } from '../../utils/constants';
import type { StageElement } from '../../utils/types';

/**
 * 점멸(blink) 요소의 상태 머신 — 충돌(Collision)과 렌더(Renderer)가 같은 함수를 쓴다.
 *
 * 사이클 = [실체 반주기][소멸 반주기], 반주기 = 바운스 주기 × blinkPeriodMult.
 * 공정성(조사 결론: 전조 없는 점멸은 최혐오 기믹):
 * - 'warn'   — 실체지만 곧 사라짐: 빠른 점멸로 경고 (충돌 O)
 * - 'preview' — 소멸 중이지만 곧 나타남: 점선 윤곽 예고 (충돌 X)
 */
export type BlinkState = 'on' | 'warn' | 'off' | 'preview';

export function blinkStateOf(
  el: StageElement,
  stageMs: number,
  bouncePeriodSec: number,
): BlinkState {
  const mult = el.blinkPeriodMult;
  if (!mult) return 'on';
  const half = bouncePeriodSec * 1000 * mult;
  const total = half * 2;
  const warn = Math.min(BLINK_WARN_MS, half * 0.3);
  const t = (((stageMs + (el.blinkPhase ?? 0) * total) % total) + total) % total;
  if (t < half) {
    return t > half - warn ? 'warn' : 'on';
  }
  return t > total - warn ? 'preview' : 'off';
}

/** 이 순간 충돌(착지·벽 반동)이 가능한가 */
export function blinkSolid(state: BlinkState): boolean {
  return state === 'on' || state === 'warn';
}

/**
 * 이동 가시의 현재 y 오프셋 (0 → range → 0 코사인 왕복, 결정적).
 * 주기 = 바운스 주기 × periodMult(기본 4) — 스테이지 박자와 정수비 동기화되어
 * "첫 박자만 맞추면 연속 통과"가 성립한다 (Bounce Classic 잭 회랑 공식).
 */
export function movingSpikeOffset(
  el: StageElement,
  stageMs: number,
  bouncePeriodSec: number,
): number {
  const range = el.range ?? 0;
  if (range === 0) return 0;
  const T = bouncePeriodSec * 1000 * (el.periodMult ?? 4);
  // blinkPhase 재사용 — 여러 이동 가시를 엇박으로 배치 (0~1)
  const t = ((((stageMs + (el.blinkPhase ?? 0) * T) % T) + T) % T) / T;
  return (range * (1 - Math.cos(t * Math.PI * 2))) / 2;
}
