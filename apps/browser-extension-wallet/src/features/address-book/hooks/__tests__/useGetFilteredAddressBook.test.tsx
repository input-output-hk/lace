/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
/* eslint-disable sonarjs/no-duplicate-string */
import React, { FunctionComponent } from 'react';
import { useGetFilteredAddressBook } from '../useGetFilteredAddressBook';
import { renderHook, act } from '@testing-library/react-hooks';
import { DatabaseProvider } from '../../../../providers/DatabaseProvider';
import { WalletDatabase, AddressBookSchema, addressBookSchema } from '../../../../lib/storage';
import { StoreProvider } from '@src/stores';
import create from 'zustand';
import { AppSettingsProvider } from '@providers';
import { Cardano } from '@cardano-sdk/core';

const makeDbContextWrapper =
  (dbIntance: WalletDatabase): FunctionComponent =>
  ({ children }: { children?: React.ReactNode }) =>
    (
      <AppSettingsProvider>
        <StoreProvider appMode="browser" store={create(() => ({ environmentName: 'Preprod' } as any))}>
          <DatabaseProvider dbCustomInstance={dbIntance}>{children}</DatabaseProvider>
        </StoreProvider>
      </AppSettingsProvider>
    );
describe('Testing useGetFilteredAddressBook hook', () => {
  let db: WalletDatabase;
  const mockAddress: AddressBookSchema[] = [
    {
      id: 1,
      address: 'addr_test1',
      name: 'test wallet',
      network: Cardano.NetworkMagics.Preprod
    },
    {
      id: 2,
      address: 'addr_test2',
      name: 'Other wallet',
      network: Cardano.NetworkMagics.Preprod
    },
    {
      id: 3,
      address: 'addr_test3',
      name: 'Other wallet 2',
      network: Cardano.NetworkMagics.Preprod
    }
  ];

  beforeEach(async () => {
    db = new WalletDatabase();
    db.getConnection(addressBookSchema).bulkAdd(mockAddress);
  });
  afterEach(() => db.delete());

  test('should be an empty array', () => {
    const { result } = renderHook(() => useGetFilteredAddressBook(), {
      wrapper: makeDbContextWrapper(db)
    });
    expect(result.current.filteredAddresses).toHaveLength(0);
    expect(result.current.filteredAddresses).toStrictEqual([]);
  });

  test('should filter by name and reset state', async () => {
    const { result } = renderHook(() => useGetFilteredAddressBook(), {
      wrapper: makeDbContextWrapper(db)
    });
    expect(result.current.getAddressBookByNameOrAddress).toBeDefined();

    await act(async () => {
      await result.current.getAddressBookByNameOrAddress({ value: 't' });
    });
    expect(result.current.filteredAddresses).toHaveLength(1);
    expect(result.current.filteredAddresses).toStrictEqual([
      { id: 1, walletAddress: 'addr_test1', walletName: 'test wallet' }
    ]);

    act(() => result.current.resetAddressList());
    expect(result.current.filteredAddresses).toHaveLength(0);
    expect(result.current.filteredAddresses).toStrictEqual([]);
  });

  test('should have limited results', async () => {
    const { result } = renderHook(() => useGetFilteredAddressBook(), {
      wrapper: makeDbContextWrapper(db)
    });
    expect(result.current.getAddressBookByNameOrAddress).toBeDefined();

    await act(async () => {
      await result.current.getAddressBookByNameOrAddress({ value: 'oth' });
    });
    expect(result.current.filteredAddresses).toHaveLength(2);

    await act(async () => {
      await result.current.getAddressBookByNameOrAddress({ value: 'oth', limit: 1 });
    });
    expect(result.current.filteredAddresses).toHaveLength(1);
  });

  test('should get result by exact address', async () => {
    const { result } = renderHook(() => useGetFilteredAddressBook(), {
      wrapper: makeDbContextWrapper(db)
    });
    expect(result.current.getAddressBookByNameOrAddress).toBeDefined();

    await act(async () => {
      await result.current.getAddressBookByNameOrAddress({ value: 'addr_test3' });
    });
    expect(result.current.filteredAddresses).toHaveLength(1);
    expect(result.current.filteredAddresses).toStrictEqual([
      { id: 3, walletAddress: 'addr_test3', walletName: 'Other wallet 2' }
    ]);
  });
});
