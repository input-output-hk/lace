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
import { Cardano, Asset } from '@cardano-sdk/core';
import { act } from 'react-dom/test-utils';
import { waitFor } from '@testing-library/react';

jest.mock('../AddressBookProvider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../AddressBookProvider'),
  withAddressBookContext: jest.fn()
}));

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
    network: Cardano.NetworkMagics.Preprod,
    handleResolution: mockHandleResolution
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
      network: Cardano.NetworkMagics.Preprod,
      handleResolution: mockHandleResolution
    };

    await act(async () => {
      await result.current.utils.updateRecord(idToUpdate, addressData as AddressBookSchema);
    });

    await waitFor(() => {
      expect(result.current.list).toContainEqual({ ...addressData, id: idToUpdate });
      expect(result.current.list.length).toBe(10);
      expect(result.current.count).toBe(15);
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
