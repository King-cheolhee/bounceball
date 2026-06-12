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
 * 점프 높이 300px 고정 → 바닥(600) 기준 점프 정점에서 공 상단 y≈268.
 * 가시 끝(y+24)=272로 두면 정점 부근에서만 닿음 — 회피법은 "수평 타이밍 통과".
 * (기존 y=60은 물리적으로 도달 불가능한 장식이었음 — 기획 모순 해소)
 */
export const CEILING_SPIKE_Y = 248;

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
/** 수집 아이템 */
export const PART_PICKUP_RADIUS = 30;
export const SHIELD_PICKUP_RADIUS = 32;
/** 백업 셀(보호막) 피격 후 무적 시간 */
export const SHIELD_INVULN_MS = 900;
