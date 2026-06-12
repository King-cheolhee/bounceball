import type { StagesFile, StageData, StageElement, FloorVariant } from '../../utils/types';
import { getBouncePeriod } from '../entities/Ball';
import { CEILING_SPIKE_Y } from '../../utils/constants';

/**
 * 스테이지 설계 메모 (점프 높이 240px, 벽 반동 점프 기준)
 * - 지면 바닥 y=600. 공 중심: 바닥 위 584, 점프 정점 ≈ 344 (정점에서 공 하단 ≈ 364)
 * - 일반 점프로 넘을 수 없는 벽: 윗변 y ≤ 360 → 공중에서 벽에 닿아 반동 점프 필요
 * - 구덩이(깊이 300, 바닥 900): 안에서 1회 반동 점프로 탈출 가능
 * - 수평 도달(체공 1회 최고속): S1≈316px → S10≈338px → S20≈274px. 구멍은 여유를 두고 더 좁게
 * - 탈출구는 상하좌우 어느 방향이든 배치 가능 (exit 사각 영역)
 * ===== V2 기믹 설계 메모 (PLAN_V2_기믹확장.md) =====
 * - brick(2회 벽돌): 1회째 균열 시각화, 2회째 붕괴. 하강맵(S12)의 주재료
 * - blink(점멸): 반주기 = 바운스 주기 × mult. 실선↔소멸, 경고·예고 상태 내장 (S7~S10, S20)
 * - launcher: 다른 발판과 수평으로 겹치지 말 것. 착지 판정 우선순위(리뷰 후 정정):
 *   ① 윗면이 더 높은 발판 ② 공 중심이 올라간 발판 ③ 겹침 폭이 큰 발판 —
 *   같은 높이에 겹쳐 두면 ②③에 의해 넓은 발판이 발사 패드를 이긴다
 * - bomb + cracked_wall: 점화 후 1.2s 폭발 — 반경 170 벽 파괴, 반경 320 넉백(1.9×최고속).
 *   '폭발을 등지면 길이 된다' — 벽 너머로 발사되는 것이 의도된 숙련 루트
 * - moving_spike: 주기 = 바운스 주기 × 4 (박자 동기화), 경로 점선 표시, 히트박스 75%
 * - chase(S19): 등속 소멸 벽 — 구덩이 금지, 후퇴 불가 지형으로만 구성할 것
 */

const G = 600; // 기본 지면 y

function floorAt(x: number, y: number, w: number, variant: FloorVariant = 'normal'): StageElement {
  return { type: 'floor', x, y, width: w, variant };
}
function floor(x: number, w: number, variant: FloorVariant = 'normal'): StageElement {
  return floorAt(x, G, w, variant);
}
/** 점멸 발판 — 반주기 = 바운스 주기 × mult. phase(0~1)로 엇박 배치 */
function blinkFloorAt(x: number, y: number, w: number, mult = 2, phase = 0): StageElement {
  return { type: 'floor', x, y, width: w, blinkPeriodMult: mult, ...(phase ? { blinkPhase: phase } : {}) };
}
/** 발사 패드 — 밟으면 dir 방향 수평 발사(1.8×최고속), 반대키로 꺾어 멈추기 */
function launcherAt(x: number, y: number, dir: 1 | -1, w = 60): StageElement {
  return { type: 'launcher', x, y, width: w, dir };
}
/** 폭탄(과충전 콘덴서) — x,y는 중심. 닿으면 점화 → 1.2s 후 폭발 */
function bombAt(x: number, y: number): StageElement {
  return { type: 'bomb', x, y };
}
/** 금 간 벽 — 폭탄으로만 파괴. yTop부터 아래로 h */
function crackedWall(x: number, yTop: number, h: number, w = 14): StageElement {
  return { type: 'cracked_wall', x, y: yTop, width: w, height: h };
}
/** 이동 가시 — y에서 y+range까지 코사인 왕복. 주기 = 바운스 주기 × mult */
function movingSpike(x: number, y: number, range: number, mult = 4, phase = 0, w = 40): StageElement {
  return { type: 'moving_spike', x, y, width: w, range, periodMult: mult, ...(phase ? { blinkPhase: phase } : {}) };
}
/** 가짜 가시 — 무해. 진짜는 미세 점멸하지만 가짜는 완전 정지 (관찰 보상) */
function fakeSpike(x: number, w = 40): StageElement {
  return { type: 'spike', x, y: G, width: w, fake: true };
}
/** 가시 — y는 가시가 놓인 바닥의 윗면 */
function spikeAt(x: number, y: number, w = 40): StageElement {
  return { type: 'spike', x, y, width: w };
}
function spike(x: number, w = 40): StageElement {
  return spikeAt(x, G, w);
}
/** 천장 가시. 기본 y=CEILING_SPIKE_Y — 지면 바닥 점프 정점에서만 닿는 높이 */
function ceilingSpike(x: number, w = 60, y = CEILING_SPIKE_Y): StageElement {
  return { type: 'ceiling_spike', x, y, width: w };
}
/** 벽 — yTop부터 아래로 h. 벽 반동 점프의 발판이자 장애물 */
function wallAt(x: number, yTop: number, h: number, w = 10): StageElement {
  return { type: 'wall', x, y: yTop, width: w, height: h };
}
/** 부품(◆) — 수집 재화. 클리어 시에만 적립 */
function part(x: number, y = 450): StageElement {
  return { type: 'part', x, y };
}
/** 백업 셀 — 1회용 보호막 (추락은 못 막음) */
function shieldItem(x: number, y = 440): StageElement {
  return { type: 'shield', x, y };
}
/** 우측 끝 탈출구 (지면 레벨) — 우측 경계에 밀착.
 *  경계와 탈출구 사이에 틈을 두면 공이 그 구석에 끼어 탈출구를 비껴가는
 *  '죽은 구석'이 생긴다 (헤드리스 봇 플레이 검증에서 발견) */
function exitRight(width: number, y = 410) {
  return { x: width - 100, y, width: 100, height: 170 };
}

interface StageOpts {
  isCheckpointEnd?: boolean;
  height?: number;
  spawn?: { x: number; y: number };
  hint?: string;
  /** 추격전 — 왼쪽에서 소멸 벽이 등속 추격 (V2, S19) */
  chase?: { speed: number; delayMs: number };
}

function stage(
  id: number,
  name: string,
  width: number,
  exit: { x: number; y: number; width: number; height: number },
  elements: StageElement[],
  opts: StageOpts = {},
): StageData {
  return {
    id,
    name,
    bouncePeriod: getBouncePeriod(id),
    width,
    height: opts.height ?? 720,
    spawn: opts.spawn ?? { x: 100, y: 420 },
    exit,
    elements,
    ...(opts.hint ? { hint: opts.hint } : {}),
    ...(opts.isCheckpointEnd ? { isCheckpointEnd: true } : {}),
    ...(opts.chase ? { chase: opts.chase } : {}),
  };
}

// 스토리 B안 「마지막 픽셀 도트」 — 게임기 내부의 봉쇄 구역들을 사방으로 탈출한다.

const STAGES: StageData[] = [
  // ============== CHAPTER 1: 액정 평원 (1-5) ==============
  // 가르치기: 이동 → 구멍 → 벽 반동 → 가시 → 종합
  stage(1, '첫 신호', 1500, exitRight(1500), [
    floor(0, 1500),
    part(450), part(750), part(1050),
  ]),

  stage(2, '데드 픽셀', 1800, exitRight(1800), [
    floor(0, 700),
    floor(880, 500),
    floor(1560, 240),
    part(400), part(800, 400), part(1150), part(1470, 400),
  ]),

  // 벽 반동 튜토리얼 — 너비 380 구덩이(점프 불가)에 빠진 뒤,
  // 중앙 기둥과 벽 사이 좁은 틈을 지그재그 반동으로 차고 나온다
  stage(3, '갇힌 회랑', 1900, exitRight(1900), [
    floor(0, 700),
    floorAt(700, 900, 380), // 구덩이 바닥 (깊이 300)
    wallAt(690, G, 300),    // 구덩이 좌벽
    wallAt(880, G, 300),    // 중앙 기둥 — 좁은 등반 틈(180/190)을 만든다
    wallAt(1080, G, 300),   // 구덩이 우벽
    floor(1080, 820),
    // 구덩이 입구 위 보너스 ◆ — 지그재그 탈출 정점에서만 닿는다 (V2: 벽 반동 보상)
    part(885, 500),
    part(400), part(790, 760), part(985, 760), part(1400), part(1700),
  ], { height: 1020, hint: '벽에 닿는 순간, 반대쪽을 눌러라' }),

  stage(4, '정전기 가시', 2000, exitRight(2000), [
    floor(0, 2000),
    spike(700),
    spike(1300),
    // 중앙 벽 — 넘을 수는 있지만(윗변 400) 반동 점프로 가속하면 더 빠르다
    wallAt(1000, 400, 200),
    // 벽 위 보너스 ◆ — 벽 반동 점프의 정점에서만 닿는다 (V2: 벽 반동 보상)
    part(950, 320),
    part(400), part(720, 380), part(1320, 380), part(1700),
  ]),

  stage(5, '액정 관문', 2300, exitRight(2300), [
    floor(0, 700),
    floor(900, 600),
    floorAt(1500, 900, 380), // 구덩이 바닥 (우벽까지 빈틈 없이)
    wallAt(1490, G, 300),
    wallAt(1685, G, 300),    // 중앙 기둥 — 왼쪽 틈은 안전, 오른쪽 틈은 가시
    wallAt(1870, G, 300),
    spikeAt(1750, 900, 40),  // 오른쪽 틈 바닥 가시 — 떨어질 곳을 고르는 시험
    floor(1870, 430),
    spike(1100),
    part(500), part(800, 400), part(1120, 380), part(1590, 780), part(2050),
  ], { height: 1020, isCheckpointEnd: true }),

  // ============== CHAPTER 2: 기판 회로 (6-10) ==============
  // 새 요소: 부서지는 바닥, 상/하 방향 탈출
  stage(6, '수직 버스', 1700, { x: 1530, y: 110, width: 110, height: 100 }, [
    floorAt(0, 960, 1700), // 지면 전체 (샤프트 밑까지 이어짐)
    // 우측 끝 수직 샤프트: 좌벽(240~840, 아래 120px 입구 개방) + 맵 우측 경계
    wallAt(1500, 240, 600),
    floorAt(1500, 240, 140), // 샤프트 꼭대기 좌측 선반
    part(500, 820), part(900, 820), part(1300, 820), part(1600, 700), part(1600, 420),
  ], { height: 1080, spawn: { x: 100, y: 780 }, hint: '위로 — 벽과 벽 사이를 차고 올라라' }),

  // V2: 점멸 발판 첫 등장 — ① 보너스(위 떠 있는 점멸 발판, 놓쳐도 안전)
  // ② 점프로도 건널 수 있는 구간의 편의 다리 ③ 구덩이 위 필수 다리(떨어져도 벽타기 회복)
  stage(7, '깜빡이는 동박', 2400, exitRight(2400), [
    floor(0, 560),
    blinkFloorAt(200, 470, 160), // 보너스 점멸 발판 — 아래는 안전한 지면
    part(280, 240),              // 점멸 발판에서 튀어야 닿는 보너스 ◆
    floor(620, 160, 'fragile'),
    floor(840, 200),
    blinkFloorAt(1100, G, 140),  // 편의 다리 — 박자를 못 맞춰도 점프로 건널 수 있는 폭(300)
    // 부서지는 바닥의 구덩이 — 점멸 다리로 건너거나, 떨어지면 벽을 차고 나올 것
    floorAt(1340, 900, 360, 'fragile'),
    wallAt(1330, G, 300),
    wallAt(1515, G, 300),   // 중앙 기둥 — 좁은 틈 지그재그 탈출
    wallAt(1700, G, 300),
    blinkFloorAt(1430, G, 160, 2, 0.5), // 구덩이 위 점멸 다리 (엇박)
    floor(1700, 700),
    spike(1900),
    part(700, 430), part(940, 470), part(1170, 440), part(1510, 470), part(2050), part(2250),
  ], { height: 1020, hint: '점선은 예고, 빠른 점멸은 작별 — 박자를 맞춰라' }),

  // 아래 방향 탈출 — 마지막 구멍으로 떨어져 하부 통로의 탈출구로 (우측 경계 밀착)
  // V2: 발사 패드 첫 등장 — 상부는 선택(빠른 길), 하부는 안전한 직선 체험
  stage(8, '하부 덕트', 2200, { x: 2100, y: 800, width: 100, height: 150 }, [
    floor(0, 700),
    floorAt(700, 380, 220, 'fragile'), // 공중 점퍼선
    floor(920, 280),
    launcherAt(1200, G, 1),  // 상부 발사 패드 — 점퍼선을 건너뛰는 빠른 길 (선택)
    floor(1260, 160),
    floorAt(1420, 380, 220, 'fragile'),
    floor(1640, 360), // 1640~2000, 이후 큰 구멍 → 하부로
    part(1500, 420),  // 발사 비행 궤도 위의 ◆ — 발사로만 자연스럽게 닿는다
    floorAt(1420, 960, 80),  // 하부 통로 바닥 (1420~2200 — 위 구멍 어디로 떨어져도 받아줌)
    launcherAt(1500, 960, 1), // 하부 발사 패드 — 탈출구까지 직행 (안전한 첫 체험)
    floorAt(1560, 960, 640),
    wallAt(1410, 660, 300),  // 하부 통로 좌벽 (이탈 방지 겸 반동 연습)
    part(400), part(810, 220), part(1530, 220), part(1850, 880),
  ], { height: 1080, hint: '화살표를 밟으면 발사 — 반대 키로 꺾어 멈춘다' }),

  // V2: 점멸+발사 조합 — 발사로 가시밭을 날아 넘고, 점멸 다리로 구덩이를 건넌다
  stage(9, '미세 납땜', 2600, exitRight(2600), [
    floor(0, 440),
    launcherAt(440, G, 1),   // 가시밭 활공 — 브레이크 타이밍에 따라 두 착지 지대
    floor(560, 540),
    spike(700),
    spike(900),
    floor(1180, 220),
    // 점멸 다리 구덩이 — 떨어지면 기둥 틈 지그재그로 회복
    floorAt(1400, 900, 360, 'fragile'),
    wallAt(1390, G, 300),
    wallAt(1575, G, 300),
    wallAt(1760, G, 300),
    blinkFloorAt(1490, G, 140),
    floor(1760, 340),
    spike(1980),
    launcherAt(2100, G, 1),  // 마지막 직선 활공 — 탈출구로
    floor(2160, 440),
    part(250, 430), part(820, 390), part(1290, 440), part(1555, 470), part(1900, 450), part(2400, 430),
  ]),

  // 챕터 2 보스 — 수평 돌파 후 수직 샤프트 등반으로 위 탈출
  // V2 종합 시험: 점멸 발판(긴 주기) + 발사 패드 → 가시 활공 → 샤프트
  stage(10, '회로 관문', 2400, { x: 2240, y: 110, width: 110, height: 100 }, [
    floorAt(0, 960, 500),
    floorAt(620, 960, 300),
    floorAt(1040, 960, 300, 'fragile'),
    blinkFloorAt(1460, 960, 250, 3), // 챕터 기믹 ①: 점멸 발판 (보스 템포 — 긴 주기)
    floorAt(1830, 960, 120),
    launcherAt(1950, 960, 1),        // 챕터 기믹 ②: 발사 — 가시를 활공으로 넘어 샤프트로
    floorAt(2010, 960, 390),
    spikeAt(700, 960, 40),
    spikeAt(2100, 960, 40), // 발사 활공이 넘어가는 가시 — 걸어서 가면 점프 회피
    // 우측 수직 샤프트 (좌벽 240~840 + 우측 경계, 입구는 아래 120px)
    wallAt(2200, 240, 600),
    floorAt(2200, 240, 130),
    part(400, 820), part(840, 820), part(1240, 820), part(1650, 820),
    part(2300, 760), part(2300, 460),
  ], { height: 1080, spawn: { x: 100, y: 780 }, isCheckpointEnd: true }),

  // ============== CHAPTER 3: 콘덴서 지대 (11-15) ==============
  // 새 요소: 폭발 발판, 천장 가시(납땜 침), 낙하 시작 맵
  // V2: 폭탄 첫 등장 — 평지에서 점화·폭발·넉백을 안전하게 학습.
  // 금 간 벽(윗변 360 = 점프 불가)이 길을 막는다: 폭탄을 점화하고 ① 멀리 물러서거나
  // ② 벽과 폭탄 사이에 서서 폭발에 실려 벽 너머로 날아간다 (숙련 루트)
  stage(11, '과전압 주의', 2600, exitRight(2600), [
    floor(0, 800),
    floor(800, 120, 'explosive'),
    floor(920, 1680),
    bombAt(1480, 560),
    crackedWall(1600, 360, 240),
    // 낮은 금 간 벽(윗변 440 = 점프 가능) 뒤의 ◆ — 폭탄 없이도 넘을 수 있는 선택 퍼즐
    bombAt(1980, 560),
    crackedWall(2100, 440, 160),
    part(2160, 540),
    part(400), part(860, 400), part(1240), part(1760, 450), part(2400),
  ], { hint: '콘덴서가 깜빡이면 곧 터진다 — 물러서거나, 등져라' }),

  // ★ V2 「붕괴 시추공」 — 사용자 요청 맵: 2회 벽돌 위에서 시작, 밟아 부수며
  //   수직 하강, 하부 탈출. 각 층의 벽돌이 낙하선(중앙 x≈450)을 받아주고,
  //   층마다 좌우 가시·열린 틈으로 조향을 시험한다. (S13 자유 낙하와 하강 2부작)
  stage(12, '붕괴 시추공', 900, { x: 800, y: 1990, width: 100, height: 170 }, [
    floorAt(330, 200, 240, 'brick'),   // L0 — 시작 벽돌. 두 번 밟으면 붕괴
    floorAt(240, 560, 420, 'brick'),   // L1 — 넓은 벽돌
    // L2 — 가운데 벽돌만 부서진다. 좌측엔 가시 (착지 조향 시험)
    floorAt(0, 920, 330),
    spikeAt(150, 920, 40),
    floorAt(330, 920, 240, 'brick'),
    floorAt(600, 920, 300),
    // L3 — 벽돌 양옆에 열린 틈(120px): 숙련자는 조향으로 통과, 아니면 벽돌 2회
    floorAt(0, 1280, 240),
    spikeAt(60, 1280, 40),
    floorAt(360, 1280, 180, 'brick'),
    floorAt(660, 1280, 240),
    spikeAt(800, 1280, 40),
    // L4 — 중앙 선반: 양옆으로 떨어지며 경계 벽 반동으로 측면 ◆ 회수
    floorAt(300, 1640, 300),
    // L5 — 바닥과 우측 탈출구
    floorAt(0, 2160, 900),
    part(450, 420), part(450, 780), part(700, 1140), part(450, 1500),
    part(80, 1500), part(820, 1500), part(250, 2040),
    shieldItem(550, 2040),
  ], { height: 2280, spawn: { x: 450, y: 120 }, hint: '벽돌은 두 번 — 무너지며 내려가라' }),

  // ★ 낙하 시작 맵 — 시작하자마자 좁은 샤프트로 추락, 1회용 발판을 딱 한 번 밟고
  //   양 벽을 지그재그로 차며 등반, 낮은 우벽(320)을 넘어 탈출구로 (사용자 요청 맵)
  //   리뷰 검증 반영: 단일 벽 되짚기는 물리적으로 불가(재접촉 0.9s > 체공 0.58s) →
  //   220px 지그재그 샤프트 구조로 재설계. 탈출구는 낙하 드리프트(≤80px)로 도달 불가 위치.
  stage(13, '자유 낙하', 900, { x: 590, y: 360, width: 110, height: 110 }, [
    wallAt(240, 200, 1120),  // 좌벽 (200~1320, 높음) — 왼쪽으로는 못 나간다
    wallAt(470, 320, 1000),  // 우벽 (320~1320, 낮음) — 이 벽을 넘는다
    // 샤프트 바닥: V2에서 fragile→normal — 무입력 시 ~2.1초에 추락사하여
    // '스폰 3초 무입력 생존' 절대 원칙을 위반했다 (리뷰 확정). 난이도의 본체는
    // 벽타기 등반이므로 바닥은 안전한 재시도 지점으로 두고, '한 번뿐' 긴장감은
    // 탈출구 아래 회수용 바닥에만 남긴다.
    floorAt(240, 1200, 240),
    floorAt(660, 1280, 240, 'fragile'), // 탈출구 아래 회수용 바닥 — 1회용 (소프트락 방지)
    part(350, 1000), part(360, 760), part(330, 520), part(560, 340),
  ], { height: 1320, spawn: { x: 300, y: 80 }, hint: '바닥에 안주하지 마라 — 벽을 타라' }),

  // ★ V2 「격벽 폭파」 — 사용자 요청 맵: 폭탄으로 막힌 벽을 뚫고, 폭발 넉백을
  //   좌우 입력으로 버틴다. 1번 벽: 물러서기·올라타기 둘 다 가능 (학습).
  //   2번 벽: 양옆이 위험 — '폭발을 등지고 벽 너머로 발사'가 정답 (숙련).
  stage(14, '격벽 폭파', 3000, exitRight(3000), [
    floor(0, 1300),
    ceilingSpike(550, 80),
    spike(800), // 폭탄1 왼쪽의 가시 — 점화 후 어중간한 거리에 서 있으면 밀려 닿는다
    bombAt(1180, 560),
    crackedWall(1300, 360, 240),
    floor(1300, 700),
    // 캐치 벽 — 폭탄1 등지기 활공을 안전하게 받아낸다 (없으면 무입력 활공이
    // 가시밭까지 미끄러져 들어감 — gimmick-sim 검출). 넘어갈 수 있는 높이(430)
    wallAt(1900, 430, 170),
    // 가시밭 — 틈 없는 연속 가시: 공중 점퍼선이 유일한 길 (40px 틈 요행 착지 제거)
    floor(2000, 300),
    spikeAt(2020, G, 250),
    floorAt(2000, 420, 120, 'fragile'),
    floorAt(2180, 420, 120, 'fragile'),
    floor(2300, 700),
    spike(2380), // 폭탄2 왼쪽 가시 — 이번엔 물러설 곳이 없다: 등지고 날아가라
    bombAt(2520, 560),
    crackedWall(2640, 360, 240),
    // 반동 점프 보상 벽 — 위에 ◆ (일반 점프 정점보다 높다).
    // x2880: 폭탄2 등지기 활공의 자연 정지점(x≈2824, 시뮬레이션 실측) 너머 —
    // 2840에 두면 활공이 벽에 되튕겨 가시(2380)로 떨어졌다 (gimmick-sim이 검출)
    wallAt(2880, 430, 170),
    part(2885, 290),
    part(300, 470), part(700, 470), part(1500, 450), part(2060, 350), part(2240, 350), part(2450, 470),
    shieldItem(1080, 440),
  ], { hint: '폭발을 등지면 — 길이 된다. 그리고 버텨라' }),

  // 챕터 3 보스 — 폭발 지대 돌파 후 수직 탈출
  // V2 종합 시험: 2회 벽돌 + 폭탄(금 간 벽이 샤프트 입구를 봉쇄) + 기존 폭발/붕괴 발판
  stage(15, '방전 관문', 2600, { x: 2440, y: 110, width: 110, height: 100 }, [
    floorAt(0, 960, 400),
    floorAt(400, 960, 190, 'fragile'),
    floorAt(590, 960, 100, 'explosive'),
    floorAt(690, 960, 150, 'fragile'),
    floorAt(840, 960, 100, 'brick'),
    floorAt(940, 960, 100, 'explosive'),
    floorAt(1040, 960, 250),
    floorAt(1290, 960, 150, 'fragile'),
    floorAt(1440, 960, 100, 'explosive'),
    floorAt(1540, 960, 150, 'brick'),
    floorAt(1690, 960, 100, 'explosive'),
    floorAt(1790, 960, 810), // 샤프트 바닥까지 (2600)
    spikeAt(1130, 960, 40),
    spikeAt(1940, 960, 40),
    // 샤프트 입구 봉쇄 — 폭탄으로 뚫어라 (안전 대기 지대: 1800~1880, 폭탄 반경 밖)
    bombAt(2200, 920),
    crackedWall(2330, 600, 360),
    // 수직 샤프트 (2400 좌벽 + 우측 경계)
    wallAt(2400, 240, 600),
    floorAt(2400, 240, 130),
    part(200, 820), part(700, 800), part(1030, 700), part(1300, 820),
    part(1750, 800), part(2100, 820), part(2480, 760), part(2480, 460),
    shieldItem(450, 800),
  ], { height: 1080, spawn: { x: 100, y: 780 }, isCheckpointEnd: true }),

  // ============== CHAPTER 4: CPU 코어 (16-20) ==============
  stage(16, '오버클럭 입문', 3000, exitRight(3000), [
    floor(0, 300),
    floor(330, 100, 'fragile'),
    floor(430, 100, 'explosive'),
    floor(530, 100, 'fragile'),
    floor(630, 130),
    floor(800, 100, 'fragile'),
    floor(900, 100, 'explosive'),
    floor(1000, 100, 'fragile'),
    floor(1100, 100, 'explosive'),
    floor(1200, 130),
    floor(1430, 100, 'fragile'),
    floor(1530, 100, 'explosive'),
    floor(1630, 130),
    floor(1760, 100, 'fragile'),
    floor(1860, 100, 'explosive'),
    floor(1960, 100, 'fragile'),
    floor(2060, 940),
    spike(700),  // 680→700: 좌측 안전 착지폭 확보 (퍼펙트존 최소폭 이상)
    spike(1710), // 1750→1710: fragile 이음새에 걸쳐 붕괴 후 공중 부유하던 문제 수정
    // V2: 이동 가시 첫 등장 — 단단한 발판 위(기다릴 수 있는 안전한 맥락), 경로 점선 표시
    movingSpike(1240, 350, 150),
    movingSpike(2150, 340, 160, 4, 0.5),
    part(200), part(700, 380), part(900, 430), part(1250), part(1710, 380), part(2300),
  ], { hint: '왕복하는 침 — 박자를 읽어라' }),

  stage(17, '교차 버스', 3200, exitRight(3200), [
    floor(0, 350),
    floor(380, 100, 'explosive'),
    floor(480, 100, 'fragile'),
    floor(580, 100),
    floor(680, 100, 'fragile'),
    floor(780, 100, 'explosive'),
    floor(880, 100, 'fragile'),
    floor(980, 100),
    floor(1080, 100, 'fragile'),
    floor(1180, 100, 'explosive'),
    floor(1280, 100, 'fragile'),
    floor(1380, 100),
    floor(1480, 100, 'fragile'),
    floor(1580, 100, 'explosive'),
    floor(1680, 100, 'fragile'),
    floor(1780, 100),
    floor(1880, 100, 'fragile'),
    floor(1980, 100, 'explosive'),
    floor(2080, 1120),
    ceilingSpike(420, 60),
    ceilingSpike(680, 60),
    ceilingSpike(880, 60),
    ceilingSpike(1080, 60),
    ceilingSpike(1340, 60),
    ceilingSpike(1580, 60),
    ceilingSpike(1880, 60),
    // V2: 가짜 가시 — 진짜(1410)는 미세하게 깜빡이지만 이놈은 멈춰 있다. 위에 ◆
    fakeSpike(1010),
    part(1030, 500),
    spike(1410),
    // V2: 이동 가시 — 천장 가시 회랑 사이의 세로 박자 관문
    movingSpike(1800, 330, 160),
    part(450, 480), part(700, 480), part(1100, 480), part(1600, 480), part(2300), part(2800),
    shieldItem(1900, 470),
  ], { hint: '깜빡이지 않는 가시는 — 가짜다' }),

  // V2: 2회 벽돌·이동 가시를 기존 폭발/붕괴 발판 회랑에 합성
  stage(18, '버스 폭주', 3200, exitRight(3200), [
    floor(0, 300),
    floor(320, 100, 'fragile'),
    floor(420, 100, 'brick'),
    floor(520, 100, 'explosive'),
    floor(620, 100, 'explosive'),
    floor(720, 100, 'fragile'),
    floor(820, 100, 'explosive'),
    floor(920, 100, 'fragile'),
    floor(1020, 100, 'brick'),
    floor(1120, 100, 'explosive'),
    floor(1220, 100, 'fragile'),
    // 폭주 구덩이 — 바닥이 2회 벽돌: 첫 바운스(균열)에 벽 반동 시도, 한 번 더 기회
    // (V2: fragile→brick — 신규 기믹 활용 + 탈출 창 완화)
    floorAt(1320, 900, 360, 'brick'),
    wallAt(1310, G, 300),
    wallAt(1495, G, 300),   // 중앙 기둥
    wallAt(1680, G, 300),
    floor(1680, 100, 'fragile'),
    floor(1780, 100, 'explosive'),
    floor(1880, 100, 'fragile'),
    floor(1980, 100, 'explosive'),
    floor(2080, 100, 'brick'),
    floor(2180, 100, 'fragile'),
    floor(2280, 920),
    movingSpike(2450, 340, 160),
    part(350, 430), part(800), part(1230, 430), part(1500, 700), part(1830), part(2400), part(2800),
    shieldItem(1170, 400),
  ], { height: 1020 }),

  // ★ V2 「셧다운 웨이브」 — 추격전: 왼쪽에서 소멸 벽이 등속(300px/s) 추격.
  //   멈추면 지워진다 (보호막 무효). 구덩이 없음 — 가시·붕괴 발판·반동 부스터만.
  //   벽 반동(1.35×)이 '빠른 길' = 시그니처 기술의 졸업 시험 (Bounce Tales Final Ride 문법)
  stage(19, '셧다운 웨이브', 3200, exitRight(3200), [
    floor(0, 430),
    floor(460, 170, 'fragile'),
    floor(660, 340),
    spike(800),
    floor(1030, 150, 'fragile'),
    floor(1210, 390),
    spike(1380),
    floor(1600, 480),
    wallAt(1650, 420, 180), // 반동 부스터 — 차고 나가면 1.35배 가속 (넘어가도 됨)
    spike(1900),
    floor(2110, 140, 'fragile'),
    floor(2280, 920),
    spike(2480),
    wallAt(2700, 420, 180), // 두 번째 부스터
    spike(2920),
    part(300), part(560, 430), part(850, 400), part(1100, 430), part(1450),
    part(1655, 340), part(2180, 430), part(2550), part(3000),
    shieldItem(1300, 430),
  ], { chase: { speed: 300, delayMs: 2500 }, hint: '멈추면 지워진다 — 오른쪽으로!' }),

  // 최종장 — 코어 점화: 마지막 회랑 돌파 후 코어 샤프트를 등반해 위로 탈출
  stage(20, '코어 점화', 2620, { x: 2420, y: 100, width: 110, height: 110 }, [
    floorAt(0, 1080, 250),
    floorAt(270, 1080, 80, 'explosive'),
    floorAt(350, 1080, 80, 'fragile'),
    floorAt(430, 1080, 100),
    floorAt(530, 1080, 80, 'fragile'),
    floorAt(610, 1080, 80, 'explosive'),
    floorAt(690, 1080, 80, 'fragile'),
    floorAt(770, 1080, 110),
    floorAt(880, 1080, 80, 'explosive'),
    // 구멍 (960~1140)
    floorAt(1140, 1080, 80, 'fragile'),
    floorAt(1220, 1080, 80, 'explosive'),
    blinkFloorAt(1300, 1080, 100, 3), // V2: 점멸 발판 — 최종장의 박자 시험
    floorAt(1400, 1080, 80, 'fragile'),
    floorAt(1480, 1080, 80, 'explosive'),
    floorAt(1560, 1080, 100),
    floorAt(1660, 1080, 80, 'fragile'),
    floorAt(1740, 1080, 80, 'explosive'),
    floorAt(1820, 1080, 100, 'fragile'),
    floorAt(1920, 1080, 700), // 샤프트 바닥까지 (2620)
    spikeAt(2050, 1080, 40),
    spikeAt(2250, 1080, 40),
    // 코어 샤프트 — 좌벽(2400~2410) + 우측 경계(2620), 폭 210. 등반이 곧 점화 시퀀스
    wallAt(2400, 220, 740),
    floorAt(2400, 220, 130),
    // 샤프트 안 마지막 위협 — 좌벽에 매달린 납땜 침. 이 높이를 지날 땐 오른쪽 면을 타라
    // (등반 중 위치 선택 시험. y=500: 진입 직후 자연 반동 구간(850~960)과 겹치지 않게 상향)
    { type: 'ceiling_spike', x: 2415, y: 500, width: 40 },
    // V2: 점멸 벽 — 주기적으로 샤프트 안쪽 벽면이 돌출. 켜지면 샤프트가 좁아지고
    // (가운데 통로는 항상 열려 있음), 벽 반동의 추가 발판이 된다 — 점멸+반동 최종 시험.
    // x2520: 우측 경계(2620)에서 40px 띄움 — 경계 밀착 시 공이 월드 밖으로 사출되어
    // 진동하던 버그의 데이터 차원 수정 (충돌 코드에도 경계 가드 추가됨, 리뷰 확정)
    { type: 'wall', x: 2520, y: 480, width: 60, height: 160, blinkPeriodMult: 3 },
    part(200, 940), part(560, 900), part(800, 940), part(1050, 880),
    part(1340, 940), part(1620, 900), part(1980, 940), part(2540, 860),
    part(2540, 560), part(2540, 360),
    shieldItem(1480, 880),
  ], { height: 1200, spawn: { x: 100, y: 900 } }),
];

export const STAGES_DATA: StagesFile = {
  version: 5, // V2 기믹 확장 — 벽돌/폭탄/점멸/발사/이동가시/추격전
  totalStages: STAGES.length,
  checkpoints: [1, 6, 11, 16],
  stages: STAGES,
};
