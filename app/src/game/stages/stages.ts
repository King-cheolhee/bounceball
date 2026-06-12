import type { StagesFile, StageData } from '../../utils/types';
import { getBouncePeriod } from '../entities/Ball';
import { CEILING_SPIKE_Y } from '../../utils/constants';

const FLOOR_Y = 600;
const GROUND_LEVEL = 600;

function floor(x: number, w: number, variant: 'normal' | 'fragile' | 'explosive' = 'normal'): StageData['elements'][number] {
  return { type: 'floor', x, y: FLOOR_Y, width: w, variant };
}
function spike(x: number, w = 40): StageData['elements'][number] {
  return { type: 'spike', x, y: GROUND_LEVEL, width: w };
}
/**
 * 천장 가시. 기본 y=CEILING_SPIKE_Y(248) — 점프 정점에서만 닿는 높이.
 * 회피법: 가시 아래를 지날 때 점프 정점이 겹치지 않도록 수평 타이밍 조절.
 * (기존 y=60은 물리적으로 도달 불가능했던 기획 모순 — 전면 수정)
 */
function ceilingSpike(x: number, w = 60, y = CEILING_SPIKE_Y): StageData['elements'][number] {
  return { type: 'ceiling_spike', x, y, width: w };
}
function wall(x: number, h = 600, y = 0, w = 8): StageData['elements'][number] {
  return { type: 'wall', x, y, width: w, height: h };
}
/** 부품(◆) — 수집 재화. 스킨 해금에 사용. 스테이지 클리어 시에만 적립된다. */
function part(x: number, y = 440): StageData['elements'][number] {
  return { type: 'part', x, y };
}
/** 백업 셀 — 1회용 보호막. 가시/폭발 1회 무효 (추락은 못 막음). 챕터 3~4에만 희소 배치. */
function shieldItem(x: number, y = 430): StageData['elements'][number] {
  return { type: 'shield', x, y };
}

function spawnGoal(width: number): { spawn: { x: number; y: number }; goal: { x: number; y: number } } {
  return { spawn: { x: 100, y: 420 }, goal: { x: width - 80, y: 420 } };
}

function stage(id: number, name: string, width: number, elements: StageData['elements'], opts?: { isCheckpointEnd?: boolean }): StageData {
  return {
    id,
    name,
    bouncePeriod: getBouncePeriod(id),
    width,
    height: 720,
    ...spawnGoal(width),
    elements,
    ...(opts?.isCheckpointEnd ? { isCheckpointEnd: true } : {}),
  };
}

// 스토리 B안 「마지막 픽셀 도트」 — 게임기 내부를 깊이 들어가는 4챕터.
// wall() 헬퍼는 v1.1 후보로 보존 (현재 스테이지에는 미배치, 화면 경계 벽은 엔진이 처리).
void wall;

const STAGES: StageData[] = [
  // ============== CHAPTER 1: 액정 평원 (1-5) ==============
  stage(1, '첫 신호', 1600, [
    floor(0, 1600),
    part(500), part(800), part(1100),
  ]),

  stage(2, '데드 픽셀', 1800, [
    floor(0, 800),
    floor(1000, 800),
    part(400), part(900, 380), part(1400),
  ]),

  stage(3, '끊어진 셀', 2000, [
    floor(0, 500),
    floor(700, 700),
    floor(1600, 400),
    part(350), part(600, 390), part(1000), part(1500, 390),
  ]),

  stage(4, '정전기 가시', 2000, [
    floor(0, 2000),
    spike(700),
    spike(1300),
    part(400), part(720, 330), part(1000), part(1320, 330),
  ]),

  stage(5, '액정 관문', 2200, [
    floor(0, 700),
    floor(900, 700),
    floor(1800, 400),
    spike(1100),
    spike(1900),
    part(500), part(800, 390), part(1120, 330), part(1500), part(1920, 330),
  ], { isCheckpointEnd: true }),

  // ============== CHAPTER 2: 기판 회로 (6-10) ==============
  stage(6, '삭은 동박', 2200, [
    floor(0, 700),
    floor(700, 600, 'fragile'),
    floor(1300, 900),
    part(400), part(900, 430), part(1100, 430), part(1700),
  ]),

  stage(7, '끊어진 배선', 2400, [
    floor(0, 500),
    floor(500, 200, 'fragile'),
    floor(700, 150),
    floor(850, 200, 'fragile'),
    floor(1050, 150),
    floor(1200, 200, 'fragile'),
    floor(1400, 1000),
    part(600, 430), part(950, 430), part(1300, 430), part(1800), part(2100),
  ]),

  stage(8, '공중 점퍼선', 2400, [
    floor(0, 700),
    floor(900, 300, 'fragile'),
    floor(1400, 1000),
    // 공중 부서지는 발판
    { type: 'floor', x: 700, y: 380, width: 220, variant: 'fragile' },
    { type: 'floor', x: 1170, y: 380, width: 220, variant: 'fragile' },
    part(400), part(810, 210), part(1280, 210), part(1050, 450), part(1800),
  ]),

  stage(9, '미세 납땜', 2600, [
    floor(0, 500),
    floor(700, 300, 'fragile'),
    floor(1000, 200),
    floor(1200, 200, 'fragile'),
    floor(1400, 250),
    floor(1700, 900),
    spike(1080),
    spike(1490),
    part(300), part(850, 430), part(1100, 330), part(1300, 430), part(1520, 330), part(2000),
  ]),

  stage(10, '회로 관문', 2800, [
    floor(0, 400),
    floor(550, 200),
    floor(750, 200, 'fragile'),
    floor(950, 200),
    floor(1150, 200, 'fragile'),
    floor(1350, 200),
    floor(1550, 250, 'fragile'),
    floor(1800, 1000),
    spike(620),
    spike(1010),
    spike(1820),
    part(300), part(640, 330), part(850, 430), part(1030, 330),
    part(1250, 430), part(1450), part(1840, 330), part(2200),
  ], { isCheckpointEnd: true }),

  // ============== CHAPTER 3: 콘덴서 지대 (11-15) ==============
  stage(11, '과전압 주의', 2600, [
    floor(0, 800),
    floor(800, 120, 'explosive'),
    floor(920, 1700),
    part(400), part(860, 370), part(1300), part(1800), part(2200),
  ]),

  stage(12, '연쇄 방전', 2800, [
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
    shieldItem(1100, 360),
  ]),

  stage(13, '좁은 절연 구간', 3000, [
    floor(0, 400),
    floor(450, 80, 'explosive'),
    floor(530, 120),
    floor(650, 80, 'explosive'),
    floor(730, 100, 'explosive'),
    floor(830, 120),
    floor(950, 80, 'explosive'),
    floor(1030, 120),
    floor(1150, 80, 'explosive'),
    floor(1230, 100),
    floor(1330, 80, 'explosive'),
    floor(1410, 120),
    floor(1530, 80, 'explosive'),
    floor(1610, 120),
    floor(1730, 80, 'explosive'),
    floor(1810, 1200),
    part(580, 430), part(880, 430), part(1080, 430), part(1270, 430),
    part(1450, 430), part(1660, 430), part(2200),
  ]),

  stage(14, '납땜 침 회랑', 3000, [
    floor(0, 700),
    floor(700, 300, 'fragile'),
    floor(1000, 200),
    floor(1200, 200, 'explosive'),
    floor(1400, 1600),
    ceilingSpike(550, 80),
    ceilingSpike(700, 80),
    ceilingSpike(1300, 80),
    ceilingSpike(1450, 80),
    part(400, 450), part(630, 450), part(1100), part(1380, 450), part(2000), part(2400),
    shieldItem(1700),
  ]),

  stage(15, '방전 관문', 3200, [
    floor(0, 350),
    floor(380, 150, 'fragile'),
    floor(530, 100, 'explosive'),
    floor(630, 150, 'fragile'),
    floor(780, 100),
    floor(880, 100, 'explosive'),
    floor(980, 250),
    floor(1230, 150, 'fragile'),
    floor(1380, 100, 'explosive'),
    floor(1480, 100, 'fragile'),
    floor(1580, 100, 'explosive'),
    floor(1680, 150),
    floor(1830, 100, 'explosive'),
    floor(1930, 250, 'fragile'),
    floor(2180, 1020),
    ceilingSpike(800, 80),
    ceilingSpike(950, 80),
    ceilingSpike(1100, 80),
    ceilingSpike(1700, 80),
    ceilingSpike(1850, 80),
    spike(1050),
    spike(2050),
    part(200), part(700, 450), part(1030, 330), part(1300, 430),
    part(1750, 450), part(2050, 330), part(2500), part(2900),
    shieldItem(450),
  ], { isCheckpointEnd: true }),

  // ============== CHAPTER 4: CPU 코어 (16-20) ==============
  stage(16, '오버클럭 입문', 3000, [
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
    part(200), part(680, 330), part(900, 430), part(1250), part(1750, 330), part(2300),
  ]),

  stage(17, '교차 버스', 3200, [
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
    ceilingSpike(620, 60),
    ceilingSpike(680, 60),
    ceilingSpike(880, 60),
    ceilingSpike(1080, 60),
    ceilingSpike(1280, 60),
    ceilingSpike(1340, 60),
    ceilingSpike(1580, 60),
    ceilingSpike(1880, 60),
    part(450, 460), part(700, 460), part(1100, 460), part(1600, 460), part(2300), part(2800),
    shieldItem(1900),
  ]),

  stage(18, '버스 폭주', 3400, [
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
    floor(1320, 100, 'explosive'),
    floor(1420, 100, 'fragile'),
    floor(1520, 100, 'explosive'),
    floor(1620, 100, 'fragile'),
    floor(1720, 100, 'explosive'),
    floor(1820, 100, 'explosive'),
    floor(1920, 100, 'fragile'),
    floor(2020, 100, 'explosive'),
    floor(2120, 100, 'fragile'),
    floor(2220, 1180),
    part(350, 430), part(800), part(1300), part(1800), part(2400), part(2800), part(3000),
    shieldItem(1170, 360),
  ]),

  stage(19, '마지막 연산', 3400, [
    floor(0, 280),
    floor(300, 80, 'explosive'),
    floor(380, 100, 'fragile'),
    floor(480, 80, 'explosive'),
    floor(560, 100, 'fragile'),
    floor(660, 80, 'explosive'),
    floor(740, 100),
    floor(840, 80, 'explosive'),
    floor(920, 100, 'fragile'),
    floor(1020, 80, 'explosive'),
    floor(1100, 80),
    floor(1180, 80, 'explosive'),
    floor(1260, 100, 'fragile'),
    // 큰 구멍 (1360~1600)
    floor(1600, 100, 'fragile'),
    floor(1700, 80, 'explosive'),
    floor(1780, 80, 'fragile'),
    floor(1860, 80, 'explosive'),
    floor(1940, 80, 'explosive'),
    floor(2020, 80, 'explosive'),
    floor(2100, 130),
    floor(2230, 80, 'fragile'),
    floor(2310, 130),
    floor(2440, 80, 'explosive'),
    floor(2520, 100, 'fragile'),
    floor(2620, 780),
    ceilingSpike(380, 60),
    ceilingSpike(540, 60),
    ceilingSpike(700, 60),
    ceilingSpike(900, 60),
    ceilingSpike(1080, 60),
    ceilingSpike(1240, 60),
    ceilingSpike(1700, 60),
    ceilingSpike(1880, 60),
    ceilingSpike(2060, 60),
    ceilingSpike(2240, 60),
    ceilingSpike(2420, 60),
    part(320, 450), part(800, 450), part(1150, 450), part(1450, 390),
    part(2150, 430), part(2700), part(3000),
    shieldItem(2350),
  ]),

  stage(20, '코어 점화', 3600, [
    floor(0, 250),
    floor(270, 80, 'explosive'),
    floor(350, 80, 'fragile'),
    floor(430, 80, 'explosive'),
    floor(510, 100),
    floor(610, 80, 'fragile'),
    floor(690, 80, 'explosive'),
    floor(770, 80, 'explosive'),
    floor(850, 80, 'fragile'),
    floor(930, 80, 'fragile'),
    floor(1010, 80, 'explosive'),
    // 큰 구멍 (1090~1340)
    floor(1340, 80, 'fragile'),
    floor(1420, 80, 'explosive'),
    floor(1500, 80, 'fragile'),
    floor(1580, 80, 'explosive'),
    floor(1660, 80, 'explosive'),
    floor(1740, 100),
    floor(1840, 80, 'fragile'),
    floor(1920, 80, 'explosive'),
    floor(2000, 100),
    floor(2100, 80, 'fragile'),
    floor(2180, 80, 'explosive'),
    floor(2260, 80, 'fragile'),
    floor(2340, 80, 'explosive'),
    floor(2420, 80, 'explosive'),
    floor(2500, 1100),
    ceilingSpike(280, 60),
    ceilingSpike(440, 60),
    ceilingSpike(600, 60),
    ceilingSpike(760, 60),
    ceilingSpike(920, 60),
    ceilingSpike(1080, 60),
    ceilingSpike(1400, 60),
    ceilingSpike(1560, 60),
    ceilingSpike(1720, 60),
    ceilingSpike(2100, 60),
    ceilingSpike(2260, 60),
    ceilingSpike(2420, 60),
    part(300, 450), part(560, 430), part(800, 450), part(1180, 390),
    part(1500, 450), part(1790, 430), part(2050), part(2700),
    shieldItem(1740, 360),
  ]),
];

export const STAGES_DATA: StagesFile = {
  version: 3,
  totalStages: STAGES.length,
  checkpoints: [1, 6, 11, 16],
  stages: STAGES,
};
