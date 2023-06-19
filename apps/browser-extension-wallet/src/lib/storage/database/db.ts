/* eslint-disable no-magic-numbers */
import Dexie, { Table } from 'dexie';
import { addressBookSchema, dappSchema, nftFoldersSchema } from '../models';
import { buildStoreVersion, migrateAddressBookSchema } from './build';
import { DATABASE_NAME } from './config';

export type VersionedSchema = {
  table: string;
  indexedFields: Record<number, string[]>;
};

export class WalletDatabase extends Dexie {
  constructor(name: string = DATABASE_NAME) {
    super(name);
    this.migrate();
  }

  getConnection<T>(schema: VersionedSchema): Table<T> {
    return this.table<T, number>(schema.table);
  }

  private migrate(): void {
    buildStoreVersion(this, 2, [addressBookSchema], migrateAddressBookSchema);
    buildStoreVersion(this, 2, [dappSchema]);
    buildStoreVersion(this, 3, [nftFoldersSchema]);
    // remove once integrated
  }
}
