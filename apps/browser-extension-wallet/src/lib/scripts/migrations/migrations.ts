/* eslint-disable sonarjs/no-duplicate-string */
import { runtime, storage } from 'webextension-polyfill';
import findLast from 'lodash/findLast';
import pRetry from 'p-retry';
import { MigrationState } from '../types';
import {
  compareVersions,
  isVersionEqual,
  isVersionNewerThan,
  isVersionNewerThanOrEqual,
  isVersionOlderThan,
  isVersionOlderThanOrEqual
} from './util';
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
  downgrade: ((password?: string) => MigrationPersistance | Promise<MigrationPersistance>) | null;
};

const migrations: Migration[] = [versions.v0_6_0, versions.v_1_0_0];

/**
 * Find migrations between versions to migrate and make sure they are in the correct order
 */
export const getMigrationsBetween = (
  fromVersion: string,
  toVersion: string,
  migrationsArray: Migration[] = migrations
): Migration[] => {
  if (isVersionEqual(toVersion, fromVersion)) return [];

  const sortedMigrationsAsc = [...migrationsArray].sort((a, b) => compareVersions(a.version, b.version));

  const isUpgrade = isVersionNewerThan(toVersion, fromVersion);
  if (!isUpgrade) {
    // Finds previous version with a migration
    // For example, if downgrading from 2.0.0 to 1.5.0, but we have migrations = [1.0.0, 2.0.0], it should run the 1.0.0 one
    toVersion = findLast(sortedMigrationsAsc, (mig) => isVersionOlderThanOrEqual(mig.version, toVersion))?.version;
  }

  // Find migrations between versions
  const foundMigrationsAsc = sortedMigrationsAsc.filter((migration) =>
    isUpgrade
      ? isVersionNewerThan(migration.version, fromVersion) && isVersionOlderThanOrEqual(migration.version, toVersion)
      : isVersionOlderThan(migration.version, fromVersion) && isVersionNewerThanOrEqual(migration.version, toVersion)
  );

  return isUpgrade ? foundMigrationsAsc : foundMigrationsAsc.reverse();
};

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

    const migrationsToApply = getMigrationsBetween(migrationState.from, migrationState.to, migrationsArray);
    const isUpgrade = isVersionNewerThan(migrationState.to, migrationState.from);

    // Apply all migrations in order
    for (const migration of migrationsToApply) {
      await pRetry(
        async (attemptNumber) => {
          console.log(`Applying migration for version ${migration.version} (attempt: ${attemptNumber})`);
          const shouldSkip = (await migration.shouldSkip?.()) || (!isUpgrade && migration.downgrade === null);
          if (shouldSkip) {
            console.log(`Skipping migration for version ${migration.version}`);
            return;
          }

          const { prepare, assert, persist, rollback } = await (isUpgrade
            ? migration.upgrade(password)
            : migration.downgrade(password));
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
            console.log(
              `Migration attempt ${error.attemptNumber} for ${migration.version} failed. There are ${error.retriesLeft} retries left.`
            )
        }
      );
    }
    // Update migration state when finished to indicate that no migrations need to be applied anymore
    await storage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } as MigrationState });
    // Reload app states with updated storage
    window.location.reload();
  } catch (error) {
    console.log('Error applying migrations:', error);
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

  const migrationsToApply = getMigrationsBetween(migrationState.from, migrationState.to, migrationsArray);
  // Runs all `requiresPassword` functions for all migrations and check if some returns true
  return (await Promise.all(migrationsToApply.map(async (mig) => mig.requiresPassword?.()))).includes(true);
};

/**
 * Checks if a migration is needed between current and previous version and sets MIGRATION_STATE storage accordingly
 */
export const checkMigrations = async (previousVersion: string, migrationsArray = migrations): Promise<void> => {
  const currentVersion = runtime.getManifest().version;

  if (isVersionEqual(currentVersion, previousVersion)) {
    await storage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } as MigrationState });
    return;
  }

  const migrationsToApply = getMigrationsBetween(previousVersion, currentVersion, migrationsArray);
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
