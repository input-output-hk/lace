import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import { ACTIVITIES_PER_PAGE } from '@lace-contract/activities';
import { Err, Ok, Timestamp } from '@lace-sdk/util';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardanoRewardAccount, CardanoPaymentAddress } from '../../../src';
import {
  fetchAddressTransactionHistories,
  fetchNewAddressTransactionHistories,
} from '../../../src/store/helpers/fetch-address-transaction-histories';
import {
  cardanoAccount0Addr,
  cardanoAccount1Addr,
  cardanoAccount2Addr1,
  chainId,
} from '../../mocks';

import type {
  CardanoAddressData,
  CardanoAddressTransactionHistoryMap,
  CardanoTransactionHistoryItem,
} from '../../../src';
import type { FetchAddressTransactionHistoriesParams } from '../../../src/store/helpers/fetch-address-transaction-histories';
import type { AnyAddress } from '@lace-contract/addresses';

const rewardAccount0 = CardanoRewardAccount(
  'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
);

const txId1 = Cardano.TransactionId(
  '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
);
const txId2 = Cardano.TransactionId(
  '3477c72b0fd0f78281f22c3bb88642ad57c7c45c89c85117d4753ec66b58933b',
);
const txId3 = Cardano.TransactionId(
  'dbb90b36f0cf25a215f215a5affc30f7b4b72031ea112101bb54e53ebcd08ea7',
);

const cardanoAccount0AddrWithData: AnyAddress<CardanoAddressData> = {
  ...cardanoAccount0Addr,
  data: {
    accountIndex: 0,
    index: 0,
    type: AddressType.Internal,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
    rewardAccount: rewardAccount0,
  },
};

const cardanoAccount1AddrWithData: AnyAddress<CardanoAddressData> = {
  ...cardanoAccount1Addr,
  data: {
    accountIndex: 0,
    index: 0,
    type: AddressType.Internal,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
    rewardAccount: rewardAccount0,
  },
};

const cardanoAccount2AddrWithData: AnyAddress<CardanoAddressData> = {
  ...cardanoAccount2Addr1,
  data: {
    accountIndex: 0,
    index: 0,
    type: AddressType.Internal,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
    rewardAccount: rewardAccount0,
  },
};

// test helpers
const createHistoryItem = (
  id: Cardano.TransactionId,
  blockNo: number = 100,
  txIndex: number = 1,
): CardanoTransactionHistoryItem => ({
  txId: Cardano.TransactionId(id),
  txIndex: Cardano.TxIndex(txIndex),
  blockNumber: Cardano.BlockNo(blockNo),
  blockTime: Timestamp(Date.now()),
});

describe('fetchAddressTransactionHistories', () => {
  const mockGetAddressTransactionHistory = vi.fn();

  const createBasicParams = (): FetchAddressTransactionHistoriesParams => ({
    addresses: [cardanoAccount0AddrWithData, cardanoAccount1AddrWithData],
    addressesHistories: {},
    numberOfItems: ACTIVITIES_PER_PAGE,
    chainId,
    getAddressTransactionHistory: mockGetAddressTransactionHistory,
  });

  beforeEach(() => {
    mockGetAddressTransactionHistory.mockReset();
  });

  it('fetches from multiple addresses in parallel and returns a combined result', () => {
    createTestScheduler().run(({ expectObservable, cold }) => {
      const address1 = CardanoPaymentAddress(cardanoAccount0Addr.address);
      const address2 = CardanoPaymentAddress(cardanoAccount1Addr.address);
      const address3 = CardanoPaymentAddress(cardanoAccount2Addr1.address);

      // Mock parallel request responses which finish in random order
      const tx1ToLoadResult = [createHistoryItem(txId1)];
      const tx2ToLoadResult = [createHistoryItem(txId2)];
      const tx3ToLoadResult = [createHistoryItem(txId3)];
      mockGetAddressTransactionHistory
        .mockReturnValueOnce(cold('(a|)', { a: Ok(tx1ToLoadResult) })) // 1st
        .mockReturnValueOnce(cold('--(a|)', { a: Ok(tx2ToLoadResult) })) // 3rd
        .mockReturnValueOnce(cold('-(a|)', { a: Ok(tx3ToLoadResult) })); // 2nd

      expectObservable(
        fetchAddressTransactionHistories({
          ...createBasicParams(),
          addresses: [
            cardanoAccount0AddrWithData,
            cardanoAccount1AddrWithData,
            cardanoAccount2AddrWithData,
          ],
          addressesHistories: {},
        }),
        // It should wait for all requests to finish and combine them
      ).toBe('--(a|)', {
        a: Ok([
          {
            address: address1,
            transactionHistory: tx1ToLoadResult,
            hasLoadedOldestEntry: true,
          },
          {
            address: address2,
            transactionHistory: tx2ToLoadResult,
            hasLoadedOldestEntry: true,
          },
          {
            address: address3,
            transactionHistory: tx3ToLoadResult,
            hasLoadedOldestEntry: true,
          },
        ]),
      });
    });
  });

  it('skips addresses where oldest entry was already loaded', () => {
    createTestScheduler().run(({ expectObservable }) => {
      // Setup address histories with one address that has includesOldestEntry=true
      const address0 = CardanoPaymentAddress(cardanoAccount0Addr.address);
      const address1 = CardanoPaymentAddress(cardanoAccount1Addr.address);

      const addressesHistories: CardanoAddressTransactionHistoryMap = {
        [address0]: {
          hasLoadedOldestEntry: true, // This address should be skipped
          transactionHistory: [createHistoryItem(txId1)],
        },
        [address1]: {
          hasLoadedOldestEntry: false,
          transactionHistory: [createHistoryItem(txId2)],
        },
      };

      // Mock response for the address that should be queried
      const txToLoadResult = [createHistoryItem(txId3)];
      mockGetAddressTransactionHistory.mockReturnValueOnce(
        of(Ok(txToLoadResult)),
      );

      expectObservable(
        fetchAddressTransactionHistories({
          ...createBasicParams(),
          addressesHistories,
        }),
      ).toBe('(a|)', {
        a: Ok([
          {
            address: address1,
            transactionHistory:
              addressesHistories[address1].transactionHistory.concat(
                txToLoadResult,
              ),
            hasLoadedOldestEntry: true,
          },
        ]),
      });
    });
  });

  describe('pagination', () => {
    it('starts from beginning if no transaction history exists yet', () => {
      createTestScheduler().run(({ expectObservable, flush }) => {
        const address = CardanoPaymentAddress(cardanoAccount0Addr.address);

        const addressesHistories: CardanoAddressTransactionHistoryMap = {
          [address]: {
            hasLoadedOldestEntry: false,
            transactionHistory: [], // Empty history
          },
        };

        const txsToLoadResult = [
          createHistoryItem(txId2, 98, 1),
          createHistoryItem(txId2, 98, 2),
          createHistoryItem(txId2, 99),
          createHistoryItem(txId1, 100),
        ];
        mockGetAddressTransactionHistory.mockReturnValueOnce(
          of(Ok(txsToLoadResult)),
        );

        expectObservable(
          fetchAddressTransactionHistories({
            ...createBasicParams(),
            addresses: [cardanoAccount0AddrWithData],
            addressesHistories,
          }),
        ).toBe('(a|)', {
          a: Ok([
            {
              address,
              transactionHistory: txsToLoadResult.sort(
                (a, b) =>
                  Number(b.blockTime) - Number(a.blockTime) ||
                  Number(b.txIndex) - Number(a.txIndex),
              ),
              hasLoadedOldestEntry: true,
            },
          ]),
        });
        flush();
        // Verify no pagination parameters were passed
        expect(mockGetAddressTransactionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            address,
            numberOfItems: ACTIVITIES_PER_PAGE,
            // Should not have startAtBlock or startAtIndex
          }),
          expect.objectContaining({ chainId }),
        );
      });
    });

    it('uses buildStartAtParamsFromTx for paginated loading', () => {
      createTestScheduler().run(({ expectObservable, flush }) => {
        // Setup address with existing history
        const address = CardanoPaymentAddress(cardanoAccount0Addr.address);
        const oldestTx = createHistoryItem(txId1, 100, 5);

        const addressesHistories: CardanoAddressTransactionHistoryMap = {
          [address]: {
            hasLoadedOldestEntry: false,
            transactionHistory: [createHistoryItem(txId2, 99, 0), oldestTx], // oldestTx is at the end
          },
        };

        const txToLoadResult = [createHistoryItem(txId3, 100, 4)];
        mockGetAddressTransactionHistory.mockReturnValueOnce(
          of(Ok(txToLoadResult)),
        );

        expectObservable(
          fetchAddressTransactionHistories({
            ...createBasicParams(),
            addresses: [cardanoAccount0AddrWithData],
            addressesHistories,
          }),
        ).toBe('(a|)', {
          a: Ok([
            {
              address,
              transactionHistory:
                addressesHistories[address].transactionHistory.concat(
                  txToLoadResult,
                ),
              hasLoadedOldestEntry: true,
            },
          ]),
        });
        flush();
        // Verify pagination parameters were correctly calculated
        expect(mockGetAddressTransactionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            address,
            startAtBlock: Cardano.BlockNo(100),
            startAtIndex: Cardano.TxIndex(4), // oldestTx.txIndex - 1
          }),
          expect.objectContaining({ chainId }),
        );
      });
    });
  });

  it('handles errors for individual address requests correctly', () => {
    createTestScheduler().run(({ expectObservable, cold }) => {
      const tx1ToLoadResult = [createHistoryItem(txId1)];
      const address2Error = new ProviderError(ProviderFailure.Unknown);
      const address3Error = new ProviderError(ProviderFailure.InvalidResponse);
      mockGetAddressTransactionHistory
        .mockReturnValueOnce(cold('(a|)', { a: Ok(tx1ToLoadResult) }))
        .mockReturnValueOnce(cold('-(a|)', { a: Err(address2Error) }))
        .mockReturnValueOnce(cold('--(a|)', { a: Err(address3Error) }));

      expectObservable(
        fetchAddressTransactionHistories({
          ...createBasicParams(),
          addresses: [
            cardanoAccount0AddrWithData,
            cardanoAccount1AddrWithData,
            cardanoAccount2AddrWithData,
          ],
          addressesHistories: {},
        }),
        // Should wait for all requests to finish or exit on first error
      ).toBe('--(a|)', {
        // We can't compare directly to Err(…) because of different stack trace
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        a: expect.objectContaining({
          error: {
            address: CardanoPaymentAddress(cardanoAccount1AddrWithData.address),
            error: address2Error,
          },
        }),
      });
    });
  });
});

describe('fetchNewAddressTransactionHistories', () => {
  const mockGetAddressTransactionHistory = vi.fn();

  const createBasicParams = (): FetchAddressTransactionHistoriesParams => ({
    addresses: [cardanoAccount0AddrWithData, cardanoAccount1AddrWithData],
    addressesHistories: {},
    numberOfItems: ACTIVITIES_PER_PAGE,
    chainId,
    getAddressTransactionHistory: mockGetAddressTransactionHistory,
  });

  beforeEach(() => {
    mockGetAddressTransactionHistory.mockReset();
  });

  it('fetches from multiple addresses in parallel and returns a combined result', () => {
    createTestScheduler().run(({ expectObservable, cold }) => {
      const address1 = CardanoPaymentAddress(cardanoAccount0Addr.address);
      const address2 = CardanoPaymentAddress(cardanoAccount1Addr.address);
      const address3 = CardanoPaymentAddress(cardanoAccount2Addr1.address);

      // Mock parallel request responses which finish in random order
      const tx1ToLoadResult = [createHistoryItem(txId1)];
      const tx2ToLoadResult = [createHistoryItem(txId2)];
      const tx3ToLoadResult = [createHistoryItem(txId3)];
      mockGetAddressTransactionHistory
        .mockReturnValueOnce(cold('(a|)', { a: Ok(tx1ToLoadResult) })) // 1st
        .mockReturnValueOnce(cold('--(a|)', { a: Ok(tx2ToLoadResult) })) // 3rd
        .mockReturnValueOnce(cold('-(a|)', { a: Ok(tx3ToLoadResult) })); // 2nd

      expectObservable(
        fetchNewAddressTransactionHistories({
          ...createBasicParams(),
          addresses: [
            cardanoAccount0AddrWithData,
            cardanoAccount1AddrWithData,
            cardanoAccount2AddrWithData,
          ],
          addressesHistories: {},
        }),
        // It should wait for all requests to finish and combine them
      ).toBe('--(a|)', {
        a: Ok([
          {
            address: address1,
            transactionHistory: tx1ToLoadResult,
            hasLoadedOldestEntry: true,
          },
          {
            address: address2,
            transactionHistory: tx2ToLoadResult,
            hasLoadedOldestEntry: true,
          },
          {
            address: address3,
            transactionHistory: tx3ToLoadResult,
            hasLoadedOldestEntry: true,
          },
        ]),
      });
    });
  });

  describe('pagination', () => {
    it('starts from beginning if no transaction history exists yet', () => {
      createTestScheduler().run(({ expectObservable, flush }) => {
        const address = CardanoPaymentAddress(cardanoAccount0Addr.address);

        const addressesHistories: CardanoAddressTransactionHistoryMap = {
          [address]: {
            hasLoadedOldestEntry: false,
            transactionHistory: [], // Empty history
          },
        };

        const txsToLoadResult = [
          createHistoryItem(txId2, 98, 1),
          createHistoryItem(txId2, 98, 2),
          createHistoryItem(txId2, 99),
          createHistoryItem(txId1, 100),
        ];
        mockGetAddressTransactionHistory.mockReturnValueOnce(
          of(Ok(txsToLoadResult)),
        );

        expectObservable(
          fetchNewAddressTransactionHistories({
            ...createBasicParams(),
            addresses: [cardanoAccount0AddrWithData],
            addressesHistories,
          }),
        ).toBe('(a|)', {
          a: Ok([
            {
              address,
              transactionHistory: txsToLoadResult.sort(
                (a, b) =>
                  Number(b.blockTime) - Number(a.blockTime) ||
                  Number(b.txIndex) - Number(a.txIndex),
              ),
              hasLoadedOldestEntry: true,
            },
          ]),
        });
        flush();
        // Verify no pagination parameters were passed
        expect(mockGetAddressTransactionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            address,
            numberOfItems: ACTIVITIES_PER_PAGE,
            // Should not have endAtBlock or endAtIndex
          }),
          expect.objectContaining({ chainId }),
        );
      });
    });

    it('uses buildEndAtParamsFromTx for paginated loading', () => {
      createTestScheduler().run(({ expectObservable, flush }) => {
        // Setup address with existing history
        const address = CardanoPaymentAddress(cardanoAccount0Addr.address);
        const newestTx = createHistoryItem(txId1, 100, 0);

        const addressesHistories: CardanoAddressTransactionHistoryMap = {
          [address]: {
            hasLoadedOldestEntry: false,
            transactionHistory: [newestTx, createHistoryItem(txId2, 101, 0)],
          },
        };

        const txToLoadResult = [createHistoryItem(txId3, 100, 1), newestTx];
        mockGetAddressTransactionHistory.mockReturnValueOnce(
          of(Ok(txToLoadResult)),
        );

        expectObservable(
          fetchNewAddressTransactionHistories({
            ...createBasicParams(),
            addresses: [cardanoAccount0AddrWithData],
            addressesHistories,
          }),
        ).toBe('(a|)', {
          a: Ok([
            {
              address,
              transactionHistory: txToLoadResult.concat(
                addressesHistories[address].transactionHistory,
              ),
              hasLoadedOldestEntry: false,
            },
          ]),
        });
        flush();
        // Verify pagination parameters were correctly calculated
        expect(mockGetAddressTransactionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            address,
            endAtBlock: Cardano.BlockNo(100),
            endAtIndex: Cardano.TxIndex(1), // newestTx.txIndex
            order: 'asc',
          }),
          expect.objectContaining({ chainId }),
        );
      });
    });
  });

  it('handles errors for individual address requests correctly', () => {
    createTestScheduler().run(({ expectObservable, cold }) => {
      const tx1ToLoadResult = [createHistoryItem(txId1)];
      const address2Error = new ProviderError(ProviderFailure.Unknown);
      const address3Error = new ProviderError(ProviderFailure.InvalidResponse);
      mockGetAddressTransactionHistory
        .mockReturnValueOnce(cold('(a|)', { a: Ok(tx1ToLoadResult) }))
        .mockReturnValueOnce(cold('-(a|)', { a: Err(address2Error) }))
        .mockReturnValueOnce(cold('--(a|)', { a: Err(address3Error) }));

      expectObservable(
        fetchNewAddressTransactionHistories({
          ...createBasicParams(),
          addresses: [
            cardanoAccount0AddrWithData,
            cardanoAccount1AddrWithData,
            cardanoAccount2AddrWithData,
          ],
          addressesHistories: {},
        }),
        // Should wait for all requests to finish and complete with the first error
      ).toBe('--(a|)', {
        // We can't compare directly to Err(…) because of different stack trace
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        a: expect.objectContaining({
          error: {
            address: CardanoPaymentAddress(cardanoAccount1AddrWithData.address),
            error: address2Error,
          },
        }),
      });
    });
  });
});
