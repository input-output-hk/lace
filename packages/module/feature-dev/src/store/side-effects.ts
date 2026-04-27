import { toEmpty } from '@cardano-sdk/util-rxjs';
import { isAnyOf } from '@reduxjs/toolkit';
import { filter, tap } from 'rxjs';

import { setFeatureFlags } from './actions';

import type { SideEffect } from '..';
import type { FeatureFlagsObservableType } from './dependencies';

const updateFeatureFlags: SideEffect = (
  { featureDev: { setFeatureFlags$ } },
  _,
  { featureFlags$ },
) =>
  setFeatureFlags$.pipe(
    // action param provided explicitly to ensure proper type inference
    filter(action => isAnyOf(setFeatureFlags)(action)),
    tap(({ payload }) => {
      (featureFlags$ as FeatureFlagsObservableType).next(payload);
    }),
    toEmpty,
  );

export const featureSideEffects: SideEffect[] = [updateFeatureFlags];
