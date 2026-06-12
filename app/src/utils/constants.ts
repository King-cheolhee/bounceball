export const TOTAL_STAGES = 20;
export const CHECKPOINTS = [1, 6, 11, 16];
export const INITIAL_LIVES = 3;

export const VIEWPORT_HEIGHT = 720;
export const BALL_RADIUS = 16;

export const FLOOR_THICKNESS = 6;
export const SPIKE_HEIGHT = 24;
export const SPIKE_WIDTH = 40;
export const CEILING_SPIKE_HEIGHT = 24;
/**
 * 천장 가시 기본 y (가시는 y에서 아래로 CEILING_SPIKE_HEIGHT만큼 뻗음).
 * 점프 높이 300px → 바닥(600) 기준 정점에서 공 상단 y≈268 (해석값).
 * 고정 타임스텝(1/120s) 이산 적분의 정점 미달분은 스테이지가 깊을수록 커져
 * 실측 공 상단 최고점이 276.4(S14)~280.5(S20)이다. 최악 케이스를 덮도록
 * 가시 끝(y+24)=284로 둔다 → 모든 배치 스테이지에서 정점 부근만 살상.
 * 회피법은 "수평 타이밍 통과". (y=60·248·254는 전부 도달 불가 장식이었음 —
 * 1/120 스텝 실측 시뮬레이션으로 260 확정)
 */
export const CEILING_SPIKE_Y = 260;
/** 물리 고정 타임스텝(초) — 점프 높이가 기기 프레임레이트와 무관하게 일정해진다 */
export const PHYSICS_STEP = 1 / 120;

export const TARGET_JUMP_HEIGHT = 300;
export const BASE_MAX_HORIZONTAL_SPEED = 320;
export const HORIZONTAL_ACCELERATION = 1400;
export const HORIZONTAL_FRICTION = 0.88;
export const WALL_BOUNCE_DAMPING = 0.6;

export const CAMERA_FOLLOW_X_OFFSET = 0.35;
export const CAMERA_FOLLOW_LERP = 0.12;

export const STAGE_INTRO_COOLDOWN_MS = 700;
export const STAGE_CLEAR_OVERLAY_MS = 900;
export const DEATH_FREEZE_MS = 450;

export const INTERSTITIAL_AD_STAGES = [10, 15];

// ===== 게임 주스 / 콤보 / 수집 (중독성 장치) =====
/** 퍼펙트 존: 발판 중앙의 착지 목표 영역. 폭 = clamp(발판폭 × RATIO, MIN, MAX) */
export const PERFECT_ZONE_RATIO = 0.2;
export const PERFECT_ZONE_MIN = 28;
export const PERFECT_ZONE_MAX = 90;
/** 이 콤보 이상이면 '오버클럭' — 부품 획득 2배 + 화면 테두리 연출 */
export const COMBO_OVERCLOCK = 5;
/** 가시 근소실패(아슬아슬 회피) 판정 거리(px)와 히트스톱 시간 */
export const NEAR_MISS_DIST = 24;
export const NEAR_MISS_HITSTOP_MS = 50;
/** 수집 아이템 — 하이퍼캐주얼 표준대로 관대한 판정 (실플레이 검증 후 30→42 확대) */
export const PART_PICKUP_RADIUS = 42;
export const SHIELD_PICKUP_RADIUS = 44;
/** 백업 셀(보호막) 피격 후 무적 시간 */
export const SHIELD_INVULN_MS = 900;
