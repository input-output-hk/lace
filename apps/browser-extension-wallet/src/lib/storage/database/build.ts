import { Wallet } from '@lace/cardano';
import { startWithRegExp } from '@src/utils/regex';
import Dexie, { PromiseExtended, Transaction, Version } from 'dexie';
import { AddressBookSchema } from '../models';
import { VersionedSchema } from './db';

export const buildStoreVersion = (
  db: Dexie,
  version: number,
  schemas: VersionedSchema[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upgrade?: (trans: Transaction) => void | PromiseLike<any>
): Version => {
  const storesSchema = {
    ...schemas.reduce(
      (total: { [tableName: string]: string }, schema: VersionedSchema) => ({
        ...total,
        [schema.table]: schema.indexedFields[version].join(',')
      }),
      {}
    )
  };

  return upgrade ? db.version(version).stores(storesSchema).upgrade(upgrade) : db.version(version).stores(storesSchema);
};

export const migrateAddressBookSchema = (transaction: Transaction): PromiseExtended<number> =>
  transaction
    .table('addressBook')
    .toCollection()
    .modify((addressBook: Omit<AddressBookSchema, 'network'> & { network: Wallet.Cardano.NetworkId }) => {
      addressBook.network = startWithRegExp(addressBook.address).test('addr_test1')
        ? Wallet.Cardano.NetworkId.Testnet
        : Wallet.Cardano.NetworkId.Mainnet;
    });
