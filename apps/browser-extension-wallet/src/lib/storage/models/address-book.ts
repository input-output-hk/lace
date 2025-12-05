/* eslint-disable @typescript-eslint/no-explicit-any */
import { VersionedSchema } from '../database';
import { Wallet } from '@lace/cardano';
import { DbQueries } from '../hooks';
import { AddressRecordParams } from '@src/features/address-book/context';
import { sortTabletByName } from '../helpers';
import { Cardano, HandleResolution } from '@cardano-sdk/core';

export interface AddressBookSchema {
  id: number;
  name: string;
  address: string | Cardano.PaymentAddress;
  handleResolution?: HandleResolution;
  network: Wallet.Cardano.NetworkMagics;
}

export const addressBookSchema: VersionedSchema = {
  table: 'addressBook',
  indexedFields: {
    1: ['++id', 'name', 'address'],
    2: ['++id', 'name', 'address', 'network', 'handleResolution']
  }
};

export const addressBookQueries = (
  currentChain: Wallet.Cardano.NetworkMagics
): DbQueries<AddressBookSchema, AddressRecordParams> => ({
  listQuery: (collection) =>
    collection.filter(({ network }) => network === currentChain).sortBy('name', sortTabletByName),
  countQuery: (table) => table.filter(({ network }) => network === currentChain).count(),
  saveRecordQuery: (table) => (record) => table.add({ ...record, network: currentChain })
});
