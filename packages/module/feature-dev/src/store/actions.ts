import { createAction } from '@reduxjs/toolkit';

import type { FeatureFlag } from '@lace-contract/feature';

export const setFeatureFlags = createAction(
  'featureDev/setFeatureFlags',
  (payload: FeatureFlag[]) => ({ payload }),
);
