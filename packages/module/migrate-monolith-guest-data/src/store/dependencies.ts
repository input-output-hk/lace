import { hasLaceCapability } from '@lace-lib/extension-shell-client';
import { from } from 'rxjs';

import {
  pullMonolithGuestData,
  reportMonolithGuestDataImported,
} from '../lace-client';

import type { MigrateMonolithGuestDataDependencies } from '../augmentations';

/**
 * Wrap the two host calls as Observables (ADR 19) and snapshot the capability
 * PAIR once at store init (ADR 41 handshake — the dapp-connector-host-pull
 * pattern): an older host missing either one makes the import a silent no-op.
 */
export const initializeDependencies =
  (): MigrateMonolithGuestDataDependencies => ({
    canMigrateMonolithGuestData:
      hasLaceCapability('settings.migrateMonolithGuestData') &&
      hasLaceCapability('settings.migrateMonolithGuestDataDone'),
    pullMonolithGuestData: () => from(pullMonolithGuestData()),
    completeMonolithGuestDataMigration: () =>
      from(reportMonolithGuestDataImported()),
  });
