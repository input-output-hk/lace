/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types, unicorn/no-null */
import { contextLogger } from '@cardano-sdk/util';
import { storage } from '@cardano-sdk/wallet';
import { defaultIfEmpty, firstValueFrom, map, Observable } from 'rxjs';
import { Logger } from 'ts-log';

const migrateStore = async <T, Store>(
  fromStore: Store,
  toStore: Store,
  get: (store: Store) => Observable<T | null>,
  set: (store: Store, value: T) => Observable<void>,
  logger: Logger
  // eslint-disable-next-line max-params
) => {
  const toValue = await firstValueFrom(get(toStore));
  if (toValue) {
    logger.debug('Skip store migration: already migrated');
    return false;
  }
  const fromValue = await firstValueFrom(get(fromStore));
  if (!fromValue) {
    logger.debug('Skip store migration: no data found in source');
    return false;
  }
  await firstValueFrom(set(toStore, fromValue));
  logger.debug('Migrated store');
  return true;
};

const migrateDocumentStore = async <T>(
  fromStore: storage.DocumentStore<T>,
  toStore: storage.DocumentStore<T>,
  logger: Logger
) =>
  migrateStore(
    fromStore,
    toStore,
    (store) => store.get().pipe(defaultIfEmpty<T, null>(null)),
    (store, value) => store.set(value),
    logger
  );

export const migrateCollectionStore = async <T>(
  fromStore: storage.CollectionStore<T>,
  toStore: storage.CollectionStore<T>,
  logger: Logger
) =>
  migrateStore(
    fromStore,
    toStore,
    (store) =>
      store.getAll().pipe(
        map((items) => (items.length > 0 ? items : null)),
        defaultIfEmpty<T[], null>(null)
      ),
    (store, items) => store.setAll(items),
    logger
  );

export const shouldAttemptWalletStoresMigration = async (stores: storage.WalletStores) => {
  const tip = await firstValueFrom(stores.tip.get().pipe(defaultIfEmpty(null)));
  return !tip;
};

export const migrateWalletStores = async (
  fromStores: storage.WalletStores,
  toStores: storage.WalletStores,
  baseLogger: Logger
): Promise<boolean> => {
  const logger = contextLogger(baseLogger, 'StorageMigration');
  if (!(await migrateDocumentStore(fromStores.tip, toStores.tip, contextLogger(logger, 'tip')))) {
    logger.debug('Appears to be already migrated');
    return false;
  }
  await migrateDocumentStore(
    fromStores.protocolParameters,
    toStores.protocolParameters,
    contextLogger(logger, 'protocolParameters')
  );
  await migrateDocumentStore(
    fromStores.genesisParameters,
    toStores.genesisParameters,
    contextLogger(logger, 'genesisParameters')
  );
  await migrateDocumentStore(fromStores.eraSummaries, toStores.eraSummaries, contextLogger(logger, 'eraSummaries'));
  await migrateDocumentStore(fromStores.assets, toStores.assets, contextLogger(logger, 'assets'));
  await migrateDocumentStore(fromStores.addresses, toStores.addresses, contextLogger(logger, 'addresses'));
  await migrateDocumentStore(
    fromStores.inFlightTransactions,
    toStores.inFlightTransactions,
    contextLogger(logger, 'inFlightTransactions')
  );
  await migrateDocumentStore(
    fromStores.volatileTransactions,
    toStores.volatileTransactions,
    contextLogger(logger, 'volatileTransactions')
  );
  await migrateDocumentStore(fromStores.policyIds, toStores.policyIds, contextLogger(logger, 'policyIds'));
  await migrateDocumentStore(
    fromStores.signedTransactions,
    toStores.signedTransactions,
    contextLogger(logger, 'signedTransactions')
  );

  await migrateCollectionStore(fromStores.transactions, toStores.transactions, contextLogger(logger, 'transactions'));
  await migrateCollectionStore(fromStores.utxo, toStores.utxo, contextLogger(logger, 'utxo'));
  return true;
};
