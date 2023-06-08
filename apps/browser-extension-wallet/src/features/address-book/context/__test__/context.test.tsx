/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
import React, { FunctionComponent } from 'react';
import { cleanup, renderHook } from '@testing-library/react-hooks';
import { useAddressBookContext } from '../context';
import { AddressBookProvider } from '../AddressBookProvider';
import { WalletDatabase, AddressBookSchema, addressBookSchema, useDbStateValue } from '@src/lib/storage';
import { DatabaseProvider } from '@src/providers/DatabaseProvider';
import { StoreProvider } from '@src/stores';
import create from 'zustand';
import { AppSettingsProvider } from '@providers';
import { Cardano } from '@cardano-sdk/core';
import { act } from 'react-dom/test-utils';
import { waitFor } from '@testing-library/react';

jest.mock('../AddressBookProvider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../AddressBookProvider'),
  withAddressBookContext: jest.fn()
}));

const makeDbContextWrapper =
  (dbInstance: WalletDatabase): FunctionComponent =>
  ({ children }: { children?: React.ReactNode }) =>
    (
      <AppSettingsProvider>
        <StoreProvider appMode="browser" store={create(() => ({ environmentName: 'Preprod' } as any))}>
          <DatabaseProvider dbCustomInstance={dbInstance}>
            <AddressBookProvider>{children}</AddressBookProvider>
          </DatabaseProvider>
        </StoreProvider>
      </AppSettingsProvider>
    );

describe('testing useAddressBookState', () => {
  let db: WalletDatabase;
  const mockAddressList: AddressBookSchema[] = Array.from({ length: 15 }, (_v, i) => ({
    id: i + 1,
    address: `addr_test${i + 1}`,
    name: `atest wallet ${i + 1}`,
    network: 1
  }));

  beforeEach(async () => {
    db = new WalletDatabase();
    db.getConnection(addressBookSchema).bulkAdd(mockAddressList);
  });

  afterEach(async () => {
    await db.delete();
    cleanup();
  });

  test('should return state and utils', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAddressBookContext(), {
      wrapper: makeDbContextWrapper(db)
    });

    await waitForNextUpdate();
    await waitFor(() => {
      expect(result.current.utils.deleteRecord).toBeDefined();
      expect(result.current.utils.saveRecord).toBeDefined();
      expect(result.current.utils.extendLimit).toBeDefined();

      expect(result.current.list.length).toBe(10);
      expect(result.current.count).toBe(15);
    });
  });

  test('should add new address and extend limit', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAddressBookContext(), {
      wrapper: makeDbContextWrapper(db)
    });

    await waitForNextUpdate();

    await act(async () => {
      await result.current.utils.saveRecord({ address: 'addr_test16', name: 'test wallet 16' });
    });

    act(() => {
      result.current.utils.extendLimit();
    });

    await waitFor(() => {
      expect(result.current.list).toContainEqual({
        address: 'addr_test16',
        id: 16,
        name: 'test wallet 16',
        network: Cardano.NetworkMagics.Preprod
      });
      expect(result.current.list.length).toBe(16);
      expect(result.current.count).toBe(16);
    });
  });

  test('should update address', async () => {
    const hook = renderHook(() => useAddressBookContext() as useDbStateValue<AddressBookSchema>, {
      wrapper: makeDbContextWrapper(db)
    });

    await hook.waitForNextUpdate();

    const idToUpdate = hook.result.current.list[0].id;
    const addressData = {
      id: hook.result.current.list[0].id,
      name: 'newName',
      address: 'newAddress',
      network: 1
    };

    await act(async () => {
      await hook.result.current.utils.updateRecord(idToUpdate, addressData as AddressBookSchema);
    });

    await waitFor(() => {
      expect(hook.result.current.list).toContainEqual({ ...addressData, id: idToUpdate });
      expect(hook.result.current.list.length).toBe(10);
      expect(hook.result.current.count).toBe(15);
    });
  });

  test('should delete address', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAddressBookContext(), {
      wrapper: makeDbContextWrapper(db)
    });

    await waitForNextUpdate();

    await act(async () => {
      await result.current.utils.deleteRecord(1);
    });

    act(() => {
      result.current.utils.extendLimit();
    });

    await waitFor(() => {
      expect(result.current.list).not.toContainEqual({
        address: 'addr_test1',
        name: 'test wallet',
        id: 1
      });
      expect(result.current.list.length).toBe(14);
      expect(result.current.count).toBe(14);
    });
  });
});

describe('testing the order', () => {
  const addresses = {
    // Alphanumeric that starts with lowercase
    addr1: { name: 'abc123', address: 'addr_test11', network: 1, id: 1 },
    addr2: { name: 'def456', address: 'addr_test12', network: 1, id: 2 },
    addr3: { name: 'def123', address: 'addr_test13', network: 1, id: 3 },
    // Lowercase
    addr4: { name: 'ghiklm', address: 'addr_test21', network: 1, id: 4 },
    addr5: { name: 'ghiklmn', address: 'addr_test22', network: 1, id: 5 },
    addr6: { name: 'ghiklmopq', address: 'addr_test23', network: 1, id: 6 },
    // Alphanumeric that starts with uppercase
    addr7: { name: 'RST123', address: 'addr_test31', network: 1, id: 7 },
    addr8: { name: 'RSTUV123', address: 'addr_test32', network: 1, id: 8 },
    addr9: { name: 'R1STUV123', address: 'addr_test33', network: 1, id: 9 },
    // Uppercase
    addr10: { name: 'GHIKLM', address: 'addr_test41', network: 1, id: 10 },
    addr11: { name: 'GHIKLMN', address: 'addr_test42', network: 1, id: 11 },
    addr12: { name: 'GHIKLMOPQ', address: 'addr_test43', network: 1, id: 12 },
    // Alphanumeric that starts with a number
    addr13: { name: '123abc', address: 'addr_test51', network: 1, id: 13 },
    addr14: { name: '123bcd', address: 'addr_test52', network: 1, id: 14 },
    addr15: { name: '2a34abc', address: 'addr_test53', network: 1, id: 15 },
    // Number
    addr16: { name: '123456', address: 'addr_test61', network: 1, id: 16 },
    addr17: { name: '12345', address: 'addr_test62', network: 1, id: 17 },
    addr18: { name: '2346', address: 'addr_test63', network: 1, id: 18 }
  };

  let db1: WalletDatabase;
  beforeEach(async () => {
    db1 = new WalletDatabase();
    db1.getConnection(addressBookSchema).bulkAdd(Object.values(addresses));
  });

  afterEach(async () => {
    await db1.delete();
    cleanup();
  });
  test('should sort items correctly Number -> Alphanumeric that starts with a number -> Uppercase -> Alphanumeric that starts with uppercase -> Lowercase -> Alphanumeric that starts with lowercase', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAddressBookContext(), {
      wrapper: makeDbContextWrapper(db1)
    });

    await waitForNextUpdate();
    act(() => {
      result.current.utils.extendLimit();
    });
    await waitForNextUpdate();

    // Number
    expect(result.current.list[0]).toEqual(addresses.addr17);
    expect(result.current.list[1]).toEqual(addresses.addr16);
    expect(result.current.list[2]).toEqual(addresses.addr18);
    // Alphanumeric that starts with a number
    expect(result.current.list[3]).toEqual(addresses.addr13);
    expect(result.current.list[4]).toEqual(addresses.addr14);
    expect(result.current.list[5]).toEqual(addresses.addr15);
    // Uppercase
    expect(result.current.list[6]).toEqual(addresses.addr10);
    expect(result.current.list[7]).toEqual(addresses.addr11);
    expect(result.current.list[8]).toEqual(addresses.addr12);
    // Alphanumeric that starts with uppercase
    expect(result.current.list[9]).toEqual(addresses.addr9);
    expect(result.current.list[10]).toEqual(addresses.addr7);
    expect(result.current.list[11]).toEqual(addresses.addr8);
    // Lowercase
    expect(result.current.list[12]).toEqual(addresses.addr4);
    expect(result.current.list[13]).toEqual(addresses.addr5);
    expect(result.current.list[14]).toEqual(addresses.addr6);
    // Alphanumeric that starts with lowercase
    expect(result.current.list[15]).toEqual(addresses.addr1);
    expect(result.current.list[16]).toEqual(addresses.addr3);
    expect(result.current.list[17]).toEqual(addresses.addr2);
  });
});
