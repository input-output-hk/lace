import type { Tagged } from 'type-fest';

export type FeatureId = Tagged<string, 'FeatureId'>;
export const FeatureId = (value: string) => value as FeatureId;

export const FeatureIds = {
  BUY_FLOW: FeatureId('buy-flow'),
  DAPP_EXPLORER: FeatureId('dapp-explorer'),
  SWAP_CENTER: FeatureId('swap-center'),
} as const;
