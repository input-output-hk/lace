/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
import React, { FunctionComponent } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useAddressBookContext } from '../context';
import { AddressBookProvider } from '../AddressBookProvider';
import { WalletDatabase, AddressBookSchema, addressBookSchema, useDbStateValue } from '@src/lib/storage';
import { DatabaseProvider } from '@src/providers/DatabaseProvider';
import { StoreProvider } from '@src/stores';
import create from 'zustand';
import { AppSettingsProvider } from '@providers';

jest.mock('../AddressBookProvider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../AddressBookProvider'),
  withAddressBookContext: jest.fn()
}));

const makeDbContextWrapper =
  (dbIntance: WalletDatabase): FunctionComponent =>
  ({ children }: { children?: React.ReactNode }) =>
    (
      <AppSettingsProvider>
        <StoreProvider appMode="browser" store={create(() => ({ environmentName: 'Preprod' } as any))}>
          <DatabaseProvider dbCustomInstance={dbIntance}>
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
    network: 0
  }));

  beforeEach(async () => {
    db = new WalletDatabase();
    db.getConnection(addressBookSchema).bulkAdd(mockAddressList);
  });

  afterEach(() => db.delete());

  test('should return state and utils', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAddressBookContext(), {
      wrapper: makeDbContextWrapper(db)
    });
    expect(result.current.utils.deleteRecord).toBeDefined();
    expect(result.current.utils.saveRecord).toBeDefined();
    expect(result.current.utils.extendLimit).toBeDefined();

    await waitForNextUpdate();

    expect(result.current.list.length).toBe(10);
    expect(result.current.count).toBe(15);
  });

  test('should add new address and extend limit', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAddressBookContext(), {
      wrapper: makeDbContextWrapper(db)
    });

    await waitForNextUpdate();

    result.current.utils.saveRecord({ address: 'addr_test16', name: 'test wallet 16' });

    await waitForNextUpdate();

    result.current.utils.extendLimit();

    await waitForNextUpdate();

    expect(result.current.list).toContainEqual({
      address: 'addr_test16',
      id: 16,
      name: 'test wallet 16',
      network: 0
    });
    expect(result.current.list.length).toBe(16);
    expect(result.current.count).toBe(16);
  });

  test('should update address', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useAddressBookContext() as useDbStateValue<AddressBookSchema>,
      {
        wrapper: makeDbContextWrapper(db)
      }
    );

    await waitForNextUpdate();

    const idToUpdate = result.current.list[0].id;
    const addressData = {
      id: result.current.list[0].id,
      name: 'newName',
      address: 'newAddress',
      network: 0
    };

    result.current.utils.updateRecord(idToUpdate, addressData as AddressBookSchema);

    await waitForNextUpdate();

    expect(result.current.list).toContainEqual({ ...addressData, id: idToUpdate });
    expect(result.current.list.length).toBe(10);
    expect(result.current.count).toBe(15);
  });

  test('should delete address', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAddressBookContext(), {
      wrapper: makeDbContextWrapper(db)
    });

    await waitForNextUpdate();

    result.current.utils.deleteRecord(1);

    await waitForNextUpdate();

    result.current.utils.extendLimit();

    await waitForNextUpdate();

    expect(result.current.list).not.toContainEqual({
      address: 'addr_test1',
      name: 'test wallet',
      id: 1
    });
    expect(result.current.list.length).toBe(14);
    expect(result.current.count).toBe(14);
  });
});
