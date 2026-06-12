/**
 * 게임 센터 리더보드 추상화. 1단계: 콘솔 로그.
 * 2단계: `submitGameCenterLeaderBoardScore({ score })`로 교체.
 *
 * 앱인토스 규정: 점수 제출은 게임 시작이 아닌 종료(클리어) 후에만 호출.
 */
export async function submitScore(stageNumber: number): Promise<void> {
  if (import.meta.env.DEV) {
    console.info('[leaderboard:mock] submitScore', stageNumber);
  }
}
