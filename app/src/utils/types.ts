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
  goal: { x: number; y: number };
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
