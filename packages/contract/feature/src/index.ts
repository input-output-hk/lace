import './augmentations';

export type { FeaturesSliceState, FeaturesStoreState } from './store';
export { featuresActions, featuresSelectors } from './store';
export type * from './types';
export * from './util';
export * from './value-objects';
export * from './const';
export * from './contract';

export const loadCreateFeatureFlagStorage = async () => {
  const { createFeatureFlagStorage } = await import('./util');
  return createFeatureFlagStorage;
};
