export type ElementType =
  | 'floor'
  | 'spike'
  | 'ceiling_spike'
  | 'wall'
  | 'part'
  | 'shield'
  // ===== V2 기믹 (상위 5개 게임 조사 기반 — PLAN_V2_기믹확장.md) =====
  | 'bomb' // 과충전 콘덴서 — 닿으면 점화→폭발: 금간 벽 파괴 + 공 넉백(버티기)
  | 'cracked_wall' // 금 간 벽 — 폭탄으로만 부술 수 있는 벽 (부서지기 전엔 wall과 동일)
  | 'launcher' // 발사 패드 — 밟으면 화살표 방향 수평 발사, 반대키로 꺾어 멈추기
  | 'moving_spike'; // 이동 가시 — 상하 왕복 (주기는 바운스 주기의 정수배로 동기화)

export type FloorVariant =
  | 'normal'
  | 'fragile'
  | 'explosive'
  // 2회 밟으면 깨지는 벽돌 — 1회째 균열(시각화 필수: 잔여 내구도 모호 = 조사된 불만 1순위)
  | 'brick';

export interface StageElement {
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  variant?: FloorVariant;
  /** launcher: 발사 방향 (1=오른쪽, -1=왼쪽) */
  dir?: 1 | -1;
  /** 점멸(blink) — floor/wall에 설정하면 [실체 ↔ 소멸]을 주기적으로 반복.
   *  반주기 = 바운스 주기 × 이 배수 (스테이지 박자와 정수비 동기화 — 리듬 게이트) */
  blinkPeriodMult?: number;
  /** 점멸 위상 오프셋 (0~1) — 여러 발판을 엇박으로 배치할 때 */
  blinkPhase?: number;
  /** moving_spike: 왕복 진폭(px) — y에서 y+range까지 내려갔다 돌아온다 */
  range?: number;
  /** moving_spike: 왕복 주기 = 바운스 주기 × 이 배수 (기본 4) */
  periodMult?: number;
  /** spike: 가짜 가시 — 닿아도 무해. 진짜는 미세 점멸, 가짜는 완전 정지(CB2 가짜 폭탄 문법) */
  fake?: boolean;
}

export interface StageData {
  id: number;
  name: string;
  bouncePeriod: number;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  /** 탈출구 — 공 중심이 이 영역에 들어가면 클리어. 상하좌우 어느 방향이든 배치 가능 */
  exit: { x: number; y: number; width: number; height: number };
  /** 인트로에 표시할 한 줄 힌트 (새 조작을 가르치는 스테이지만) */
  hint?: string;
  isCheckpointEnd?: boolean;
  /** 추격전 「셧다운 웨이브」 — 왼쪽에서 소멸 벽이 등속 추격. 닿으면 즉사(보호막 무효).
   *  delayMs: 인트로 종료 후 출발 유예 (공정성: 스폰 3초 무입력 생존 보장) */
  chase?: { speed: number; delayMs: number };
  /** 추격 몬스터 (V3/V4, S19/S20) — 출현 후 공을 추격. 닿으면 즉사(보호막 무효).
   *  ★ V4: '직진 호밍'이 아니라 '공의 이동 이력(경로)을 시간차로 따라가는' 추적.
   *    → 지그재그 상승에서 몬스터도 같은 경로를 돌아오느라 뒤처져 공정. 멈추면 잡힌다.
   *  speed: 경로 추적 속도(px/s), delayMs: 인트로 종료 후 출현 유예,
   *  spawn: 출현 위치(공보다 왼쪽/뒤), radius: 살상 반경(공 반경과 합산, 기본 26),
   *  count: 몬스터 수(기본 1, S20=2), lagMs: 기본 추적 시간차(공의 lagMs 전 위치를 목표),
   *  lagGapMs: 마리당 추가 시간차(여러 마리가 경로 위에 줄지어 늘어서게),
   *  slowAboveY: 이 y보다 위(상승 구간)에선 속도 slowFactor배로(상승 중 완화, S20). */
  chaser?: {
    speed: number; delayMs: number; spawn: { x: number; y: number };
    radius?: number; count?: number; lagMs?: number; lagGapMs?: number;
    slowAboveY?: number; slowFactor?: number;
  };
  elements: StageElement[];
}

export interface StagesFile {
  version: number;
  totalStages: number;
  checkpoints: number[];
  stages: StageData[];
}

export type GameInput = {
  left: boolean;
  right: boolean;
};

export type GameStatus =
  | 'idle'
  | 'playing'
  | 'paused'
  | 'died'
  | 'stage-clear'
  | 'game-over';
