import { createRouterMiddleware } from '@lace-contract/views';

import { initializeDependencies } from './dependencies';
import { createExtensionViewsHistory } from './extension-views-history';
import { initializeSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

export type { ViewsExtensionDependencies } from './dependencies';

const redux: LaceInit<LaceModuleStoreInit> = (props, dependencies) => {
  const sideEffectDependencies = initializeDependencies(props, dependencies);
  return {
    sideEffects: initializeSideEffects(props, dependencies),
    middleware: [
      createRouterMiddleware(
        createExtensionViewsHistory(
          sideEffectDependencies,
          dependencies.logger,
        ),
      ),
    ],
    sideEffectDependencies,
  };
};

export default redux;
