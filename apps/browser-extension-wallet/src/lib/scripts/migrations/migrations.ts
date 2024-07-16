/* eslint-disable sonarjs/no-duplicate-string */
import { runtime, storage } from 'webextension-polyfill';
import pRetry from 'p-retry';
import { MigrationState } from '../types';
import { compareVersions, isVersionNewerThan, isVersionOlderThanOrEqual } from './util';
import * as versions from './versions';

const MIGRATIONS_RETRIES = 4; // 5 attempts = first attempt + 4 retries

export interface MigrationPersistance {
  /**
   * Executed at the start of the migration
   *
   * Prepares storage with temporary data for the migration
   */
  prepare: () => void | Promise<void>;
  /**
   * Executed after a successful migration preparation
   *
   * It retrieves the temporary storage and runs some checks on it
   */
  assert: () => boolean | Promise<boolean>;
  /**
   * Executed after a successful migration assertion
   *
   * It retrieves the temporary storage, replaces the actual storage with it and finally clears the temporary storage
   */
  persist: () => void | Promise<void>;
  /**
   * Executed when prepare, assert or persist fails.
   *
   * It restores the actual storage to its original value before the migration and clears the temporary storage
   */
  rollback: () => void | Promise<void>;
}

export type Migration = {
  version: string;
  requiresPassword?: () => boolean | Promise<boolean>;
  shouldSkip?: () => boolean | Promise<boolean>;
  upgrade: (password?: string) => MigrationPersistance | Promise<MigrationPersistance>;
  // TODO: allow downgrades and make it mandatory [LW-5595]
  downgrade?: (password?: string) => MigrationPersistance | Promise<MigrationPersistance>;
};

const migrations: Migration[] = [versions.v_1_10_2];

/**
 * Applies all migrations in order between the two version provided
 */
export const applyMigrations = async (
  migrationState: MigrationState,
  password?: string,
  migrationsArray = migrations
): Promise<void> => {
  if (migrationState.state !== 'not-applied' && migrationState.state !== 'migrating') return;
  try {
    await storage.local.set({
      MIGRATION_STATE: { ...migrationState, state: 'migrating' } as MigrationState
    });

    // TODO: allow downgrades too [LW-5595]
    // Find migrations between versions to migrate and make sure they are in the correct order
    const upgradeMigrationsToApply = migrationsArray
      .filter(
        (migration) =>
          isVersionNewerThan(migration.version, migrationState.from) &&
          isVersionOlderThanOrEqual(migration.version, migrationState.to)
      )
      .sort((a, b) => compareVersions(a.version, b.version));

    // Apply all upgrades in order
    for (const migration of upgradeMigrationsToApply) {
      await pRetry(
        async (attemptNumber) => {
          console.info(`Applying migration for version ${migration.version} (attempt: ${attemptNumber})`);
          const shouldSkip = await migration.shouldSkip?.();
          if (shouldSkip) return;
          const { prepare, assert, persist, rollback } = await migration.upgrade(password);
          try {
            await prepare();
            await assert();
            await persist();

            // Set last successful migration
            await storage.local.set({
              MIGRATION_STATE: { ...migrationState, from: migration.version, state: 'migrating' } as MigrationState
            });
          } catch (error) {
            await rollback();
            // Throw and retry
            throw error;
          }
        },
        {
          minTimeout: 0,
          retries: MIGRATIONS_RETRIES,
          onFailedAttempt: (error) =>
            console.error(
              `Migration attempt ${error.attemptNumber} for ${migration.version} upgrade failed. There are ${error.retriesLeft} retries left.`
            )
        }
      );
    }
    // Update migration state when finished to indicate that no migrations need to be applied anymore
    await storage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } as MigrationState });
    // Reload app states with updated storage
    window.location.reload();
  } catch (error) {
    console.error('Error applying migrations:', error);
    await storage.local.set({
      MIGRATION_STATE: { ...migrationState, state: 'error' } as MigrationState
    });
  }
};

/**
 * Checks if any of the migrations between the two versions provided requires password
 */
export const migrationsRequirePassword = async (
  migrationState: MigrationState,
  migrationsArray = migrations
): Promise<boolean> => {
  if (migrationState.state !== 'not-applied' && migrationState.state !== 'migrating') return false;
  const upgradeMigrationsToApply = migrationsArray.filter(
    (migration) =>
      isVersionNewerThan(migration.version, migrationState.from) &&
      isVersionOlderThanOrEqual(migration.version, migrationState.to)
  );

  // Runs all `requiresPassword` functions for all migrations and check if some returns true
  return (await Promise.all(upgradeMigrationsToApply.map(async (mig) => mig.requiresPassword?.()))).includes(true);
};

/**
 * Checks if a migration is needed between current and previous version and sets MIGRATION_STATE storage accordingly
 */
export const checkMigrations = async (previousVersion: string, migrationsArray = migrations): Promise<void> => {
  const currentVersion = runtime.getManifest().version;
  // Return if a downgrade is occurring
  if (isVersionOlderThanOrEqual(currentVersion, previousVersion)) {
    // TODO: allow migrations if downgrading versions too [LW-5595]
    await storage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } as MigrationState });
    return;
  }
  // Find migrations between versions
  const migrationsToApply = migrationsArray.filter(
    (migration) =>
      isVersionNewerThan(migration.version, previousVersion) &&
      isVersionOlderThanOrEqual(migration.version, currentVersion)
  );

  // If so, then set storage with version migration data
  migrationsToApply.length > 0
    ? await storage.local.set({
        MIGRATION_STATE: {
          from: previousVersion,
          to: currentVersion,
          state: 'not-applied'
        } as MigrationState
      })
    : await storage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } as MigrationState });
};
