import { Runtime, runtime, storage } from 'webextension-polyfill';
import { checkMigrations } from '../migrations';
import { ABOUT_EXTENSION_KEY, ExtensionUpdateData, MigrationState } from '../types';
import { initMigrationState } from './storage';
import { logger } from '@lace/common';

type UpdateType = 'downgrade' | 'update';

// migrations
const checkMigrationsOnUpdate = async (details: Runtime.OnInstalledDetailsType) => {
  logger.info('[onUpdate] checking migration state:', details.reason, details.previousVersion);
  if (details.reason === 'update' || details.reason === 'install') {
    // Initialize migration state with not-loaded
    await initMigrationState();
    // Set migration state to up-to-date on install or check migrations on update
    !details.previousVersion
      ? await storage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } as MigrationState })
      : await checkMigrations(details.previousVersion);
  }
};

const compareVersions = (v1 = '', v2 = '') => v1.localeCompare(v2, undefined, { numeric: true, sensitivity: 'base' });

// extension updates announcements
const displayReleaseAnnouncements = async ({ reason }: Runtime.OnInstalledDetailsType) => {
  logger.info('[onUpdate] checking for updates:', reason);
  const { version: currentVersion } = runtime.getManifest();

  const { aboutExtension } = (await storage.local.get(ABOUT_EXTENSION_KEY)) || {};
  const previousVersion = aboutExtension?.version;

  logger.info('[onUpdate] checking for updates:', previousVersion, currentVersion);
  if (reason === 'update' && currentVersion !== previousVersion) {
    const updateType: UpdateType = compareVersions(currentVersion, previousVersion) < 0 ? 'downgrade' : 'update';

    await storage.local.set({
      [ABOUT_EXTENSION_KEY]: { version: currentVersion, acknowledged: false, reason: updateType } as ExtensionUpdateData
    });

    logger.info('[onUpdate] extension got updated due to reason:', updateType);
  }
};

// Only add an event listener if it doesn't exist
if (!runtime.onInstalled.hasListener(displayReleaseAnnouncements))
  runtime.onInstalled.addListener(displayReleaseAnnouncements);
if (!runtime.onInstalled.hasListener(checkMigrationsOnUpdate)) runtime.onInstalled.addListener(checkMigrationsOnUpdate);

const updateToVersionCallback = (details: Runtime.OnUpdateAvailableDetailsType) => {
  logger.info(`[onUpdate] updating to version ${details.version}`);
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
runtime.requestUpdateCheck();
