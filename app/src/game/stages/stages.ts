import type { StagesFile, StageData } from '../../utils/types';
import { getBouncePeriod } from '../entities/Ball';

const FLOOR_Y = 600;
const GROUND_LEVEL = 600;

function floor(x: number, w: number, variant: 'normal' | 'fragile' | 'explosive' = 'normal'): StageData['elements'][number] {
  return { type: 'floor', x, y: FLOOR_Y, width: w, variant };
}
function spike(x: number, w = 40): StageData['elements'][number] {
  return { type: 'spike', x, y: GROUND_LEVEL, width: w };
}
function ceilingSpike(x: number, w = 60, y = 60): StageData['elements'][number] {
  return { type: 'ceiling_spike', x, y, width: w };
}
function wall(x: number, h = 600, y = 0, w = 8): StageData['elements'][number] {
  return { type: 'wall', x, y, width: w, height: h };
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

const STAGES: StageData[] = [
  // ============== CHAPTER 1: TUTORIAL (1-5) ==============
  stage(1, '첫 발걸음', 1600, [floor(0, 1600)]),

  stage(2, '첫 구멍', 1800, [
    floor(0, 800),
    floor(1000, 800),
  ]),

  stage(3, '두 번째 구멍', 2000, [
    floor(0, 500),
    floor(700, 700),
    floor(1600, 400),
  ]),

  stage(4, '첫 가시', 2000, [
    floor(0, 2000),
    spike(700),
    spike(1300),
  ]),

  stage(5, '조합 첫 단계', 2200, [
    floor(0, 700),
    floor(900, 700),
    floor(1800, 400),
    spike(1100),
    spike(1900),
  ], { isCheckpointEnd: true }),

  // ============== CHAPTER 2: BASIC (6-10) ==============
  stage(6, '부서지는 바닥 등장', 2200, [
    floor(0, 700),
    floor(700, 600, 'fragile'),
    floor(1300, 900),
  ]),

  stage(7, '부서지는 바닥 연속', 2400, [
    floor(0, 500),
    floor(500, 200, 'fragile'),
    floor(700, 150),
    floor(850, 200, 'fragile'),
    floor(1050, 150),
    floor(1200, 200, 'fragile'),
    floor(1400, 1000),
  ]),

  stage(8, '공중 부서지는 발판', 2400, [
    floor(0, 700),
    floor(900, 300, 'fragile'),
    floor(1400, 1000),
    // 공중 부서지는 발판
    { type: 'floor', x: 700, y: 380, width: 220, variant: 'fragile' },
    { type: 'floor', x: 1170, y: 380, width: 220, variant: 'fragile' },
  ]),

  stage(9, '정밀 조작 입문', 2600, [
    floor(0, 500),
    floor(700, 300, 'fragile'),
    floor(1000, 200),
    floor(1200, 200, 'fragile'),
    floor(1400, 250),
    floor(1700, 900),
    spike(1080),
    spike(1490),
  ]),

  stage(10, '챕터 2 보스', 2800, [
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
  ], { isCheckpointEnd: true }),

  // ============== CHAPTER 3: APPLIED (11-15) ==============
  stage(11, '폭발 발판 등장', 2600, [
    floor(0, 800),
    floor(800, 120, 'explosive'),
    floor(920, 1700),
  ]),

  stage(12, '폭발 + 부서짐', 2800, [
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
  ]),

  stage(13, '좁은 안전 구간', 3000, [
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
  ]),

  stage(14, '공중 가시', 3000, [
    floor(0, 700),
    floor(700, 300, 'fragile'),
    floor(1000, 200),
    floor(1200, 200, 'explosive'),
    floor(1400, 1600),
    ceilingSpike(550, 80),
    ceilingSpike(700, 80),
    ceilingSpike(1300, 80),
    ceilingSpike(1450, 80),
  ]),

  stage(15, '챕터 3 보스', 3200, [
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
  ], { isCheckpointEnd: true }),

  // ============== CHAPTER 4: MASTER (16-20) ==============
  stage(16, '마스터 입문', 3000, [
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
  ]),

  stage(17, '교차 패턴', 3200, [
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
  ]),

  stage(18, '지옥의 회랑', 3400, [
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
  ]),

  stage(19, '최종 시험', 3400, [
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
    // 큰 구멍
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
  ]),

  stage(20, '그랜드 마스터', 3600, [
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
    // 큰 구멍
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
  ]),
];

export const STAGES_DATA: StagesFile = {
  version: 2,
  totalStages: STAGES.length,
  checkpoints: [1, 6, 11, 16],
  stages: STAGES,
};
