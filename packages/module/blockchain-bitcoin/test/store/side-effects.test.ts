/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { activitiesActions, ActivityType } from '@lace-contract/activities';
import { addressesActions } from '@lace-contract/addresses';
import {
  BITCOIN_TOKEN_ID,
  BitcoinNetwork,
  BitcoinNetworkId,
  BitcoinTransactionStatus,
} from '@lace-contract/bitcoin-context';
import {
  BlockchainNetworkId,
  networkActions,
  type BlockchainNetworkConfig,
  type NetworkSliceState,
} from '@lace-contract/network';
import { tokensActions } from '@lace-contract/tokens';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber, Milliseconds, Timestamp, Err, Ok } from '@lace-sdk/util';
import { BehaviorSubject, EMPTY, of } from 'rxjs';
import * as rxjs from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddressType, ChainType } from '../../src/common';
import {
  bitcoinContextActions,
  createBitcoinProviderSideEffects,
  deriveBitcoinTestnetOptions,
  mapBitcoinTxToActivity,
} from '../../src/store';
import { trackTip } from '../../src/store/side-effects';
import { BitcoinWallet } from '../../src/wallet';

import type { DerivedAddress } from '../../src/common';
import type { Address } from '@lace-contract/addresses';
import type {
  BitcoinBip32AccountProps,
  BitcoinInFlightUtxoActivityMetadata,
  BitcoinTransactionHistoryEntry,
  BitcoinProvider,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';
import type { InMemoryWalletAccount } from '@lace-contract/wallet-repo';

vi.mock('../../src/wallet', () => {
  const BitcoinWallet = vi.fn();
  BitcoinWallet.prototype.addresses$ = new BehaviorSubject([]);
  BitcoinWallet.prototype.balance$ = new BehaviorSubject(0);
  BitcoinWallet.prototype.transactionHistory$ = new BehaviorSubject([]);
  BitcoinWallet.prototype.pendingTransactions$ = new BehaviorSubject([]);
  BitcoinWallet.prototype.syncStatus$ = EMPTY;
  BitcoinWallet.prototype.fetchTxHistoryUpTo = vi.fn(() => of(Ok(false)));
  return { BitcoinWallet };
});

const mockBitcoinWalletInstance = {
  addresses$: new BehaviorSubject<DerivedAddress[]>([]),
  balance$: new BehaviorSubject<number>(0),
  utxos$: new BehaviorSubject<BitcoinUTxO[]>([]),
  transactionHistory$: new BehaviorSubject<BitcoinTransactionHistoryEntry[]>(
    [],
  ),
  pendingTransactions$: new BehaviorSubject<BitcoinTransactionHistoryEntry[]>(
    [],
  ),
  syncStatus$: EMPTY,
  fetchTxHistoryUpTo: vi.fn(() => of(Ok(false))),
};

vi.mocked(BitcoinWallet).mockImplementation(
  () => mockBitcoinWalletInstance as never,
);

const actions = {
  ...addressesActions,
  ...tokensActions,
  ...activitiesActions,
  ...bitcoinContextActions,
  ...networkActions,
};

const [
  registerBitcoinBlockchainNetworksSideEffect,
  registerBitcoinTestnetOptionsSideEffect,
  startBitcoinWallet,
  trackTipSideEffect,
] = createBitcoinProviderSideEffects({
  bitcoinProvider: {
    historyDepth: 20,
    tipPollFrequency: 60_000,
    maestroConfig: {
      testnet4: {},
    },
  },
} as never);

describe('side effects', () => {
  describe('registerBitcoinBlockchainNetworks', () => {
    it('dispatches setBlockchainNetworks when Bitcoin not registered', () => {
      testSideEffect(
        registerBitcoinBlockchainNetworksSideEffect,
        ({ cold, expectObservable }) => {
          const selectBlockchainNetworks$ = cold<
            Partial<Record<string, BlockchainNetworkConfig>>
          >('(a|)', { a: {} });

          return {
            stateObservables: {
              network: { selectBlockchainNetworks$ },
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('(a|)', {
                a: actions.network.setBlockchainNetworks({
                  blockchain: 'Bitcoin',
                  mainnet: BitcoinNetworkId('mainnet'),
                  testnet: BitcoinNetworkId('testnet4'),
                }),
              });
            },
          };
        },
      );
    });

    it('does nothing when Bitcoin already registered', () => {
      testSideEffect(
        registerBitcoinBlockchainNetworksSideEffect,
        ({ cold, expectObservable }) => {
          const selectBlockchainNetworks$ = cold<
            Partial<Record<string, BlockchainNetworkConfig>>
          >('(a|)', {
            a: {
              Bitcoin: {
                mainnet: BitcoinNetworkId('mainnet'),
                testnet: BitcoinNetworkId('testnet4'),
              },
            },
          });

          return {
            stateObservables: {
              network: { selectBlockchainNetworks$ },
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('|');
            },
          };
        },
      );
    });
  });

  describe('deriveBitcoinTestnetOptions', () => {
    it('returns testnet option when testnet is configured', () => {
      const config = {
        bitcoinProvider: {
          maestroConfig: {
            [BitcoinNetwork.Testnet]: {},
          },
        },
      };

      const result = deriveBitcoinTestnetOptions(config as never);

      expect(result).toEqual([
        {
          id: BitcoinNetworkId('testnet4'),
          label: 'bitcoin.network-config.network-option.testnet4',
        },
      ]);
    });

    it('returns empty array when only mainnet is configured', () => {
      const config = {
        bitcoinProvider: {
          maestroConfig: {
            [BitcoinNetwork.Mainnet]: {},
          },
        },
      };

      const result = deriveBitcoinTestnetOptions(config as never);

      expect(result).toEqual([]);
    });

    it('returns empty array when maestroConfig is undefined', () => {
      const config = { bitcoinProvider: {} };

      const result = deriveBitcoinTestnetOptions(config as never);

      expect(result).toEqual([]);
    });
  });

  describe('registerBitcoinTestnetOptions', () => {
    it('dispatches setTestnetOptions when Bitcoin not registered', () => {
      testSideEffect(
        registerBitcoinTestnetOptionsSideEffect,
        ({ cold, expectObservable }) => {
          const selectTestnetOptions$ = cold<
            NetworkSliceState['testnetOptions']
          >('(a|)', { a: {} });

          return {
            stateObservables: {
              network: { selectTestnetOptions$ },
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('(a|)', {
                a: actions.network.setTestnetOptions({
                  blockchainName: 'Bitcoin',
                  options: [
                    {
                      id: BitcoinNetworkId('testnet4'),
                      label: 'bitcoin.network-config.network-option.testnet4',
                    },
                  ],
                }),
              });
            },
          };
        },
      );
    });

    it('does nothing when Bitcoin already registered', () => {
      testSideEffect(
        registerBitcoinTestnetOptionsSideEffect,
        ({ cold, expectObservable }) => {
          const selectTestnetOptions$ = cold<
            NetworkSliceState['testnetOptions']
          >('(a|)', {
            a: {
              Bitcoin: [
                {
                  id: BitcoinNetworkId('testnet4'),
                  label: 'bitcoin.network-config.network-option.testnet4',
                },
              ],
            },
          });

          return {
            stateObservables: {
              network: { selectTestnetOptions$ },
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('|');
            },
          };
        },
      );
    });
  });

  describe('startBitcoinWallet side effect', () => {
    const mockBitcoinProvider = {} as never;
    const mockBitcoinFeeMarketProvider = {} as never;
    const mockBitcoinAccountWallets$ = new BehaviorSubject({});

    const bitcoinAccount: InMemoryWalletAccount<BitcoinBip32AccountProps> = {
      accountId: AccountId('acc-btc-1'),
      walletId: WalletId('w1'),
      blockchainName: 'Bitcoin',
      networkType: BitcoinNetwork.Mainnet,
      blockchainNetworkId: BitcoinNetworkId(BitcoinNetwork.Mainnet),
      metadata: { name: 'BTC Acc #0' },
      accountType: 'InMemory',
      blockchainSpecific: {
        accountIndex: 0,
        extendedAccountPublicKeys: {
          nativeSegWit: 'xpub...',
          taproot: 'xpub...',
        } as never,
      },
    };

    const cardanoAccount: InMemoryWalletAccount = {
      accountId: AccountId('acc-ada-1'),
      walletId: WalletId('w1'),
      blockchainName: 'Cardano',
      networkType: 'mainnet',
      blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
      metadata: { name: 'ADA Acc #0' },
      accountType: 'InMemory',
      blockchainSpecific: {},
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockBitcoinWalletInstance.addresses$.next([]);
      mockBitcoinWalletInstance.balance$.next(0);
      mockBitcoinWalletInstance.transactionHistory$.next([]);
      mockBitcoinWalletInstance.pendingTransactions$.next([]);
      mockBitcoinWalletInstance.fetchTxHistoryUpTo.mockClear();
    });

    it('should create a wallet and dispatch address, token, and activity actions', () => {
      const derivedAddress: DerivedAddress = {
        address: 'bc1q_my_address',
        addressType: AddressType.NativeSegWit,
        network: BitcoinNetwork.Mainnet,
        account: 0,
        chain: ChainType.External,
        index: 0,
        publicKeyHex: '02...',
      };
      const balance = 1_000_000;
      const rawTx: BitcoinTransactionHistoryEntry = {
        transactionHash: 'tx_hash_1',
        inputs: [
          {
            address: 'bc1q_sender_address' as Address,
            satoshis: 1_500_000,
            txId: 'prev_tx',
            index: 0,
            isCoinbase: false,
          },
        ],
        outputs: [
          { address: 'bc1q_my_address', satoshis: 1_000_000 },
          { address: 'bc1q_change_address', satoshis: 490_000 },
        ],
        timestamp: Date.now() / 1000,
        confirmations: 10,
        status: BitcoinTransactionStatus.Confirmed,
        blockHeight: 700_000,
      };

      mockBitcoinWalletInstance.addresses$.next([derivedAddress]);
      mockBitcoinWalletInstance.balance$.next(balance);
      mockBitcoinWalletInstance.transactionHistory$.next([rawTx]);

      testSideEffect(startBitcoinWallet, ({ hot, expectObservable }) => {
        const selectActiveNetworkAccounts$ = hot('a', {
          a: [bitcoinAccount, cardanoAccount],
        });
        const selectDesiredLoadedActivitiesCountPerAccount$ = hot('a', {
          a: {},
        });
        const selectAllMap$ = hot('a', { a: {} });

        const selectTip$ = hot('a', { a: undefined });
        const selectNetwork$ = hot<BitcoinNetwork | undefined>('a', {
          a: BitcoinNetwork.Mainnet,
        });

        const requestResync$ = EMPTY;

        const expectedAddressAction = actions.addresses.upsertAddresses({
          accountId: bitcoinAccount.accountId,
          addresses: [
            {
              address: derivedAddress.address,
              accountId: bitcoinAccount.accountId,
              data: { network: derivedAddress.network },
            } as never,
          ],
          blockchainName: 'Bitcoin',
        });

        const expectedActivityAction = actions.activities.upsertActivities({
          accountId: bitcoinAccount.accountId,
          activities: [
            {
              accountId: bitcoinAccount.accountId,
              activityId: rawTx.transactionHash,
              type: ActivityType.Receive,
              tokenBalanceChanges: [
                {
                  tokenId: BITCOIN_TOKEN_ID,
                  amount: BigNumber(BigInt(1_000_000)),
                },
              ],
              timestamp: Timestamp(rawTx.timestamp * 1000),
            },
          ],
        });

        return {
          actionObservables: {
            bitcoinContext: { requestResync$, getTipFailed$: EMPTY },
          },
          stateObservables: {
            bitcoinContext: { selectTip$, selectNetwork$ },
            wallets: { selectActiveNetworkAccounts$ },
            activities: {
              selectDesiredLoadedActivitiesCountPerAccount$,
              selectAllMap$,
            },
          },
          dependencies: {
            bitcoinProvider: mockBitcoinProvider,
            bitcoinAccountWallets$: mockBitcoinAccountWallets$,
            bitcoinFeeMarketProvider: mockBitcoinFeeMarketProvider,
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            // Token action is skipped (skip(1) to preserve persisted data)
            expectObservable(sideEffect$).toBe('(bd)', {
              b: expectedAddressAction,
              d: expectedActivityAction,
            });
          },
        };
      });

      expect(BitcoinWallet).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if no bitcoin accounts are found', () => {
      testSideEffect(startBitcoinWallet, ({ hot, expectObservable }) => {
        const selectActiveNetworkAccounts$ = hot('a', { a: [cardanoAccount] });
        const selectDesiredLoadedActivitiesCountPerAccount$ = hot('a', {
          a: {},
        });
        const selectAllMap$ = hot('a', { a: {} });

        const selectTip$ = hot('a', { a: undefined });
        const selectNetwork$ = hot<BitcoinNetwork | undefined>('a', {
          a: BitcoinNetwork.Mainnet,
        });

        const requestResync$ = EMPTY;

        return {
          actionObservables: {
            bitcoinContext: { requestResync$, getTipFailed$: EMPTY },
          },
          stateObservables: {
            bitcoinContext: { selectTip$, selectNetwork$ },
            wallets: { selectActiveNetworkAccounts$ },
            activities: {
              selectDesiredLoadedActivitiesCountPerAccount$,
              selectAllMap$,
            },
          },
          dependencies: {
            bitcoinProvider: mockBitcoinProvider,
            bitcoinAccountWallets$: mockBitcoinAccountWallets$,
            bitcoinFeeMarketProvider: mockBitcoinFeeMarketProvider,
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
          },
        };
      });

      expect(BitcoinWallet).not.toHaveBeenCalled();
    });

    describe('history fetching', () => {
      const expectedInitialAddressAction = actions.addresses.upsertAddresses({
        accountId: bitcoinAccount.accountId,
        addresses: [],
        blockchainName: 'Bitcoin',
      });

      const expectedInitialActivityAction = actions.activities.upsertActivities(
        {
          accountId: bitcoinAccount.accountId,
          activities: [],
        },
      );

      it('should call fetchTxHistoryUpTo when desired activity count is higher than loaded', () => {
        testSideEffect(
          startBitcoinWallet,
          ({ hot, expectObservable, flush }) => {
            const selectActiveNetworkAccounts$ = hot('a', {
              a: [bitcoinAccount],
            });

            const selectDesiredLoadedActivitiesCountPerAccount$ = hot('-a', {
              a: { [bitcoinAccount.accountId]: 25 },
            });

            const selectAllMap$ = hot('a', {
              a: { [bitcoinAccount.accountId]: Array(10).fill({}) },
            });

            const selectTip$ = hot('a', { a: undefined });
            const selectNetwork$ = hot('a', { a: BitcoinNetwork.Mainnet });

            const requestResync$ = EMPTY;

            return {
              actionObservables: {
                bitcoinContext: { requestResync$, getTipFailed$: EMPTY },
              },
              stateObservables: {
                bitcoinContext: { selectTip$, selectNetwork$ },
                wallets: { selectActiveNetworkAccounts$ },
                activities: {
                  selectDesiredLoadedActivitiesCountPerAccount$,
                  selectAllMap$,
                },
              },
              dependencies: {
                bitcoinProvider: mockBitcoinProvider,
                bitcoinAccountWallets$: mockBitcoinAccountWallets$,
                bitcoinFeeMarketProvider: mockBitcoinFeeMarketProvider,
                actions,
                logger: dummyLogger,
              },
              assertion: sideEffect$ => {
                // Token action is skipped (skip(1) to preserve persisted data)
                expectObservable(sideEffect$).toBe('(ac)', {
                  a: expectedInitialAddressAction,
                  c: expectedInitialActivityAction,
                });

                flush();

                expect(
                  mockBitcoinWalletInstance.fetchTxHistoryUpTo,
                ).toHaveBeenCalledTimes(1);
                expect(
                  mockBitcoinWalletInstance.fetchTxHistoryUpTo,
                ).toHaveBeenCalledWith(25);
              },
            };
          },
        );
      });

      it('should NOT call fetchTxHistoryUpTo when desired activity count is met', () => {
        testSideEffect(
          startBitcoinWallet,
          ({ hot, expectObservable, flush }) => {
            const selectActiveNetworkAccounts$ = hot('a', {
              a: [bitcoinAccount],
            });
            const selectDesiredLoadedActivitiesCountPerAccount$ = hot('-a', {
              a: { [bitcoinAccount.accountId]: 10 },
            });
            const selectAllMap$ = hot('a', {
              a: { [bitcoinAccount.accountId]: Array(10).fill({}) },
            });

            const selectTip$ = hot('a', { a: undefined });
            const selectNetwork$ = hot('a', { a: BitcoinNetwork.Mainnet });

            const requestResync$ = EMPTY;

            return {
              actionObservables: {
                bitcoinContext: { requestResync$, getTipFailed$: EMPTY },
              },
              stateObservables: {
                bitcoinContext: { selectTip$, selectNetwork$ },
                wallets: { selectActiveNetworkAccounts$ },
                activities: {
                  selectDesiredLoadedActivitiesCountPerAccount$,
                  selectAllMap$,
                },
              },
              dependencies: {
                bitcoinProvider: mockBitcoinProvider,
                bitcoinAccountWallets$: mockBitcoinAccountWallets$,
                bitcoinFeeMarketProvider: mockBitcoinFeeMarketProvider,
                actions,
                logger: dummyLogger,
              },
              assertion: sideEffect$ => {
                // Token action is skipped (skip(1) to preserve persisted data)
                expectObservable(sideEffect$).toBe('(ac)', {
                  a: expectedInitialAddressAction,
                  c: expectedInitialActivityAction,
                });

                flush();

                expect(
                  mockBitcoinWalletInstance.fetchTxHistoryUpTo,
                ).not.toHaveBeenCalled();
              },
            };
          },
        );
      });

      it('should dispatch a failure action if fetchTxHistoryUpTo returns an error', () => {
        const mockError = new ProviderError(ProviderFailure.BadRequest);

        mockBitcoinWalletInstance.fetchTxHistoryUpTo.mockImplementation(
          () => of(Err(mockError)) as never,
        );

        testSideEffect(
          startBitcoinWallet,
          ({ hot, expectObservable, flush }) => {
            const selectActiveNetworkAccounts$ = hot('a', {
              a: [bitcoinAccount],
            });
            const selectDesiredLoadedActivitiesCountPerAccount$ = hot(
              '-----a',
              {
                a: { [bitcoinAccount.accountId]: 25 },
              },
            );
            const selectAllMap$ = hot('a', {
              a: { [bitcoinAccount.accountId]: Array(10).fill({}) },
            });

            const selectTip$ = hot('a', { a: undefined });
            const selectNetwork$ = hot('a', { a: BitcoinNetwork.Mainnet });

            const requestResync$ = EMPTY;

            const expectedErrorAction =
              actions.bitcoinContext.getAddressTransactionHistoryFailed({
                accountId: bitcoinAccount.accountId,
                failure: mockError.reason,
              });

            return {
              actionObservables: {
                bitcoinContext: { requestResync$, getTipFailed$: EMPTY },
              },
              stateObservables: {
                bitcoinContext: { selectTip$, selectNetwork$ },
                wallets: { selectActiveNetworkAccounts$ },
                activities: {
                  selectDesiredLoadedActivitiesCountPerAccount$,
                  selectAllMap$,
                },
              },
              dependencies: {
                bitcoinProvider: mockBitcoinProvider,
                bitcoinAccountWallets$: mockBitcoinAccountWallets$,
                bitcoinFeeMarketProvider: mockBitcoinFeeMarketProvider,
                actions,
                logger: dummyLogger,
              },
              assertion: sideEffect$ => {
                // Token action is skipped (skip(1) to preserve persisted data)
                expectObservable(sideEffect$).toBe('(ac)-d', {
                  a: expectedInitialAddressAction,
                  c: expectedInitialActivityAction,
                  d: expectedErrorAction,
                });

                flush();

                expect(
                  mockBitcoinWalletInstance.fetchTxHistoryUpTo,
                ).toHaveBeenCalledTimes(1);
              },
            };
          },
        );
      });
    });

    describe('mapBitcoinTxToActivity', () => {
      const userAddresses = new Set(['my_address_1', 'my_address_2']);
      const accountId = AccountId('acc-btc-1');
      const baseTx: BitcoinTransactionHistoryEntry = {
        transactionHash: 'tx_hash_abc',
        confirmations: 10,
        timestamp: Math.floor(Date.now() / 1000),
        inputs: [],
        outputs: [],
        status: BitcoinTransactionStatus.Confirmed,
        blockHeight: 700_000,
      };

      it('should classify as Receive when net amount is positive', () => {
        const rawTx: BitcoinTransactionHistoryEntry = {
          ...baseTx,
          inputs: [
            {
              address: 'external_sender',
              satoshis: 150_000,
              txId: 'tx1',
              index: 0,
              isCoinbase: false,
            },
          ],
          outputs: [{ address: 'my_address_1', satoshis: 150_000 }],
        };

        const activity = mapBitcoinTxToActivity(
          rawTx,
          userAddresses,
          accountId,
        );

        expect(activity.type).toBe(ActivityType.Receive);
        expect(BigNumber.valueOf(activity.tokenBalanceChanges[0].amount)).toBe(
          BigInt(150_000),
        );
      });

      it('should classify as Send when net amount is negative', () => {
        const rawTx: BitcoinTransactionHistoryEntry = {
          ...baseTx,
          inputs: [
            {
              address: 'my_address_1',
              satoshis: 200_000,
              txId: 'tx1',
              index: 0,
              isCoinbase: false,
            },
          ],
          outputs: [
            { address: 'external_recipient', satoshis: 100_000 },
            { address: 'my_address_2', satoshis: 90_000 }, // Change
          ],
        };
        const activity = mapBitcoinTxToActivity(
          rawTx,
          userAddresses,
          accountId,
        );

        expect(activity.type).toBe(ActivityType.Send);
        expect(BigNumber.valueOf(activity.tokenBalanceChanges[0].amount)).toBe(
          BigInt(-110_000),
        );
      });

      it('should classify as Self when only own addresses are involved', () => {
        const rawTx: BitcoinTransactionHistoryEntry = {
          ...baseTx,
          inputs: [
            {
              address: 'my_address_1',
              satoshis: 200_000,
              txId: 'tx1',
              index: 0,
              isCoinbase: false,
            },
          ],
          outputs: [{ address: 'my_address_2', satoshis: 195_000 }],
        };
        const activity = mapBitcoinTxToActivity(
          rawTx,
          userAddresses,
          accountId,
        );

        expect(activity.type).toBe(ActivityType.Self);
        expect(BigNumber.valueOf(activity.tokenBalanceChanges[0].amount)).toBe(
          BigInt(-5_000),
        );
      });

      it('should handle zero-amount transactions', () => {
        const rawTx: BitcoinTransactionHistoryEntry = {
          ...baseTx,
          inputs: [
            {
              address: 'external_1',
              satoshis: 50_000,
              txId: 'tx1',
              index: 0,
              isCoinbase: false,
            },
          ],
          outputs: [{ address: 'external_2', satoshis: 50_000 }],
        };
        const activity = mapBitcoinTxToActivity(
          rawTx,
          userAddresses,
          accountId,
        );

        expect(activity.type).toBe(ActivityType.Send);
        expect(BigNumber.valueOf(activity.tokenBalanceChanges[0].amount)).toBe(
          BigInt(0),
        );
      });

      it('attaches in-flight consumedInputs for pending (unconfirmed) txs', () => {
        const rawTx: BitcoinTransactionHistoryEntry = {
          ...baseTx,
          confirmations: 0,
          status: BitcoinTransactionStatus.Pending,
          inputs: [
            {
              address: 'my_address_1',
              satoshis: 200_000,
              txId: 'spent_tx',
              index: 1,
              isCoinbase: false,
            },
            {
              address: 'my_address_2',
              satoshis: 50_000,
              txId: 'spent_tx_2',
              index: 0,
              isCoinbase: false,
            },
          ],
          outputs: [
            { address: 'external_recipient', satoshis: 100_000 },
            { address: 'my_address_1', satoshis: 149_000 },
          ],
        };

        const activity = mapBitcoinTxToActivity(
          rawTx,
          userAddresses,
          accountId,
        );

        expect(activity.type).toBe(ActivityType.Pending);
        const inFlight = (
          activity.blockchainSpecific as
            | { Bitcoin?: BitcoinInFlightUtxoActivityMetadata }
            | undefined
        )?.Bitcoin;
        expect(inFlight?.consumedInputs).toEqual([
          { txId: 'spent_tx', index: 1 },
          { txId: 'spent_tx_2', index: 0 },
        ]);
        expect(inFlight?.producedOutputs).toEqual([]);
      });

      it('does not attach in-flight metadata for confirmed txs', () => {
        const rawTx: BitcoinTransactionHistoryEntry = {
          ...baseTx,
          confirmations: 3,
          inputs: [
            {
              address: 'external_sender',
              satoshis: 150_000,
              txId: 'tx1',
              index: 0,
              isCoinbase: false,
            },
          ],
          outputs: [{ address: 'my_address_1', satoshis: 150_000 }],
        };

        const activity = mapBitcoinTxToActivity(
          rawTx,
          userAddresses,
          accountId,
        );

        expect(activity.type).toBe(ActivityType.Receive);
        expect(activity.blockchainSpecific).toBeUndefined();
      });
    });
  });

  describe('trackTip side effect', () => {
    const bitcoinAccountForTip = {
      blockchainName: 'Bitcoin' as const,
    } as InMemoryWalletAccount;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('dispatches setTip(undefined) when network is undefined', () => {
      const getLastKnownBlock = vi.fn();

      vi.spyOn(rxjs, 'interval').mockReturnValue(EMPTY);

      testSideEffect(trackTipSideEffect, ({ hot, expectObservable }) => {
        const selectNetwork$ = hot<BitcoinNetwork | undefined>('a', {
          a: undefined,
        });
        const selectActiveNetworkAccounts$ = hot('a', {
          a: [bitcoinAccountForTip],
        });

        const expectedAction = actions.bitcoinContext.setTip(undefined);

        return {
          stateObservables: {
            bitcoinContext: { selectNetwork$ },
            wallets: { selectActiveNetworkAccounts$ },
          },
          dependencies: {
            bitcoinProvider: {
              getLastKnownBlock,
            } as unknown as BitcoinProvider,
            actions,
            isWalletActive$: of(true),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: expectedAction,
            });
          },
        };
      });

      expect(getLastKnownBlock).not.toHaveBeenCalled();
    });

    it('does not poll when there are no bitcoin accounts', () => {
      const getLastKnownBlock = vi.fn();

      vi.spyOn(rxjs, 'interval').mockReturnValue(EMPTY);

      testSideEffect(trackTipSideEffect, ({ hot, flush }) => {
        const selectNetwork$ = hot<BitcoinNetwork | undefined>('a', {
          a: BitcoinNetwork.Testnet,
        });
        const selectActiveNetworkAccounts$ = hot('a', {
          a: [] as InMemoryWalletAccount[],
        });

        return {
          stateObservables: {
            bitcoinContext: { selectNetwork$ },
            wallets: { selectActiveNetworkAccounts$ },
          },
          dependencies: {
            bitcoinProvider: {
              getLastKnownBlock,
            } as unknown as BitcoinProvider,
            actions,
            isWalletActive$: of(true),
          },
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(action => emissions.push(action));
            flush();
            expect(emissions).toHaveLength(0);
          },
        };
      });

      expect(getLastKnownBlock).not.toHaveBeenCalled();
    });

    it('dispatches setTip on successful poll', () => {
      const fakeTip = {
        hash: 'block-hash-1',
        height: 123_456,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const getLastKnownBlock = vi.fn().mockReturnValue(of(Ok(fakeTip)));

      vi.spyOn(rxjs, 'interval').mockReturnValue(EMPTY);

      testSideEffect(trackTipSideEffect, ({ hot, expectObservable }) => {
        const selectNetwork$ = hot<BitcoinNetwork | undefined>('a', {
          a: BitcoinNetwork.Testnet,
        });
        const selectActiveNetworkAccounts$ = hot('a', {
          a: [bitcoinAccountForTip],
        });

        const expectedAction = actions.bitcoinContext.setTip(fakeTip);

        return {
          stateObservables: {
            bitcoinContext: { selectNetwork$ },
            wallets: { selectActiveNetworkAccounts$ },
          },
          dependencies: {
            bitcoinProvider: {
              getLastKnownBlock,
            } as unknown as BitcoinProvider,
            actions,
            isWalletActive$: of(true),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: expectedAction,
            });
          },
        };
      });

      expect(getLastKnownBlock).toHaveBeenCalledWith({
        network: BitcoinNetwork.Testnet,
      });
    });

    it('dispatches getTipFailed on provider error', () => {
      const error = new ProviderError(ProviderFailure.BadRequest);

      const getLastKnownBlock = vi.fn().mockReturnValue(of(Err(error)));

      vi.spyOn(rxjs, 'interval').mockReturnValue(EMPTY);

      testSideEffect(trackTipSideEffect, ({ hot, expectObservable }) => {
        const selectNetwork$ = hot<BitcoinNetwork | undefined>('a', {
          a: BitcoinNetwork.Mainnet,
        });
        const selectActiveNetworkAccounts$ = hot('a', {
          a: [bitcoinAccountForTip],
        });

        const expectedAction = actions.bitcoinContext.getTipFailed({
          failure: error.reason,
          network: BitcoinNetwork.Mainnet,
        });

        return {
          stateObservables: {
            bitcoinContext: { selectNetwork$ },
            wallets: { selectActiveNetworkAccounts$ },
          },
          dependencies: {
            bitcoinProvider: {
              getLastKnownBlock,
            } as unknown as BitcoinProvider,
            actions,
            isWalletActive$: of(true),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: expectedAction,
            });
          },
        };
      });

      expect(getLastKnownBlock).toHaveBeenCalledWith({
        network: BitcoinNetwork.Mainnet,
      });
    });

    it('restarts polling when network changes (distinctUntilChanged)', () => {
      const fakeTip1 = { hash: 'tip-1', height: 1 };
      const fakeTip2 = { hash: 'tip-2', height: 2 };

      const getLastKnownBlock = vi
        .fn()
        .mockReturnValueOnce(of(Ok(fakeTip1)))
        .mockReturnValueOnce(of(Ok(fakeTip2)));

      vi.spyOn(rxjs, 'interval').mockReturnValue(EMPTY);

      testSideEffect(trackTipSideEffect, ({ hot, expectObservable }) => {
        const selectNetwork$ = hot<BitcoinNetwork | undefined>('a-b', {
          a: BitcoinNetwork.Testnet,
          b: BitcoinNetwork.Mainnet,
        });
        const selectActiveNetworkAccounts$ = hot('a', {
          a: [bitcoinAccountForTip],
        });

        const expectedAction1 = actions.bitcoinContext.setTip(fakeTip1);
        const expectedAction2 = actions.bitcoinContext.setTip(fakeTip2);

        return {
          stateObservables: {
            bitcoinContext: { selectNetwork$ },
            wallets: { selectActiveNetworkAccounts$ },
          },
          dependencies: {
            bitcoinProvider: {
              getLastKnownBlock,
            } as unknown as BitcoinProvider,
            actions,
            isWalletActive$: of(true),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a-b', {
              a: expectedAction1,
              b: expectedAction2,
            });
          },
        };
      });

      expect(getLastKnownBlock).toHaveBeenCalledTimes(2);
    });

    it('does not call getLastKnownBlock while wallet is inactive', () => {
      const getLastKnownBlock = vi.fn();

      vi.spyOn(rxjs, 'interval').mockReturnValue(EMPTY);

      testSideEffect(trackTipSideEffect, ({ hot, expectObservable, flush }) => {
        const selectNetwork$ = hot<BitcoinNetwork | undefined>('a', {
          a: BitcoinNetwork.Testnet,
        });
        const selectActiveNetworkAccounts$ = hot('a', {
          a: [bitcoinAccountForTip],
        });

        return {
          stateObservables: {
            bitcoinContext: { selectNetwork$ },
            wallets: { selectActiveNetworkAccounts$ },
            // `hot` (no `|`) so the gate stays subscribed across the window
            // — `of(false)` would complete and propagate completion through
            // `whileActive`'s `switchMap`, ending the side effect early.
          },
          dependencies: {
            bitcoinProvider: {
              getLastKnownBlock,
            } as unknown as BitcoinProvider,
            actions,
            isWalletActive$: hot('f', { f: false }),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^----!').toBe('-----');
            flush();
            expect(getLastKnownBlock).not.toHaveBeenCalled();
          },
        };
      });
    });

    it('resumes polling with an immediate request when wallet becomes active', () => {
      const fakeTip = { hash: 'tip-on-unlock', height: 100 };
      const getLastKnownBlock = vi.fn().mockReturnValue(of(Ok(fakeTip)));

      vi.spyOn(rxjs, 'interval').mockReturnValue(EMPTY);

      testSideEffect(trackTipSideEffect, ({ cold, hot, expectObservable }) => {
        // Cold so the source replays its current value when `whileActive`
        // resubscribes after the gate flips. Hot would not replay the frame-0
        // emission, leaving `combineLatest` waiting forever.
        const selectNetwork$ = cold<BitcoinNetwork | undefined>('a', {
          a: BitcoinNetwork.Testnet,
        });
        const selectActiveNetworkAccounts$ = cold('a', {
          a: [bitcoinAccountForTip],
        });
        return {
          stateObservables: {
            bitcoinContext: { selectNetwork$ },
            wallets: { selectActiveNetworkAccounts$ },
            // Inactive at frame 0, becomes active at frame 4
          },
          dependencies: {
            bitcoinProvider: {
              getLastKnownBlock,
            } as unknown as BitcoinProvider,
            actions,
            isWalletActive$: hot('f---t', { f: false, t: true }),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^----!').toBe('----a', {
              a: actions.bitcoinContext.setTip(fakeTip),
            });
          },
        };
      });

      expect(getLastKnownBlock).toHaveBeenCalledWith({
        network: BitcoinNetwork.Testnet,
      });
    });

    // Regression guard: this test fails if `whileActive` is moved
    // mid-pipeline — the leaked `interval` keeps polling and
    // `getLastKnownBlock` is called past the lock.
    it('stops polling when wallet transitions from active to inactive', () => {
      const tipPollFrequency = Milliseconds(2);
      const fakeTip = { hash: 'tip-frozen', height: 200 };
      // Identical responses: distinctUntilChanged-style dedup happens via the
      // setTip action emission, but call count is what we assert.
      const getLastKnownBlock = vi.fn().mockReturnValue(of(Ok(fakeTip)));

      testSideEffect(
        trackTip(tipPollFrequency),
        ({ cold, hot, expectObservable, flush }) => {
          const selectNetwork$ = cold<BitcoinNetwork | undefined>('a', {
            a: BitcoinNetwork.Testnet,
          });
          const selectActiveNetworkAccounts$ = cold('a', {
            a: [bitcoinAccountForTip],
          });
          return {
            stateObservables: {
              bitcoinContext: { selectNetwork$ },
              wallets: { selectActiveNetworkAccounts$ },
              // Active at frame 0, locked at frame 5; long idle window after.
            },
            dependencies: {
              bitcoinProvider: {
                getLastKnownBlock,
              } as unknown as BitcoinProvider,
              actions,
              isWalletActive$: hot('t----f', { t: true, f: false }),
            },
            assertion: sideEffect$ => {
              // Bitcoin's trackTip has no `distinctUntilChanged` over the
              // poll result (unlike Cardano's), so identical `fakeTip`
              // responses produce a `setTip` emission per call. Lock at
              // frame 5 tears down the pipeline so no further emissions
              // appear in the long idle window after.
              expectObservable(sideEffect$, '^------------------!').toBe(
                'a-a-a',
                {
                  a: actions.bitcoinContext.setTip(fakeTip),
                },
              );
              flush();
              // Calls at frames 0, 2, 4 with 2ms interval; lock at frame 5
              // unsubscribes the pipeline so no further calls fire.
              const expectedCallsBeforeLock = 3;
              expect(getLastKnownBlock.mock.calls.length).toBe(
                expectedCallsBeforeLock,
              );
            },
          };
        },
      );
    });
  });
});
