import { runtime } from 'webextension-polyfill';
import * as laceMigrationClient from '@xsy/nami-migration-tool/dist/cross-extension-messaging/lace-migration-client.extension';
import { MigrationState } from '@xsy/nami-migration-tool/dist/migrator/migration-state.data';
import { walletRepository, walletManager, getBaseDbName } from './wallet';

import { run, CollateralRepository } from './nami-migration-runner';
import { currencyCode } from '@providers/currency/constants';
import { exposeApi, getWalletStoreId, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { storage } from '@cardano-sdk/wallet';
import { of } from 'rxjs';

const collateralRepository: CollateralRepository = async ({ utxo, chainId, walletId, accountIndex }) => {
  const walletStoreId = getWalletStoreId(walletId, chainId, accountIndex);
  const baseDbName = getBaseDbName(walletStoreId);
  const db = new storage.PouchDbUtxoStore({ dbName: `${baseDbName}UnspendableUtxo` }, console);
  db.setAll([utxo]);
};

const startMigration = async () => {
  const state = await laceMigrationClient.requestMigrationData();

  await run({ walletRepository, walletManager, state, collateralRepository });

  await laceMigrationClient.completeMigration();

  return {
    currency: state.currency === 'usd' ? currencyCode.USD : currencyCode.EUR,
    analytics: state.analytics
  };
};

export enum NamiMigrationChannels {
  MIGRATION = 'migration'
}

export interface NamiMigrationAPI {
  checkMigrationStatus: () => Promise<MigrationState>;
  startMigration: () => Promise<{
    currency: currencyCode;
    analytics: {
      enabled: boolean;
      userId: string;
    };
  }>;
  abortMigration: () => Promise<void>;
}

exposeApi<NamiMigrationAPI>(
  {
    api$: of({
      startMigration,
      checkMigrationStatus: laceMigrationClient.checkMigrationStatus,
      abortMigration: laceMigrationClient.abortMigration
    }),
    baseChannel: NamiMigrationChannels.MIGRATION,
    properties: {
      startMigration: RemoteApiPropertyType.MethodReturningPromise,
      checkMigrationStatus: RemoteApiPropertyType.MethodReturningPromise,
      abortMigration: RemoteApiPropertyType.MethodReturningPromise
    }
  },
  { logger: console, runtime }
);
