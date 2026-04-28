/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useDeepCompareMemo,
  createContextualUseLoadModules,
} from '@lace-lib/util-render';
import { useEffect, useState } from 'react';

import type {
  LoadableKey,
  LoadResult,
  ContextualLoadableKey,
  LaceAddons,
} from '@lace-contract/module';
import type {
  SelectorParameterOfUICustomisation,
  UICustomisation,
} from '@lace-lib/util-render';
import type { Tagged } from 'type-fest';

const useLoadModules = createContextualUseLoadModules();

type ExtractCustomisationByKey<Key extends LoadableKey> = Awaited<
  LoadResult<Key>
>[number];

type AnyCustomization = Tagged<unknown, 'UICustomisation', any>;
type LoadableValues = {
  [K in LoadableKey]: ExtractCustomisationByKey<K>;
};
type RemoveIndex<T> = {
  [K in keyof T as string extends K ? never : K]: T[K];
};
type CustomisationKey = keyof RemoveIndex<{
  [K in keyof LoadableValues as LoadableValues[K] extends AnyCustomization
    ? K
    : never]: LoadableValues[K];
}>;

const areThoseValidCustomisations = <LoadedCustomisation>(
  loadedModules?: any[],
): loadedModules is LoadedCustomisation[] =>
  !!loadedModules && loadedModules.length > 0 && 'key' in loadedModules[0];

export const useUICustomisation = <
  Name extends CustomisationKey,
  LoadedCustomisation extends ExtractCustomisationByKey<Name>,
  RestParams extends SelectorParameterOfUICustomisation<LoadedCustomisation> extends void
    ? []
    : [SelectorParameterOfUICustomisation<LoadedCustomisation>],
>(
  name: Name,
  ...restParams: RestParams
) => {
  const loadedModules = useLoadModules(name);
  const [customisations, setCustomisations] = useState<LoadedCustomisation[]>(
    [],
  );

  const selector = useDeepCompareMemo(restParams[0]);

  useEffect(() => {
    if (!areThoseValidCustomisations<LoadedCustomisation>(loadedModules)) {
      return;
    }

    const canRunSelector =
      loadedModules.every(c => 'uiCustomisationSelector' in c) &&
      restParams.length === 1;

    if (!canRunSelector) {
      setCustomisations(loadedModules);
      return;
    }

    const selectedCustomisations = (
      loadedModules as UICustomisation<object, unknown>[]
    ).filter(({ uiCustomisationSelector }) =>
      uiCustomisationSelector(selector),
    );

    setCustomisations(selectedCustomisations as LoadedCustomisation[]);
  }, [loadedModules, selector]);

  return customisations;
};

// Type-safe version of useUICustomisation for specific contexts
export const createContextualUseUICustomisation = <
  AvailableAddons extends Array<keyof LaceAddons>,
>() => {
  return <
    Name extends ContextualLoadableKey<AvailableAddons> & CustomisationKey,
    LoadedCustomisation extends ExtractCustomisationByKey<Name>,
    RestParams extends SelectorParameterOfUICustomisation<LoadedCustomisation> extends void
      ? []
      : [SelectorParameterOfUICustomisation<LoadedCustomisation>],
  >(
    name: Name,
    ...restParams: RestParams
  ) => {
    return useUICustomisation(name, ...restParams);
  };
};
