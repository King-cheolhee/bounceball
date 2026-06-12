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

// ===== 카메라 (멀미 방지 — 데드존/카메라 윈도우 방식, V2에서 추적식에서 교체) =====
/** 공이 화면 중앙 기준 이 비율 안에 있으면 카메라 정지. 벗어난 만큼만 따라간다.
 *  세로 ±34% = ±245px 밴드 — 점프 호 240px보다 넓어서, 스폰 시점(snapTo)이 호의
 *  어느 지점이든 평지 바운스 중에는 카메라가 위아래로 전혀 움직이지 않는다.
 *  (±30%=216px로는 호가 24px 삐져나와 시작 후 몇 초간 카메라가 위로 기어 올라감 — 시뮬레이션으로 확인) */
export const CAMERA_DEADZONE_X = 0.25;
export const CAMERA_DEADZONE_Y = 0.34;
/** 데드존 이탈 시 추적 속도 (지수 lerp, 60fps 기준) — 기존 0.12에서 하향.
 *  세로는 더 느리게: 수직 화면 이동이 멀미의 주원인. */
export const CAMERA_LERP_X = 0.1;
export const CAMERA_LERP_Y = 0.07;
/** 하드 가드: 공이 화면 가장자리 이 비율 안쪽으로 들어오면 카메라를 즉시 보정.
 *  자유 낙하(S13)·샤프트 등반처럼 lerp가 못 따라가는 고속 이동에서도 공이 화면 밖으로 안 나감. */
export const CAMERA_HARD_EDGE = 0.08;

export const STAGE_INTRO_COOLDOWN_MS = 700;
export const STAGE_CLEAR_OVERLAY_MS = 900;
export const DEATH_FREEZE_MS = 450;

// ===== V2 기믹 (PLAN_V2_기믹확장.md — 공정성 3원칙: 예고·동일 세기·후한 판정) =====
/** 폭탄 점화 판정 반경 — 공이 이 거리 안에 들어오면 점화 */
export const BOMB_TRIGGER_RADIUS = 36;
/** 점화 → 폭발까지 (점멸 가속으로 예고) */
export const BOMB_FUSE_MS = 1200;
/** 폭발이 금 간 벽을 부수는 반경 (벽 사각형과 폭심의 최근접 거리 기준) */
export const BOMB_BLAST_RADIUS = 170;
/** 폭발 넉백이 공에 적용되는 반경 — 밖에 있으면 안전 */
export const BOMB_KNOCKBACK_RADIUS = 320;
/** 넉백 수평 속도 = 스테이지 최고속 × 배수. 벽 반동(1.35)보다 강해
 *  반대 입력 2배 제동(BRAKE_MULTIPLIER)으로 '버티는' 조작이 필요하다 */
export const BOMB_KNOCKBACK_MULT = 1.9;
/** 발사 패드 수평 속도 = 스테이지 최고속 × 배수. 반대키로 꺾어 멈추기 가능 */
export const LAUNCHER_SPEED_MULT = 1.8;
/** 이동 가시 히트박스 = 시각 크기 × 이 비율 (후한 판정 — 조사된 공정성 원칙) */
export const MOVING_SPIKE_HITBOX = 0.75;
/** 이동 가시 시각 높이(px) */
export const MOVING_SPIKE_HEIGHT = 28;
/** 점멸 요소: 소멸 직전 경고 점멸·재등장 직전 점선 예고 시간(ms) 상한 */
export const BLINK_WARN_MS = 400;

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
