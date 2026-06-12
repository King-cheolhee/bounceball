export const TOTAL_STAGES = 20;
export const CHECKPOINTS = [1, 6, 11, 16];
export const INITIAL_LIVES = 3;

export const VIEWPORT_HEIGHT = 720;
/** 화면에 보이는 월드 높이(고정). 스테이지 height가 이보다 크면 세로 스크롤 */
export const DESIGN_HEIGHT = 720;
export const BALL_RADIUS = 16;

export const FLOOR_THICKNESS = 6;
export const SPIKE_HEIGHT = 24;
export const SPIKE_WIDTH = 40;
export const CEILING_SPIKE_HEIGHT = 24;
/**
 * 천장 가시 기본 y (가시는 y에서 아래로 CEILING_SPIKE_HEIGHT만큼 뻗음).
 * 점프 높이 240px → 바닥(600) 기준 정점에서 공 상단 y≈328 (해석값) +
 * 1/120 스텝 이산 적분 미달분(스테이지별 4~10px)을 실측해 최악 케이스를
 * 덮도록 둔다. 회피법은 "수평 타이밍 통과". 시뮬레이션 검증 후 확정 값.
 */
export const CEILING_SPIKE_Y = 318;
/** 물리 고정 타임스텝(초) — 점프 높이가 기기 프레임레이트와 무관하게 일정해진다 */
export const PHYSICS_STEP = 1 / 120;

/** 점프 높이 — 300은 너무 높아 쉬웠음(사용자 플레이 피드백) → 240으로 하향.
 *  체공시간은 바운스 주기로 고정되므로 수평 도달 거리는 변하지 않는다. */
export const TARGET_JUMP_HEIGHT = 240;
/** 시작 템포 +10% 요청 반영: 320 → 352 */
export const BASE_MAX_HORIZONTAL_SPEED = 352;
export const HORIZONTAL_ACCELERATION = 1500;
export const HORIZONTAL_FRICTION = 0.88;
export const WALL_BOUNCE_DAMPING = 0.6;

// ===== 벽 반동 점프 (원조 공튀기기의 핵심 조작감) =====
/** 벽 충돌 후 이 시간 안에 반대 방향을 누르면 벽을 밟고 도약 */
export const WALL_KICK_WINDOW_MS = 150;
/** 벽 반동 수평 속도 = 최고속도 × 배수 (일반 이동보다 멀리 날아간다) */
export const WALL_KICK_SPEED_MULT = 1.35;
/** 초과 속도(벽 반동)가 최고속도로 잦아드는 감쇠율 (1/120s 스텝 기준).
 *  0.997 → 약 0.8초에 걸쳐 잦아듦: 체공 한 번 동안 대부분 유지 (리뷰 후 0.985에서 상향) */
export const OVERSPEED_DECAY = 0.997;
/** 진행 방향과 반대 입력 시 제동 배수 — 벽 반동 후 빠른 방향 전환(벽타기의 손맛) */
export const BRAKE_MULTIPLIER = 2;
/** 이 속도 이상으로 벽에 부딪혀야 '충돌'로 인정 (효과음·반동 창 발동).
 *  벽에 밀착해 누르고 있을 때 매 스텝 연타되는 것 방지 */
export const WALL_HIT_MIN_SPEED = 30;

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
