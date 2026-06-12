/**
 * 공 스킨 — 부품(◆) 수집으로 해금하는 순수 외형 변화.
 * 흑백 2색 원칙 내에서만 표현(모양·잔상·점멸). 능력치 영향 절대 금지.
 */
export type SkinId = 'dot' | 'block' | 'cursor' | 'glitch';

export interface SkinDef {
  id: SkinId;
  name: string;
  desc: string;
  cost: number; // 부품(◆) 비용. 0 = 기본 보유
}

// 가격 합계 140 — 전 스테이지 부품 약 112개 + 약간의 재도전으로 전부 해금 가능한 균형
// (기존 합계 170은 1회차 완주로 불가능 — 리뷰 경제 실측 반영)
export const SKINS: SkinDef[] = [
  { id: 'dot', name: '도트', desc: '마지막 픽셀의 처음 모습', cost: 0 },
  { id: 'block', name: '픽셀 블록', desc: '사각 픽셀 — 굵직한 잔상을 남긴다', cost: 20 },
  { id: 'cursor', name: '커서', desc: '십자 커서 — 입력 신호의 흔적', cost: 45 },
  { id: 'glitch', name: '글리치', desc: '점멸하는 잔상 — 화면이 버틸 수 있을까', cost: 75 },
];

export const DEFAULT_SKIN: SkinId = 'dot';

export function getSkin(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function isSkinId(id: string): id is SkinId {
  return SKINS.some((s) => s.id === id);
}
