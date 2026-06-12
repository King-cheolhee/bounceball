import type { StageData } from '../../utils/types';
import { STAGES_DATA } from './stages';

export function getStage(id: number): StageData | null {
  return STAGES_DATA.stages.find((s) => s.id === id) ?? null;
}

export function getTotalStages(): number {
  return STAGES_DATA.totalStages;
}

export function getCheckpoints(): number[] {
  return STAGES_DATA.checkpoints.slice();
}
