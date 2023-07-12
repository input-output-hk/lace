/* eslint-disable no-magic-numbers */
import { WalletDatabase } from '../database';
import { DATABASE_NAME } from '../database/config';
import { addressBookSchema } from '../models';

describe('Testing WalletDatabase', () => {
  describe('Database Instance', () => {
    test('should instantiate a new WalletDatabase with the default name and latest version', () => {
      const db = new WalletDatabase();
      expect(db.name).toEqual(DATABASE_NAME);
      expect(db.verno).toEqual(3);
    });
    test('should instantiate a new WalletDatabase with the name provided', () => {
      const db = new WalletDatabase('TestDB');
      expect(db.name).toEqual('TestDB');
    });
  });

  describe('Database schema', () => {
    const db = new WalletDatabase();

    test('should have an addressBook table with id, name, address and handleResolution fields', () => {
      expect(db.table('addressBook')).toBeDefined();
      expect(db.getConnection(addressBookSchema)).toEqual(db.table('addressBook'));
      expect(db.getConnection(addressBookSchema).schema.primKey.name).toEqual('id');
      expect(db.getConnection(addressBookSchema).schema.indexes).toHaveLength(4);
      expect(db.getConnection(addressBookSchema).schema.indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'name' }),
          expect.objectContaining({ name: 'address' }),
          expect.objectContaining({ name: 'network' }),
          expect.objectContaining({ name: 'handleResolution' })
        ])
      );
    });
  });
});
