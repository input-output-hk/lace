import { runtime } from 'webextension-polyfill';
import * as laceMigrationClient from '@src/features/nami-migration/migration-tool/cross-extension-messaging/lace-migration-client.extension';
import { MigrationState } from '@src/features/nami-migration/migration-tool/migrator/migration-state.data';
import { walletRepository, walletManager, getBaseDbName } from './wallet';

import { run, CollateralRepository } from './nami-migration-runner';
import { currencyCode } from '@providers/currency/constants';
import { exposeApi, getWalletStoreId, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { storage } from '@cardano-sdk/wallet';
import { of } from 'rxjs';
import { NamiMigrationChannels } from '@lib/scripts/types';
import { logger } from '@lace/common';

const collateralRepository: CollateralRepository = async ({ utxo, chainId, walletId, accountIndex }) => {
  const walletStoreId = getWalletStoreId(walletId, chainId, accountIndex);
  const baseDbName = getBaseDbName(walletStoreId);
  const db = new storage.PouchDbUtxoStore({ dbName: `${baseDbName}UnspendableUtxo` }, logger);
  db.setAll([utxo]);
};

const startMigration = async () => {
  const state = await laceMigrationClient.requestMigrationData();

  await run({ walletRepository, walletManager, state, collateralRepository });

  return {
    currency: state.currency === 'usd' ? currencyCode.USD : currencyCode.EUR,
    analytics: state.analytics,
    themeColor: state.themeColor
  };
};

export interface NamiMigrationAPI {
  checkMigrationStatus: () => Promise<MigrationState>;
  startMigration: () => Promise<{
    currency: currencyCode;
    analytics: {
      enabled: boolean;
      userId: string;
    };
    themeColor: string;
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
  { logger, runtime }
);
