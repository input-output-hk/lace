import { waitForState } from '@lace-contract/dev';

import { setFeatureFlags } from './store/actions';

import type { AvailableAddons } from '.';
import type { DevelopmentGlobalApi } from '@lace-contract/dev';
import type { FeatureFlag } from '@lace-contract/feature';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { InitializeExtensionView } from '@lace-contract/views';

const equalsUnorderedFeatureFlags = (
  array1?: FeatureFlag[],
  array2?: FeatureFlag[],
): boolean => {
  if (array1 === undefined || array2 === undefined) return false;

  const sortedArray1 = [...array1].sort((a, b) => a.key.localeCompare(b.key));
  const sortedArray2 = [...array2].sort((a, b) => a.key.localeCompare(b.key));

  return (
    sortedArray1.length === sortedArray2.length &&
    sortedArray1.every((item, index) => item.key === sortedArray2[index].key)
  );
};

const initializeExtensionView: ContextualLaceInit<
  InitializeExtensionView,
  AvailableAddons
> = () => store => {
  const api = window as unknown as DevelopmentGlobalApi;
  api.setFeatureFlags = async featureFlags => {
    store.dispatch(setFeatureFlags(featureFlags));
    await waitForState(
      state =>
        equalsUnorderedFeatureFlags(
          state.features.loaded.featureFlags,
          featureFlags,
        ) ||
        equalsUnorderedFeatureFlags(
          state.features.next?.features.featureFlags,
          featureFlags,
        ),
      store,
    );
  };
};

export default initializeExtensionView;
