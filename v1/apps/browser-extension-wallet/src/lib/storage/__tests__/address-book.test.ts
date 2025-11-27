/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
import Dexie from 'dexie';
import { WalletDatabase } from '../database';
import { addressBookSchema, AddressBookSchema } from '../models';

describe('Testing addressBook table', () => {
  let db: WalletDatabase;
  const mockAddress: Omit<AddressBookSchema, 'id' | 'network'> = {
    address: 'addr_test',
    name: 'Other wallet'
  };

  beforeEach(async () => {
    db = new WalletDatabase();
  });
  afterEach(() => db.delete());

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
  test('should be able to add a record to the table', async () => {
    db.getConnection(addressBookSchema).add(mockAddress);
    await expect(db.getConnection(addressBookSchema).get(1)).resolves.toEqual({
      ...mockAddress,
      id: 1
    });
  });
  test('should be able to delete a record by key', async () => {
    db.getConnection(addressBookSchema).add(mockAddress as any);
    db.getConnection(addressBookSchema).delete(1);
    await expect(db.getConnection(addressBookSchema).get(1)).resolves.toBeUndefined();
  });
  test('should be able to update a record', async () => {
    db.getConnection(addressBookSchema).add(mockAddress);
    db.getConnection(addressBookSchema).update(1, { name: 'updated' });
    await expect(db.getConnection(addressBookSchema).get(1)).resolves.toEqual({
      ...mockAddress,
      id: 1,
      name: 'updated'
    });
  });
  test('should throw an error when trying to create a record with a duplicated name', async () => {
    db.getConnection(addressBookSchema).add(mockAddress);
    await expect(db.getConnection(addressBookSchema).add({ ...mockAddress, address: 'another' })).rejects.toThrow(
      Dexie.ConstraintError
    );
  });
  test('should throw an error when trying to create a record with a duplicated address', async () => {
    db.getConnection(addressBookSchema).add(mockAddress);
    await expect(db.getConnection(addressBookSchema).add({ ...mockAddress, name: 'another' })).rejects.toThrow(
      Dexie.ConstraintError
    );
  });
});
