import {
  initLaceContext,
  loadedActionCreators,
  loadedSelectors,
} from '@lace-contract/module';

import { initializeStore } from './util';

import type { LaceStore } from './util';
import type { ModuleInitProps, ViewId } from '@lace-contract/module';

export type Init = {
  store: LaceStore;
  moduleInitProps: ModuleInitProps;
};

export const loadMobileScript = async (viewId: ViewId): Promise<Init> => {
  const [store, moduleInitProps] = await initializeStore(viewId);
  const initializers = await moduleInitProps.loadModules(
    'addons.loadInitializeMobileView',
  );

  // PERF: this might delay rendering longer than necessary;
  // may want to render a loader while modules/i18n are loading
  await initLaceContext(moduleInitProps.loadModules);
  await Promise.all(
    initializers.map(async init =>
      init(store, {
        selectors: loadedSelectors,
        actions: loadedActionCreators,
      }),
    ),
  );

  return { store, moduleInitProps };
};
