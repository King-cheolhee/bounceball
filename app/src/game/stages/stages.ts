import type { StagesFile, StageData, StageElement } from '../../utils/types';
import { getBouncePeriod } from '../entities/Ball';
import { CEILING_SPIKE_Y } from '../../utils/constants';

/**
 * 스테이지 설계 메모 (점프 높이 240px, 벽 반동 점프 기준)
 * - 지면 바닥 y=600. 공 중심: 바닥 위 584, 점프 정점 ≈ 344 (정점에서 공 하단 ≈ 364)
 * - 일반 점프로 넘을 수 없는 벽: 윗변 y ≤ 360 → 공중에서 벽에 닿아 반동 점프 필요
 * - 구덩이(깊이 300, 바닥 900): 안에서 1회 반동 점프로 탈출 가능
 * - 수평 도달(체공 1회 최고속): S1≈316px → S10≈338px → S20≈274px. 구멍은 여유를 두고 더 좁게
 * - 탈출구는 상하좌우 어느 방향이든 배치 가능 (exit 사각 영역)
 */

const G = 600; // 기본 지면 y

function floorAt(x: number, y: number, w: number, variant: 'normal' | 'fragile' | 'explosive' = 'normal'): StageElement {
  return { type: 'floor', x, y, width: w, variant };
}
function floor(x: number, w: number, variant: 'normal' | 'fragile' | 'explosive' = 'normal'): StageElement {
  return floorAt(x, G, w, variant);
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
/** 우측 끝 탈출구 (지면 레벨) */
function exitRight(width: number, y = 410) {
  return { x: width - 130, y, width: 90, height: 170 };
}

interface StageOpts {
  isCheckpointEnd?: boolean;
  height?: number;
  spawn?: { x: number; y: number };
  hint?: string;
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

  // 벽 반동 튜토리얼 — 너비 380 구덩이(점프 불가)에 빠진 뒤 벽을 차고 나온다
  stage(3, '갇힌 회랑', 1900, exitRight(1900), [
    floor(0, 700),
    floorAt(700, 900, 380), // 구덩이 바닥 (깊이 300)
    wallAt(690, G, 300),    // 구덩이 좌벽
    wallAt(1080, G, 300),   // 구덩이 우벽
    floor(1080, 820),
    part(400), part(890, 760), part(990, 760), part(1400), part(1700),
  ], { height: 1020, hint: '벽에 닿는 순간, 반대쪽을 눌러라' }),

  stage(4, '정전기 가시', 2000, exitRight(2000), [
    floor(0, 2000),
    spike(700),
    spike(1300),
    // 중앙 벽 — 넘을 수는 있지만(윗변 400) 반동 점프로 가속하면 더 빠르다
    wallAt(1000, 400, 200),
    part(400), part(720, 380), part(1320, 380), part(1700),
  ]),

  stage(5, '액정 관문', 2300, exitRight(2300), [
    floor(0, 700),
    floor(900, 600),
    floorAt(1500, 900, 380), // 구덩이 바닥 (우벽까지 빈틈 없이)
    wallAt(1490, G, 300),
    wallAt(1870, G, 300),
    spikeAt(1660, 900, 40),  // 구덩이 바닥 한가운데 가시 — 좌우 절반만 안전
    floor(1870, 430),
    spike(1100),
    part(500), part(800, 400), part(1120, 380), part(1560, 780), part(2050),
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

  stage(7, '삭은 동박', 2400, exitRight(2400), [
    floor(0, 500),
    floor(560, 200, 'fragile'),
    floor(760, 160),
    floor(980, 200, 'fragile'),
    floor(1180, 160),
    // 부서지는 바닥의 구덩이 — 한 번 밟으면 무너진다, 빠르게 벽을 차고 나올 것
    floorAt(1340, 900, 360, 'fragile'),
    wallAt(1330, G, 300),
    wallAt(1700, G, 300),
    floor(1700, 700),
    part(630, 430), part(1050, 430), part(1430, 760), part(1900), part(2150),
  ], { height: 1020 }),

  // 아래 방향 탈출 — 마지막 구멍으로 떨어져 하부 통로의 탈출구로
  stage(8, '하부 덕트', 2200, { x: 2040, y: 800, width: 100, height: 150 }, [
    floor(0, 700),
    floorAt(700, 380, 220, 'fragile'), // 공중 점퍼선
    floor(920, 500),
    floorAt(1420, 380, 220, 'fragile'),
    floor(1640, 360), // 1640~2000, 이후 큰 구멍 → 하부로
    floorAt(1420, 960, 780), // 하부 통로 바닥 (1420~2200 — 위 구멍 어디로 떨어져도 받아줌)
    wallAt(1410, 660, 300),  // 하부 통로 좌벽 (이탈 방지 겸 반동 연습)
    part(400), part(810, 220), part(1530, 220), part(1200, 450), part(1850, 880),
  ], { height: 1080 }),

  stage(9, '미세 납땜', 2600, exitRight(2600), [
    floor(0, 500),
    floor(700, 300, 'fragile'),
    floor(1000, 200),
    floor(1200, 200, 'fragile'),
    floor(1400, 250),
    floor(1700, 900),
    spike(1080),
    spike(1490),
    part(300), part(850, 430), part(1100, 380), part(1300, 430), part(1520, 380), part(2000),
  ]),

  // 챕터 2 보스 — 수평 돌파 후 수직 샤프트 등반으로 위 탈출
  stage(10, '회로 관문', 2400, { x: 2240, y: 110, width: 110, height: 100 }, [
    floorAt(0, 960, 500),
    floorAt(620, 960, 300),
    floorAt(1040, 960, 300, 'fragile'),
    floorAt(1460, 960, 250),
    floorAt(1830, 960, 570), // 샤프트 밑까지
    spikeAt(700, 960, 40),
    spikeAt(1900, 960, 40),
    spikeAt(2100, 960, 40),
    // 우측 수직 샤프트 (좌벽 240~840 + 우측 경계, 입구는 아래 120px)
    wallAt(2200, 240, 600),
    floorAt(2200, 240, 130),
    part(400, 820), part(840, 820), part(1240, 820), part(1650, 820),
    part(2300, 760), part(2300, 460),
  ], { height: 1080, spawn: { x: 100, y: 780 }, isCheckpointEnd: true }),

  // ============== CHAPTER 3: 콘덴서 지대 (11-15) ==============
  // 새 요소: 폭발 발판, 천장 가시(납땜 침), 낙하 시작 맵
  stage(11, '과전압 주의', 2600, exitRight(2600), [
    floor(0, 800),
    floor(800, 120, 'explosive'),
    floor(920, 1680),
    part(400), part(860, 400), part(1300), part(1800), part(2200),
  ]),

  stage(12, '연쇄 방전', 2800, exitRight(2800), [
    floor(0, 500),
    floor(500, 100, 'explosive'),
    floor(600, 200, 'fragile'),
    floor(800, 100, 'explosive'),
    floor(900, 300),
    floor(1200, 100, 'fragile'),
    floor(1300, 100, 'explosive'),
    floor(1400, 200, 'fragile'),
    floor(1600, 100, 'explosive'),
    floor(1700, 1100),
    part(300), part(700, 430), part(1000), part(1450, 430), part(1900),
    shieldItem(1100, 400),
  ]),

  // ★ 낙하 시작 맵 — 시작하자마자 추락, 부서지는 바닥을 "딱 한 번"만 밟을 수 있고
  //   그 한 번의 점프로 옆벽에 붙어 삼각뛰기(벽 반동)를 반복해 벽을 넘어야 클리어
  //   (원조 공튀기기의 옆벽면 타기 — 사용자 요청 맵)
  stage(13, '자유 낙하', 900, { x: 770, y: 1150, width: 90, height: 110 }, [
    floorAt(120, 1200, 320, 'fragile'), // 유일한 발판 — 1회용. 실패 = 추락
    wallAt(560, 360, 960),  // 중앙 벽 (360~1320) — 점프로는 못 넘고 벽타기로만
    floorAt(570, 1280, 330), // 벽 너머 착지 바닥
    part(520, 900), part(520, 660), part(520, 420), part(700, 300),
  ], { height: 1320, spawn: { x: 280, y: 80 }, hint: '발판은 한 번뿐 — 벽을 타라' }),

  stage(14, '납땜 침 회랑', 3000, exitRight(3000), [
    floor(0, 700),
    floor(700, 300, 'fragile'),
    floor(1000, 200),
    floor(1200, 200, 'explosive'),
    floor(1400, 1600),
    ceilingSpike(550, 80),
    ceilingSpike(700, 80),
    ceilingSpike(1300, 80),
    ceilingSpike(1450, 80),
    part(400, 470), part(630, 470), part(1100), part(1380, 470), part(2000), part(2400),
    shieldItem(1700),
  ]),

  // 챕터 3 보스 — 폭발 지대 돌파 후 수직 탈출
  stage(15, '방전 관문', 2600, { x: 2440, y: 110, width: 110, height: 100 }, [
    floorAt(0, 960, 400),
    floorAt(400, 960, 190, 'fragile'),
    floorAt(590, 960, 100, 'explosive'),
    floorAt(690, 960, 150, 'fragile'),
    floorAt(840, 960, 100),
    floorAt(940, 960, 100, 'explosive'),
    floorAt(1040, 960, 250),
    floorAt(1290, 960, 150, 'fragile'),
    floorAt(1440, 960, 100, 'explosive'),
    floorAt(1540, 960, 150),
    floorAt(1690, 960, 100, 'explosive'),
    floorAt(1790, 960, 810), // 샤프트 바닥까지 (2600)
    spikeAt(1130, 960, 40),
    spikeAt(1940, 960, 40),
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
    spike(680),
    spike(1750),
    part(200), part(680, 380), part(900, 430), part(1250), part(1750, 380), part(2300),
  ]),

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
    part(450, 480), part(700, 480), part(1100, 480), part(1600, 480), part(2300), part(2800),
    shieldItem(1900, 470),
  ]),

  stage(18, '버스 폭주', 3200, exitRight(3200), [
    floor(0, 300),
    floor(320, 100, 'fragile'),
    floor(420, 100),
    floor(520, 100, 'explosive'),
    floor(620, 100, 'explosive'),
    floor(720, 100, 'fragile'),
    floor(820, 100, 'explosive'),
    floor(920, 100, 'fragile'),
    floor(1020, 100, 'fragile'),
    floor(1120, 100, 'explosive'),
    floor(1220, 100, 'fragile'),
    // 폭주 구덩이 — 바닥 전체가 폭발 발판, 벽 반동만이 답
    floorAt(1320, 900, 360, 'explosive'),
    wallAt(1310, G, 300),
    wallAt(1680, G, 300),
    floor(1680, 100, 'fragile'),
    floor(1780, 100, 'explosive'),
    floor(1880, 100, 'fragile'),
    floor(1980, 100, 'explosive'),
    floor(2080, 100),
    floor(2180, 100, 'fragile'),
    floor(2280, 920),
    part(350, 430), part(800), part(1230, 430), part(1500, 700), part(1830), part(2400), part(2800),
    shieldItem(1170, 400),
  ], { height: 1020 }),

  stage(19, '마지막 연산', 3200, exitRight(3200), [
    floor(0, 280),
    floor(300, 80, 'explosive'),
    floor(380, 100, 'fragile'),
    floor(480, 80, 'explosive'),
    floor(560, 100, 'fragile'),
    floor(660, 80, 'explosive'),
    floor(740, 100),
    floor(840, 80, 'explosive'),
    floor(920, 100, 'fragile'),
    floor(1020, 100),
    floor(1120, 80, 'explosive'),
    floor(1200, 100, 'fragile'),
    // 큰 구멍 (1300~1500)
    floor(1500, 100, 'fragile'),
    floor(1600, 80, 'explosive'),
    floor(1680, 80, 'fragile'),
    floor(1760, 80, 'explosive'),
    floor(1840, 100),
    floor(1940, 80, 'fragile'),
    floor(2020, 130),
    floor(2150, 80, 'explosive'),
    floor(2230, 100, 'fragile'),
    floor(2330, 870),
    ceilingSpike(380, 60),
    ceilingSpike(700, 60),
    ceilingSpike(1080, 60),
    ceilingSpike(1600, 60),
    ceilingSpike(1900, 60),
    ceilingSpike(2200, 60),
    part(320, 470), part(800, 470), part(1150, 470), part(1400, 420),
    part(1880, 450), part(2450), part(2800),
    shieldItem(2050, 430),
  ]),

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
    floorAt(1300, 1080, 100),
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
    // (등반 중 위치 선택 시험 — 바닥 점프 기준 검증기에는 '닿지 않음'으로 잡히지만 의도된 배치)
    { type: 'ceiling_spike', x: 2415, y: 640, width: 40 },
    part(200, 940), part(560, 900), part(800, 940), part(1050, 880),
    part(1340, 940), part(1620, 900), part(1980, 940), part(2540, 860),
    part(2540, 560), part(2540, 360),
    shieldItem(1480, 880),
  ], { height: 1200, spawn: { x: 100, y: 900 } }),
];

export const STAGES_DATA: StagesFile = {
  version: 4,
  totalStages: STAGES.length,
  checkpoints: [1, 6, 11, 16],
  stages: STAGES,
};
