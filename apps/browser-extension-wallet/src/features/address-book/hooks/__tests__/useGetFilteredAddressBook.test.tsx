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
import { Cardano, Asset } from '@cardano-sdk/core';

const cardanoAddress = Cardano.PaymentAddress(
  'addr_test1qzrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuql9tk0g'
);
const mockHandleResolution = {
  addresses: { cardano: cardanoAddress },
  backgroundImage: Asset.Uri('ipfs://zrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3yd'),
  cardanoAddress,
  handle: 'bob',
  hasDatum: false,
  image: Asset.Uri('ipfs://c8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe'),
  policyId: Cardano.PolicyId('50fdcdbfa3154db86a87e4b5697ae30d272e0bbcfa8122efd3e301cb'),
  profilePic: Asset.Uri('ipfs://zrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3yd1')
};
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
      network: Cardano.NetworkMagics.Preprod,
      handleResolution: mockHandleResolution
    },
    {
      id: 2,
      address: 'addr_test2',
      name: 'Other wallet',
      network: Cardano.NetworkMagics.Preprod,
      handleResolution: mockHandleResolution
    },
    {
      id: 3,
      address: 'addr_test3',
      name: 'Other wallet 2',
      network: Cardano.NetworkMagics.Preprod,
      handleResolution: mockHandleResolution
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
    expect(result.current.filterAddressesByNameOrAddress).toBeDefined();

    await act(async () => {
      await result.current.filterAddressesByNameOrAddress({ value: 't' });
    });
    expect(result.current.filteredAddresses).toHaveLength(1);
    expect(result.current.filteredAddresses).toStrictEqual([
      { id: 1, walletAddress: 'addr_test1', walletName: 'test wallet', walletHandleResolution: mockHandleResolution }
    ]);

    act(() => result.current.resetAddressList());
    expect(result.current.filteredAddresses).toHaveLength(0);
    expect(result.current.filteredAddresses).toStrictEqual([]);
  });

  test('should have limited results', async () => {
    const { result } = renderHook(() => useGetFilteredAddressBook(), {
      wrapper: makeDbContextWrapper(db)
    });
    expect(result.current.filterAddressesByNameOrAddress).toBeDefined();

    await act(async () => {
      await result.current.filterAddressesByNameOrAddress({ value: 'oth' });
    });
    expect(result.current.filteredAddresses).toHaveLength(2);

    await act(async () => {
      await result.current.filterAddressesByNameOrAddress({ value: 'oth', limit: 1 });
    });
    expect(result.current.filteredAddresses).toHaveLength(1);
  });

  test('should get result by exact address', async () => {
    const { result } = renderHook(() => useGetFilteredAddressBook(), {
      wrapper: makeDbContextWrapper(db)
    });
    expect(result.current.filterAddressesByNameOrAddress).toBeDefined();

    await act(async () => {
      await result.current.filterAddressesByNameOrAddress({ value: 'addr_test3' });
    });
    expect(result.current.filteredAddresses).toHaveLength(1);
    expect(result.current.filteredAddresses).toStrictEqual([
      { id: 3, walletAddress: 'addr_test3', walletName: 'Other wallet 2', walletHandleResolution: mockHandleResolution }
    ]);
  });
});
