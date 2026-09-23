import type { Tagged } from 'type-fest';

export type RealFiStakeId = Tagged<string, 'RealFiStakeId'>;
export const RealFiStakeId = (value: string): RealFiStakeId =>
  value as RealFiStakeId;
