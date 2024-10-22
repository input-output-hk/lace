/* eslint-disable no-console */
import { runtime, tabs } from 'webextension-polyfill';
import { State as MigrationData } from '../migrator/migration-data.data';
import { MigrationState } from '../migrator/migration-state.data';
import { LaceMessages } from './shared/types';
import { createLaceMigrationPingListener } from './lace/create-lace-migration-ping-listener';
import { NAMI_EXTENSION_ID } from './lace/environment';
import { createLaceMigrationOpenListener } from './lace/create-lace-migration-open-listener';
import { LACE_EXTENSION_ID } from './nami/environment';

type CheckMigrationStatus = () => Promise<MigrationState>;

export const checkMigrationStatus: CheckMigrationStatus = () => {
  const message: LaceMessages = { type: 'status' };

  return runtime.sendMessage(NAMI_EXTENSION_ID, message);
};

type RequestMigrationData = () => Promise<MigrationData>;

export const requestMigrationData: RequestMigrationData = () => {
  const message: LaceMessages = { type: 'data' };
  return runtime.sendMessage(NAMI_EXTENSION_ID, message);
};

type AbortMigration = () => Promise<void>;

export const abortMigration: AbortMigration = () => {
  const message: LaceMessages = { type: 'abort' };
  return runtime.sendMessage(NAMI_EXTENSION_ID, message);
};

type CompleteMigration = () => Promise<void>;

export const completeMigration: CompleteMigration = () => {
  const message: LaceMessages = { type: 'completed' };
  return runtime.sendMessage(NAMI_EXTENSION_ID, message);
};

export const handleNamiRequests = (): void => {
  console.log('[NAMI MIGRATION] createLaceMigrationPingListener');
  runtime.onMessageExternal.addListener(createLaceMigrationPingListener(NAMI_EXTENSION_ID));
  console.log('[NAMI MIGRATION] createLaceMigrationOpenListener');
  runtime.onMessageExternal.addListener(
    createLaceMigrationOpenListener(NAMI_EXTENSION_ID, LACE_EXTENSION_ID, tabs.create)
  );
};
