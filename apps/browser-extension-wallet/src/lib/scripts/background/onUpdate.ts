import { Runtime, runtime, storage } from 'webextension-polyfill';
import { initMigrationState } from './util';
import { checkMigrations } from '../migrations';
import { ABOUT_EXTENSION_KEY, ExtensionUpdateData, MigrationState } from '../types';

type UpdateType = 'downgrade' | 'update';

// migrations
const checkMigrationsOnUpdate = async (details: Runtime.OnInstalledDetailsType) => {
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
  const { version: currentVersion } = runtime.getManifest();

  const { aboutExtension } = (await storage.local.get(ABOUT_EXTENSION_KEY)) || {};
  const previousVersion = aboutExtension?.version;

  if (reason === 'update' && currentVersion !== previousVersion) {
    const updateType: UpdateType = compareVersions(currentVersion, previousVersion) < 0 ? 'downgrade' : 'update';

    await storage.local.set({
      [ABOUT_EXTENSION_KEY]: { version: currentVersion, acknowledged: false, reason: updateType } as ExtensionUpdateData
    });

    console.log('extension got updated due to reason:', updateType);
  }
};

// Only add an event listener if it doesn't exist
if (!runtime.onInstalled.hasListener(displayReleaseAnnouncements))
  runtime.onInstalled.addListener(displayReleaseAnnouncements);
if (!runtime.onInstalled.hasListener(checkMigrationsOnUpdate)) runtime.onInstalled.addListener(checkMigrationsOnUpdate);
