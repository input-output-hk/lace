import { Runtime, runtime, storage } from 'webextension-polyfill';
import { checkMigrations } from '../migrations';
import { MigrationState } from '../types';
import { initMigrationState } from './storage';
import { logger } from '@lace/common';

const MAJOR_VERSION_REQUIRING_FEATURE_FLAG_RESET = 1;
const MINOR_VERSION_REQUIRING_FEATURE_FLAG_RESET = 35;

type V2FeatureFlagPayloads<T> = {
  [key: string]: {
    key: string;
    payload?: T;
  }[];
};

const hasPosthogAnalyticsFeatureFlag = (bgStorageItem: V2FeatureFlagPayloads<unknown>['featureFlags']) =>
  bgStorageItem.some((f) => f.key === 'ANALYTICS_POSTHOG');

// migrations
const checkMigrationsOnUpdate = async (details: Runtime.OnInstalledDetailsType) => {
  if (!!details.previousVersion && details.reason === 'update') {
    const [major, minor] = details.previousVersion.split('.').map((v) => Number(v));
    if (major === MAJOR_VERSION_REQUIRING_FEATURE_FLAG_RESET && minor >= MINOR_VERSION_REQUIRING_FEATURE_FLAG_RESET) {
      const bgStorage = (await storage.local.get('featureFlags')) as V2FeatureFlagPayloads<unknown>;
      if (!!bgStorage.featureFlags && !hasPosthogAnalyticsFeatureFlag(bgStorage.featureFlags)) {
        await storage.local.remove('featureFlags');
        runtime.reload();
      }
    }
  }

  logger.debug('[onUpdate] checking migration state:', details.reason, details.previousVersion);
  if (details.reason === 'update' || details.reason === 'install') {
    // Initialize migration state with not-loaded
    await initMigrationState();
    // Set migration state to up-to-date on install or check migrations on update
    !details.previousVersion
      ? await storage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } as MigrationState })
      : await checkMigrations(details.previousVersion);
  }
};

// Only add an event listener if it doesn't exist
if (!runtime.onInstalled.hasListener(checkMigrationsOnUpdate)) runtime.onInstalled.addListener(checkMigrationsOnUpdate);

const updateToVersionCallback = (details: Runtime.OnUpdateAvailableDetailsType) => {
  logger.debug(`[onUpdate] updating to version ${details.version}`);
  if (runtime.onUpdateAvailable.hasListener(updateToVersionCallback)) {
    runtime.onUpdateAvailable.removeListener(updateToVersionCallback);
  }
  runtime.reload();
};

if (!runtime.onUpdateAvailable.hasListener(updateToVersionCallback))
  // fires when the new .crx file has been downloaded and the new version is ready to be installed
  runtime.onUpdateAvailable.addListener(updateToVersionCallback);

// extensions will not auto-update while a background page is in use (which effectively means waiting until a browser restart
// forces the browser to check if your add-on has an update, rather than relying on the existing, automated check for updates
try {
  runtime.requestUpdateCheck();
} catch {
  // Firefox does not support this API
}
