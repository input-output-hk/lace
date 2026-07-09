import { runInitializers } from '@lace-contract/app';
import {
  createReduxPersistStorage,
  createStore,
  findStorageModule,
} from '@lace-contract/module';
import {
  applySidePanelBehavior,
  DEFAULT_OPEN_MODE,
  isSidePanelApiAvailable,
} from '@lace-contract/views';
import { devToolsEnhancer } from '@redux-devtools/remote';

import {
  createExtensionModuleLoader,
  ENV,
  logger,
  readDefaultOpenMode,
} from '../util';

import { handleActionClick } from './action-click-handler';
import { createRemoteStore } from './create-remote-store';
import { exposeAPIs } from './expose-apis';

import type { FeatureFlagApi } from '../util';
import type { DefaultOpenMode } from '@lace-contract/views';

// MV3 only dispatches events to listeners registered before the SW script
// hits its first await. If `chrome.action.onClicked.addListener` is registered
// after an await, the click that woke the SW is dropped — the user has to
// click again once boot finishes. Everything in this top section therefore
// runs synchronously, before the awaits below.

// In-memory mirror of the persisted preference, refreshed from
// chrome.storage.local on every click and at SW boot. Initialised to the
// contract's default so the first click after boot has *some* value to use
// if the storage read somehow fails. See ADR 26.
//
// We deliberately do NOT subscribe to chrome.storage.onChanged here: that
// listener would fire on every chrome.storage.local write (including
// redux-persist's), resetting the SW idle timer and preventing it from going
// dormant. The popup updates Chrome's setPanelBehavior itself after writing,
// so cross-context propagation does not require an SW listener.
const cachedDefaultOpenMode: { current: DefaultOpenMode } = {
  current: DEFAULT_OPEN_MODE,
};

const openLaceTab = async () => {
  try {
    const indexUrl = chrome.runtime.getURL('expo/index.html');
    const existing = await chrome.tabs.query({ url: `${indexUrl}*` });
    if (existing[0]?.id !== undefined) {
      await chrome.tabs.update(existing[0].id, { active: true });
      if (existing[0].windowId !== undefined) {
        await chrome.windows.update(existing[0].windowId, { focused: true });
      }
      return;
    }
    await chrome.tabs.create({ url: 'expo/index.html', active: true });
  } catch (error) {
    logger.error('Failed to open Lace tab', error);
  }
};

const refreshFromStorage = async (): Promise<DefaultOpenMode> => {
  const mode = await readDefaultOpenMode();
  cachedDefaultOpenMode.current = mode;
  // Fire-and-forget: handleActionClick decides what to open by reading
  // cachedDefaultOpenMode (just assigned above), not Chrome's setPanelBehavior
  // state, so the click can be handled before this Promise settles.
  applySidePanelBehavior(mode)?.catch((error: unknown) => {
    logger.error('Failed to update side panel behavior', error);
  });
  return mode;
};

// Kick off the initial read synchronously so Chrome's setPanelBehavior is
// reconciled at boot (in case the popup was unable to update it the last
// time the user changed mode).
void refreshFromStorage().catch((error: unknown) => {
  logger.error('Failed to read defaultOpenMode from storage', error);
});

chrome.action.onClicked.addListener(tab => {
  void (async () => {
    // Re-read on every click so popup-side changes propagate without a
    // chrome.storage.onChanged subscription (which would keep the SW alive).
    // The await preserves the user-gesture window — chrome.storage reads
    // typically resolve in well under a millisecond.
    await refreshFromStorage().catch(() => cachedDefaultOpenMode.current);
    await handleActionClick(
      {
        isSidePanelApiAvailable,
        getStoredDefaultOpenMode: () => cachedDefaultOpenMode.current,
        openLaceTab,
        openSidePanel: async windowId => chrome.sidePanel.open({ windowId }),
        logger,
      },
      tab,
    );
  })();
});

const {
  loadModules,
  featureFlags: loadedFeatureFlags,
  ...moduleInitProps
} = await createExtensionModuleLoader();

const storageModule = await findStorageModule(moduleInitProps, { logger });
const reduxPersistStorage = createReduxPersistStorage(storageModule);

const initializers = await loadModules('addons.loadInitializeAppContext');
await runInitializers(initializers);

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

const featureFlags: FeatureFlagApi = {
  getFeatureFlags: async () => loadedFeatureFlags,
};

exposeAPIs({ remoteStore, featureFlags }, { logger });
