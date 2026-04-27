import {
  createReduxPersistStorage,
  createStore,
  findStorageModule,
} from '@lace-contract/module';
import { devToolsEnhancer } from '@redux-devtools/remote';

import { createExtensionModuleLoader, ENV, logger } from '../util';

import { createRemoteStore } from './create-remote-store';
import { exposeAPIs } from './expose-apis';

import type { FeatureFlagApi } from '../util';

const {
  loadModules,
  featureFlags: loadedFeatureFlags,
  ...moduleInitProps
} = await createExtensionModuleLoader();

const storageModule = await findStorageModule(moduleInitProps, { logger });
const reduxPersistStorage = createReduxPersistStorage(storageModule);

const initializers = await loadModules('addons.loadInitializeAppContext');
for (const init of initializers) {
  init();
}

const { store } = await createStore(
  {
    loadModules,
    runtime: moduleInitProps.runtime,
    /**
     * @realtime - connects to the devtools server on ws://localhost:8000 automatically
     * @maxAge - limits the number of state snapshots kept in devtools history;
     *   the default (30) causes "Message was too big to process" errors because
     *   the serialized lifted state exceeds the SocketCluster 100 MB payload limit
     */
    lastEnhancer:
      ENV === 'development'
        ? devToolsEnhancer({ realtime: true, maxAge: 15 })
        : undefined,
  },
  { logger, reduxPersistStorage },
);
const remoteStore = createRemoteStore(store);

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

const featureFlags: FeatureFlagApi = {
  getFeatureFlags: async () => loadedFeatureFlags,
};

exposeAPIs({ remoteStore, featureFlags }, { logger });
