export type ElementType = 'floor' | 'spike' | 'ceiling_spike' | 'wall' | 'part' | 'shield';
export type FloorVariant = 'normal' | 'fragile' | 'explosive';

export interface StageElement {
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  variant?: FloorVariant;
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
