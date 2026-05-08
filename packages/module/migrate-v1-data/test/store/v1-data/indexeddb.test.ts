import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getIndexedbData,
  type V1AddressBookSchema,
  type V1NftFoldersSchema,
} from '../../../src/store/v1-data/indexeddb';

import type { Cardano } from '@cardano-sdk/core';

const addressBookEntry: V1AddressBookSchema = {
  id: 1,
  name: 'Alice',
  address:
    'addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx' as Cardano.PaymentAddress,
  network: 764824073 as Cardano.NetworkMagics,
};

const nftFolderEntry: V1NftFoldersSchema = {
  id: 1,
  name: 'My NFTs',
  assets: [],
  network: 'Mainnet',
};

const createIdbRequest = (result: unknown) => {
  const request: { result: unknown } = { result };
  Object.defineProperty(request, 'onsuccess', {
    configurable: true,
    set: (callback: ((this: { result: unknown }) => void) | null) => {
      if (callback) callback.call(request);
    },
  });
  Object.defineProperty(request, 'onerror', {
    configurable: true,
    set: () => {},
  });
  return request;
};

const setupMockDb = (
  availableStores: Partial<Record<'addressBook' | 'nftFolders', unknown[]>>,
) =>
  vi.stubGlobal('indexedDB', {
    open: () =>
      createIdbRequest({
        transaction: (storeNames: string[]) => {
          const missing = storeNames.find(name => !(name in availableStores));
          if (missing)
            throw Object.assign(new Error('Store not found'), {
              name: 'NotFoundError',
            });
          return {
            abort: vi.fn(),
            objectStore: (name: string) => ({
              getAll: () =>
                createIdbRequest(
                  availableStores[name as 'addressBook' | 'nftFolders'] ?? [],
                ),
            }),
          };
        },
      }),
  });

afterEach(() => vi.unstubAllGlobals());

describe('getIndexedbData', () => {
  it.each([
    [
      'returns data from both stores when both are present',
      { addressBook: [addressBookEntry], nftFolders: [nftFolderEntry] },
      {
        v1AddressBookEntries: [addressBookEntry],
        v1NftFolderEntries: [nftFolderEntry],
      },
    ],
    [
      'returns addressBook data and empty nftFolders when nftFolders store is missing',
      { addressBook: [addressBookEntry] },
      { v1AddressBookEntries: [addressBookEntry], v1NftFolderEntries: [] },
    ],
    [
      'returns empty addressBook and nftFolders data when addressBook store is missing',
      { nftFolders: [nftFolderEntry] },
      { v1AddressBookEntries: [], v1NftFolderEntries: [nftFolderEntry] },
    ],
    [
      'returns empty arrays when neither store exists',
      {},
      { v1AddressBookEntries: [], v1NftFolderEntries: [] },
    ],
  ])('%s', async (_, stores, expected) => {
    setupMockDb(stores);
    await expect(getIndexedbData()).resolves.toEqual(expected);
  });

  it('rethrows unexpected IDB errors', async () => {
    vi.stubGlobal('indexedDB', {
      open: () =>
        createIdbRequest({
          transaction: () => {
            throw new Error('disk I/O error');
          },
        }),
    });
    await expect(getIndexedbData()).rejects.toThrow('disk I/O error');
  });
});
