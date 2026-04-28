import type { ReactElement } from 'react';

import React, { createContext, useEffect, useState } from 'react';

import type {
  LoadableKey,
  LoadResult,
  ModuleLoader,
  LaceAddons,
  ContextualLoadableKey,
} from '@lace-contract/module';

const loadModulesContext = createContext<ModuleLoader | null>(null);

type LoadModulesProviderProps = {
  children: ReactElement;
  loadModules: ModuleLoader;
};

export const LoadModulesProvider = ({
  children,
  loadModules,
}: LoadModulesProviderProps) => (
  <loadModulesContext.Provider value={loadModules}>
    {children}
  </loadModulesContext.Provider>
);

export const useLoadModules = <
  Name extends LoadableKey,
  LoadedModules extends Awaited<LoadResult<Name>>,
>(
  name: Name,
) => {
  const loadModules = React.useContext(loadModulesContext);
  const [loadedModules, setLoadedModules] = useState<LoadedModules>();

  useEffect(() => {
    if (!loadModules) return;
    void loadModules(name).then(module => {
      setLoadedModules(module as LoadedModules);
    });
  }, [name, loadModules]);

  if (!loadModules) {
    throw new Error(
      `${useLoadModules.name} called outside of ${LoadModulesProvider.name}`,
    );
  }

  return loadedModules;
};

// Type-safe version of useLoadModules for specific contexts
export const createContextualUseLoadModules = <
  AvailableAddons extends Array<keyof LaceAddons>,
>() => {
  return <Name extends ContextualLoadableKey<AvailableAddons>>(name: Name) => {
    return useLoadModules(name);
  };
};
