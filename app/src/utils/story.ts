/**
 * 스토리 「마지막 픽셀 '도트'」 — 원조 공튀기기(BOUND) 방식으로 재구성.
 *
 * 원작 리서치 반영:
 * - 원작 BOUND는 무설명·적막·즉사·탈출의 미니멀리즘 (스테이지 사이 텍스트 없음,
 *   엔딩은 "osimai(끝)" 한 줄) → 우리도 연출은 비우고, 엔딩은 짧고 건조하게.
 * - 서사는 속편 CRAZY BOUND 2의 "유적에서 무사히 나온 자는 소원 하나를 이룬다"
 *   모티프를 차용 → 우리 버전: "코어에 닿은 픽셀은 소원 하나를 이룬다."
 *
 * 세계관: 수명이 다한 낡은 LCD 게임기. 마지막 픽셀 '도트'에게 전해지는 전설 —
 * 기기 깊은 곳 코어에 닿으면 어떤 소원이든 하나가 이루어진다.
 * 도트의 소원은 단 하나: 꺼져가는 이 게임기가 다시 켜지는 것.
 * 봉쇄 구역들을 사방(상하좌우)으로 탈출하며 코어를 향해 깊이 내려간다.
 * 챕터를 깰 때마다 죽었던 사운드 칩 채널이 복구된다(= 해금 시스템).
 */

export const STORY = {
  titleEn: 'TANGTANGBALL',
  subtitle: 'THE LAST PIXEL',
  tagline: '코어에 닿은 픽셀은 소원을 하나 이룬다',
  taglineSub: '마지막 픽셀의 소원 — 이 게임기가 다시 켜지는 것',
  heroName: '도트',
  goalName: '코어 셀',
  allClearTitle: 'SYSTEM REBOOT',
  allClearBody: '소원은 이루어졌다 — 전원이 돌아왔다',
  /** 원작 BOUND의 "osimai(끝)" 오마주 — 짧고 건조한 마침표 */
  allClearTail: '끝',
  /** 완수 메타 칭호 (V2) — 전 스테이지 PERFECT(부품 전량+노데스) 시 엔딩에 추가.
   *  원작 CRAZY BOUND "you are crazy bound player!" 전통의 오마주 */
  perfectTitle: 'YOU ARE A TRUE PIXEL.',
  partName: '부품',
  shieldName: '백업 셀',
} as const;

export interface ChapterDef {
  id: number;
  from: number;
  to: number;
  name: string;
  en: string;
}

/** 4챕터 — 게임기 내부를 점점 깊이 들어간다. */
export const CHAPTERS: ChapterDef[] = [
  { id: 1, from: 1, to: 5, name: '액정 평원', en: 'LCD FIELD' },
  { id: 2, from: 6, to: 10, name: '기판 회로', en: 'CIRCUIT' },
  { id: 3, from: 11, to: 15, name: '콘덴서 지대', en: 'CAPACITOR' },
  { id: 4, from: 16, to: 20, name: 'CPU 코어', en: 'CPU CORE' },
];

export function getChapter(stageId: number): ChapterDef {
  return CHAPTERS.find((c) => stageId >= c.from && stageId <= c.to) ?? CHAPTERS[0];
}

/**
 * 사운드 칩 채널 해금 — 챕터 보스(5/10/15) 클리어 시 BGM 레이어가 한 겹씩 살아난다.
 * 클리어한 최고 스테이지 → 활성 BGM 레이어 수.
 */
export function getBgmLayers(maxClearedStage: number): number {
  if (maxClearedStage >= 15) return 3;
  if (maxClearedStage >= 10) return 2;
  if (maxClearedStage >= 5) return 1;
  return 0;
}

/** 스테이지 클리어 시 표시할 해금 메시지 (없으면 null). */
export function getUnlockMessage(clearedStage: number): string | null {
  switch (clearedStage) {
    case 5:
      return '사운드 칩 CH1 복구 — 베이스가 깨어났다';
    case 10:
      return '사운드 칩 CH2 복구 — 아르페지오가 깨어났다';
    case 15:
      return '사운드 칩 CH3 복구 — 비트가 깨어났다';
    default:
      return null;
  }
}
