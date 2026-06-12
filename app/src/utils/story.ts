/**
 * 스토리 B안 「마지막 픽셀 '도트'」 — 꺼져가는 게임기 속 여행.
 *
 * 세계관: 수명이 다해가는 낡은 휴대용 LCD 게임기. 화면 세그먼트가 하나둘 꺼지는 중,
 * 마지막으로 살아남은 픽셀 '도트'가 기판 깊숙한 곳의 '코어 셀(전원 심장)'까지
 * 굴러가 기기를 다시 켠다. 스테이지가 진행될수록 CPU 클럭이 오르며(바운스 가속),
 * 챕터를 깰 때마다 죽었던 사운드 칩 채널이 한 개씩 복구된다(= 해금 시스템).
 *
 * 흑백 2색 비주얼은 'LCD 화면 그 자체'라는 세계관으로 정당화된다.
 */

export const STORY = {
  titleEn: 'TANGTANGBALL',
  subtitle: 'THE LAST PIXEL',
  tagline: '꺼져가는 게임기 속, 마지막 픽셀의 여정',
  heroName: '도트',
  goalName: '코어 셀',
  allClearTitle: 'SYSTEM REBOOT',
  allClearBody: '전원 복구 완료 — 마지막 픽셀이 게임기를 다시 켰습니다',
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
