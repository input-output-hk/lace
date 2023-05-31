/* eslint-disable @typescript-eslint/no-explicit-any */
import { VersionedSchema } from '../database';
import { Wallet } from '@lace/cardano';
import { DbQueries } from '../hooks';
import { AddressRecordParams } from '@src/features/address-book/context';
import { sortTabletByName } from '../helpers';

export interface AddressBookSchema {
  id: number;
  name: string;
  address: string;
  network: Wallet.Cardano.NetworkId;
}

export const addressBookSchema: VersionedSchema = {
  table: 'addressBook',
  indexedFields: {
    1: ['++id', '&name', '&address'],
    2: ['++id', '&name', '&address', 'network']
  }
};

export const addressBookQueries = (
  currentChain: Wallet.Cardano.NetworkId
): DbQueries<AddressBookSchema, AddressRecordParams> => ({
  listQuery: (collection) =>
    collection.filter(({ network }) => network === currentChain).sortBy('name', sortTabletByName),
  countQuery: (table) => table.filter(({ network }) => network === currentChain).count(),
  saveRecordQuery: (table) => (record) => table.add({ ...record, network: currentChain })
});
