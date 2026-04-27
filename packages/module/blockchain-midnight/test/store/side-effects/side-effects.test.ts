import { activitiesActions } from '@lace-contract/activities';
import { addressesActions } from '@lace-contract/addresses';
import { appActions } from '@lace-contract/app';
import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { failuresActions } from '@lace-contract/failures';
import { FeatureFlagKey } from '@lace-contract/feature';
import {
  EMPTY_PARTIAL_NETWORKS_CONFIG,
  midnightContextActions,
  MidnightAccountId,
  MidnightNetworkId,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { ModuleName } from '@lace-contract/module';
import { networkActions } from '@lace-contract/network';
import { syncActions } from '@lace-contract/sync';
import { tokensActions } from '@lace-contract/tokens';
import { viewsActions } from '@lace-contract/views';
import { walletsActions, WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { HexBytes } from '@lace-sdk/util';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import omit from 'lodash/omit.js';
import { of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_INDEXER_URLS,
  FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_MAINNET_SUPPORT,
  FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_NODE_URLS,
  FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT,
} from '../../../src/const';
import {
  autoDismissMidnightWalletFailure,
  createClearWalletStateOnResync,
  createDeleteWalletSideEffect,
  handleMidnightSettingsChange,
  registerMidnightBlockchainNetworks,
  requestResyncWallet,
  resyncWalletOnConfigChangeFromFeatureFlags,
  setFeatureFlagsNetworksConfigOverrides,
  syncSupportedNetworksWithFeatureFlags,
} from '../../../src/store/side-effects';
import { midnightActions } from '../../../src/store/slice';
import { MidnightWalletFailureId } from '../../../src/value-objects/midnight-wallet-failure-id.vo';

import type { Features } from '@lace-contract/feature';
import type {
  MidnightNetworkConfig,
  NetworkStringPayloadFeatureFlag,
  PartialMidnightNetworksConfig,
  SerializedMidnightWallet,
} from '@lace-contract/midnight-context';
import type { CollectionStorage } from '@lace-contract/storage';
import type { AnyWallet } from '@lace-contract/wallet-repo';
import type { Action } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

const { accountId, midnightAccount, midnightWallet, walletId, networkId } =
  stubData;

const actions = {
  ...midnightActions,
  ...tokensActions,
  ...addressesActions,
  ...appActions,
  ...authenticationPromptActions,
  ...walletsActions,
  ...viewsActions,
  ...midnightContextActions,
  ...activitiesActions,
  ...syncActions,
  ...failuresActions,
  ...networkActions,
};

describe('midnight-wallet/store/side-effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // NOTE: unlockWallet and upsertAddresses tests moved to:
  // - account-key-manager.test.ts (unlock/key management)
  // - subscribe-to-wallet.test.ts (address upsert, sync progress, dust balance, token updates)

  describe('registerMidnightBlockchainNetworks', () => {
    it('should register Midnight networks with default testnet when no existing account', () => {
      testSideEffect(
        registerMidnightBlockchainNetworks,
        ({ expectObservable, cold }) => {
          const defaultTestNetNetworkId = MidnightSDKNetworkIds.Preview;

          return {
            actionObservables: {},
            stateObservables: {
              network: {
                selectBlockchainNetworks$: cold('a', {
                  a: {}, // Midnight not registered yet
                }),
              },
              midnightContext: {
                selectDefaultTestNetNetworkId$: cold('a', {
                  a: defaultTestNetNetworkId,
                }),
              },
              wallets: {
                selectAll$: cold('a', { a: [] }), // No wallets
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setBlockchainNetworks({
                  blockchain: 'Midnight',
                  mainnet: MidnightNetworkId('mainnet'),
                  testnet: MidnightNetworkId(defaultTestNetNetworkId),
                }),
              });
            },
          };
        },
      );
    });

    it('should use existing Midnight account network for migration', () => {
      testSideEffect(
        registerMidnightBlockchainNetworks,
        ({ expectObservable, cold }) => {
          const existingAccountNetworkId = MidnightSDKNetworkIds.PreProd;
          const defaultTestNetNetworkId = MidnightSDKNetworkIds.Preview;
          const existingMidnightAccount = {
            ...stubData.midnightAccount,
            blockchainName: 'Midnight' as const,
            blockchainSpecific: {
              ...stubData.midnightAccount.blockchainSpecific,
              networkId: existingAccountNetworkId,
            },
          };

          return {
            actionObservables: {},
            stateObservables: {
              network: {
                selectBlockchainNetworks$: cold('a', {
                  a: {}, // Midnight not registered yet
                }),
              },
              midnightContext: {
                selectDefaultTestNetNetworkId$: cold('a', {
                  a: defaultTestNetNetworkId,
                }),
              },
              wallets: {
                selectAll$: cold('a', {
                  a: [
                    { ...midnightWallet, accounts: [existingMidnightAccount] },
                  ],
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setBlockchainNetworks({
                  blockchain: 'Midnight',
                  mainnet: MidnightNetworkId('mainnet'),
                  testnet: MidnightNetworkId(existingAccountNetworkId),
                }),
              });
            },
          };
        },
      );
    });

    it('should not emit when Midnight is already registered', () => {
      testSideEffect(
        registerMidnightBlockchainNetworks,
        ({ expectObservable, cold }) => {
          return {
            actionObservables: {},
            stateObservables: {
              network: {
                selectBlockchainNetworks$: cold('a', {
                  a: {
                    Midnight: {
                      mainnet: MidnightNetworkId('mainnet'),
                      testnet: MidnightNetworkId('preview'),
                    },
                  },
                }),
              },
              midnightContext: {
                selectDefaultTestNetNetworkId$: cold('a', {
                  a: MidnightSDKNetworkIds.Preview,
                }),
              },
              wallets: {
                selectAll$: cold('a', { a: [] }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe(''); // No emission
            },
          };
        },
      );
    });
  });

  describe('deleteWallet', () => {
    it("removing a wallet dispatches 'reset' actions", () => {
      const otherWalletId = WalletId('other-wallet-id');
      const walletStates: SerializedMidnightWallet[] = [
        {
          walletId,
          accountId,
          networkId: MidnightSDKNetworkIds.TestNet,
          serializedState: {
            dust: HexBytes(''),
            shielded: HexBytes(''),
            unshielded: HexBytes(''),
            unshieldedTxHistory: HexBytes(''),
          },
        },
        {
          walletId: otherWalletId,
          accountId: MidnightAccountId(otherWalletId, 0, networkId),
          networkId: MidnightSDKNetworkIds.TestNet,
          serializedState: {
            dust: HexBytes(''),
            shielded: HexBytes(''),
            unshielded: HexBytes(''),
            unshieldedTxHistory: HexBytes(''),
          },
        },
      ];

      const storage = {
        getAll: vi.fn(() => of(walletStates)),
        setAll: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;
      testSideEffect(
        createDeleteWalletSideEffect(storage),
        ({ expectObservable, flush, hot, cold }) => {
          const dependencies = {
            stopMidnightWallet: vi.fn().mockReturnValue(of(void 0)),
            actions,
          };

          return {
            actionObservables: {
              wallets: {
                removeWallet$: hot('-a', {
                  a: walletsActions.wallets.removeWallet(walletId, []),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectAll$: cold('a', { a: [midnightWallet] }),
              },
            },
            dependencies,
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('-(abc)', {
                a: actions.addresses.resetAddresses({ accountId }),
                b: actions.tokens.resetAccountTokens({ accountId }),
                c: actions.activities.resetActivities({ accountId }),
              });
              flush();
              expect(storage.getAll).toHaveBeenCalled();
              expect(storage.setAll).toHaveBeenCalledWith([
                walletStates.find(w => w.walletId === otherWalletId),
              ]);
            },
          };
        },
      );
    });
  });

  describe('createClearWalletStateOnResync', () => {
    it('stops currently running midnight wallet', () => {
      const storage = {
        setAll: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createClearWalletStateOnResync(storage),
        ({ flush, cold }) => {
          const dependencies = {
            stopAllMidnightWallets: vi
              .fn()
              .mockReturnValue(cold('a', { a: null })),
            actions,
          };

          return {
            actionObservables: {
              midnight: {
                resync$: cold('--b', { b: actions.midnight.resync() }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(dependencies.stopAllMidnightWallets).toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('clears stored state', () => {
      const storage = {
        setAll: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createClearWalletStateOnResync(storage),
        ({ flush, cold }) => {
          const dependencies = {
            stopAllMidnightWallets: vi
              .fn()
              .mockReturnValue(cold('a', { a: null })),
            actions,
          };

          return {
            actionObservables: {
              midnight: {
                resync$: cold('--b', { b: actions.midnight.resync() }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(storage.setAll).toHaveBeenCalledWith([]);
            },
          };
        },
      );
    });

    it('resets tokens for the active account', () => {
      const storage = {
        setAll: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createClearWalletStateOnResync(storage),
        ({ expectObservable, cold }) => {
          const dependencies = {
            stopAllMidnightWallets: vi
              .fn()
              .mockReturnValue(cold('a', { a: null })),
            actions,
          };

          return {
            actionObservables: {
              midnight: {
                resync$: cold('--b', { b: actions.midnight.resync() }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('--(ab)', {
                a: actions.tokens.resetAccountTokens({ accountId }),
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                b: expect.any(Object),
              });
            },
          };
        },
      );
    });

    it('requests wallet watch restart', () => {
      const storage = {
        setAll: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createClearWalletStateOnResync(storage),
        ({ expectObservable, cold }) => {
          const dependencies = {
            stopAllMidnightWallets: vi
              .fn()
              .mockReturnValue(cold('a', { a: null })),
            actions,
          };

          return {
            actionObservables: {
              midnight: {
                resync$: cold('--b', { b: actions.midnight.resync() }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('--(ab)', {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                a: expect.any(Object),
                b: actions.midnight.restartWalletWatch(),
              });
            },
          };
        },
      );
    });

    it('runs operations in correct order: stop, clear, then emit actions', () => {
      const executionEvents: string[] = [];
      const storage = {
        setAll: vi.fn(() => {
          executionEvents.push('reset storage');
          return of(void 0);
        }),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createClearWalletStateOnResync(storage),
        ({ flush, cold }) => {
          const dependencies = {
            stopAllMidnightWallets: vi.fn(() => {
              executionEvents.push('stop');
              return cold('a', { a: void 0 });
            }),
            actions,
          };

          return {
            actionObservables: {
              midnight: {
                resync$: cold('--b', { b: actions.midnight.resync() }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              sideEffect$.subscribe(() => {
                executionEvents.push('emit actions');
              });
              flush();
              expect(executionEvents).toEqual([
                'stop',
                'reset storage',
                'emit actions',
                'emit actions',
              ]);
            },
          };
        },
      );
    });
  });

  describe('resyncWalletOnConfigChangeFromFeatureFlags', () => {
    it('does nothing when wallet is locked', () => {
      const authenticateenticationPrompt = vi.fn();

      testSideEffect(
        resyncWalletOnConfigChangeFromFeatureFlags,
        ({ expectObservable, cold, flush }) => {
          return {
            actionObservables: {},
            stateObservables: {
              appLock: {
                isUnlocked$: cold('a', { a: false }),
              },
              midnightContext: {
                selectCurrentNetwork$: cold('aa', {
                  a: {
                    networkId,
                    config: {
                      nodeAddress: 'http://nodeAddress',
                      proofServerAddress: 'http://proofServerAddress',
                      indexerAddress: 'http://indexerAddress',
                    },
                  },
                }),
                selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                  a: EMPTY_PARTIAL_NETWORKS_CONFIG,
                }),
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('');
              flush();

              expect(authenticateenticationPrompt).not.toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('sends resync action when password prompt flow completed with success', () => {
      testSideEffect(
        resyncWalletOnConfigChangeFromFeatureFlags,
        ({ expectObservable, cold }) => {
          return {
            actionObservables: {},
            stateObservables: {
              appLock: {
                isUnlocked$: cold('a', { a: true }),
              },
              midnightContext: {
                selectCurrentNetwork$: cold('aa', {
                  a: {
                    networkId,
                    config: {
                      nodeAddress: 'http://nodeAddress',
                      proofServerAddress: 'http://proofServerAddress',
                      indexerAddress: 'http://indexerAddress',
                    },
                  },
                }),
                selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                  a: EMPTY_PARTIAL_NETWORKS_CONFIG,
                }),
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('(ab)', {
                a: actions.sync.addSyncOperation({
                  accountId,
                  operation: expect.objectContaining({
                    operationId: `${accountId}-midnight-sync`,
                    status: 'Pending',
                    description: 'sync.operation.midnight-resync',
                  }) as never,
                }),
                b: actions.midnight.resync(),
              });
            },
          };
        },
      );
    });

    it('does not send resync action again when joint config did not change', () => {
      testSideEffect(
        resyncWalletOnConfigChangeFromFeatureFlags,
        ({ expectObservable, cold }) => {
          return {
            actionObservables: {},
            stateObservables: {
              appLock: {
                isUnlocked$: cold('a', { a: true }),
              },
              midnightContext: {
                selectCurrentNetwork$: cold('aa', {
                  a: {
                    networkId,
                    config: {
                      nodeAddress: 'http://nodeAddress',
                      proofServerAddress: 'http://proofServerAddress',
                      indexerAddress: 'http://indexerAddress',
                    },
                  },
                }),
                selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                  a: EMPTY_PARTIAL_NETWORKS_CONFIG,
                }),
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('(ab)-', {
                a: actions.sync.addSyncOperation({
                  accountId,
                  operation: expect.objectContaining({
                    operationId: `${accountId}-midnight-sync`,
                    status: 'Pending',
                    description: 'sync.operation.midnight-resync',
                  }) as never,
                }),
                b: actions.midnight.resync(),
              });
            },
          };
        },
      );
    });
  });

  // NOTE: triggerUnlockFromAuthenticationPrompt tests removed - functionality
  // is now internal to watchMidnightAccount and tested in account-key-manager.test.ts

  describe('override remote proof server based on feature flags', () => {
    describe('on feature flags loaded', () => {
      it('should set remote proof server address per network in the midnight context', () => {
        testSideEffect(
          setFeatureFlagsNetworksConfigOverrides,
          ({ expectObservable, cold, flush }) => {
            const featureFlag = {
              key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER'),
              payload: {
                [NetworkId.NetworkId.Preview]:
                  'http://proofserver.wastedp.ro:6300',
                [NetworkId.NetworkId.MainNet]:
                  'http://proofserver.wastedp.ro:6301',
              },
            } as NetworkStringPayloadFeatureFlag;

            const loadedFeatures: Features = {
              featureFlags: [featureFlag],
              modules: [
                {
                  moduleName: ModuleName('TestModule'),
                },
              ],
            };

            const initialFFOverrides: PartialMidnightNetworksConfig = {
              [NetworkId.NetworkId.PreProd]: {
                indexerAddress: 'mockIndexerAddressPreprod',
                nodeAddress: 'mockNodeAddressPreprod',
                proofServerAddress: 'mockProofServerAddressPreprod',
              },
              [NetworkId.NetworkId.Preview]: {
                indexerAddress: 'mockIndexerAddressTestNet',
                nodeAddress: 'mockNodeAddressTestNet',
                proofServerAddress: 'mockProofServerAddressTestNet',
              },
              [NetworkId.NetworkId.Undeployed]: {
                indexerAddress: 'mockIndexerAddressUndeployed',
                nodeAddress: 'mockNodeAddressUndeployed',
                proofServerAddress: 'mockProofServerAddressUndeployed',
              },
              [NetworkId.NetworkId.QaNet]: {
                indexerAddress: 'mockIndexerAddressQaNet',
                nodeAddress: 'mockNodeAddressQaNet',
                proofServerAddress: 'mockProofServerAddressQaNet',
              },
              [NetworkId.NetworkId.MainNet]: {
                indexerAddress: 'mockIndexerAddressMainNet',
                nodeAddress: 'mockNodeAddressMainNet',
                proofServerAddress: 'mockProofServerAddressMainNet',
              },
              [NetworkId.NetworkId.DevNet]: {
                indexerAddress: 'mockIndexerAddressDevNet',
                nodeAddress: 'mockNodeAddressDevNet',
                proofServerAddress: 'mockProofServerAddressDevNet',
              },
              [NetworkId.NetworkId.TestNet]: {
                indexerAddress: 'mockIndexerAddressTestNet',
                nodeAddress: 'mockNodeAddressTestNet',
                proofServerAddress: 'mockProofServerAddressTestNet',
              },
            };

            return {
              stateObservables: {
                features: {
                  selectLoadedFeatures$: cold('a', { a: loadedFeatures }),
                  selectNextFeatureFlags$: cold(''),
                },
                midnightContext: {
                  selectNetworkId$: cold('a', {
                    a: NetworkId.NetworkId.Preview,
                  }),
                  selectSupportedNetworksIds$: cold('a', {
                    a: [
                      NetworkId.NetworkId.Preview,
                      NetworkId.NetworkId.MainNet,
                      NetworkId.NetworkId.Undeployed,
                    ],
                  }),
                  selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                    a: initialFFOverrides,
                  }),
                },
              },
              dependencies: {
                actions,
                logger: dummyLogger,
              },
              assertion: (sideEffect$: Readonly<Observable<Action>>) => {
                expectObservable(sideEffect$).toBe('(abc)', {
                  a: actions.midnightContext.setUserNetworkConfigOverride({
                    networkId: NetworkId.NetworkId.Preview,
                    config: {
                      ...omit(initialFFOverrides[NetworkId.NetworkId.Preview], [
                        'nodeAddress',
                        'proofServerAddress',
                        'indexerAddress',
                      ]),
                      proofServerAddress: 'http://proofserver.wastedp.ro:6300',
                    },
                    featureFlagsOverrides: {},
                  }),
                  b: actions.midnightContext.setUserNetworkConfigOverride({
                    networkId: NetworkId.NetworkId.MainNet,
                    config: {
                      ...omit(initialFFOverrides[NetworkId.NetworkId.MainNet], [
                        'nodeAddress',
                        'proofServerAddress',
                        'indexerAddress',
                      ]),
                      proofServerAddress: 'http://proofserver.wastedp.ro:6301',
                    },
                    featureFlagsOverrides: {},
                  }),
                  c: actions.midnightContext.setUserNetworkConfigOverride({
                    networkId: NetworkId.NetworkId.Undeployed,
                    config: omit(
                      initialFFOverrides[NetworkId.NetworkId.Undeployed],
                      ['nodeAddress', 'proofServerAddress', 'indexerAddress'],
                    ),
                    featureFlagsOverrides: {},
                  }),
                });
                flush();
              },
            };
          },
        );
      });
    });

    it('should set remote proof server address in the midnight context when feature flag is set', () => {
      testSideEffect(
        setFeatureFlagsNetworksConfigOverrides,
        ({ expectObservable, cold }) => {
          const featureFlag = {
            key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER'),
            payload: {
              [NetworkId.NetworkId.Preview]:
                'http://proofserver.wastedp.ro:6300',
              [NetworkId.NetworkId.MainNet]:
                'http://proofserver.wastedp.ro:6301',
            },
          } as NetworkStringPayloadFeatureFlag;

          const loadedFeatures: Features = {
            featureFlags: [featureFlag],
            modules: [
              {
                moduleName: ModuleName('TestModule'),
              },
            ],
          };

          const initialFFOverrides: PartialMidnightNetworksConfig = {
            [NetworkId.NetworkId.PreProd]: {
              indexerAddress: 'mockIndexerAddressPreprod',
              nodeAddress: 'mockNodeAddressPreprod',
              proofServerAddress: 'mockProofServerAddressPreprod',
            },
            [NetworkId.NetworkId.Preview]: {
              indexerAddress: 'mockIndexerAddressTestNet',
              nodeAddress: 'mockNodeAddressTestNet',
              proofServerAddress: 'mockProofServerAddressTestNet',
            },
            [NetworkId.NetworkId.Undeployed]: {
              indexerAddress: 'mockIndexerAddressUndeployed',
              nodeAddress: 'mockNodeAddressUndeployed',
              proofServerAddress: 'mockProofServerAddressUndeployed',
            },
            [NetworkId.NetworkId.QaNet]: {
              indexerAddress: 'mockIndexerAddressQaNet',
              nodeAddress: 'mockNodeAddressQaNet',
              proofServerAddress: 'mockProofServerAddressQaNet',
            },
            [NetworkId.NetworkId.MainNet]: {
              indexerAddress: 'mockIndexerAddressMainNet',
              nodeAddress: 'mockNodeAddressMainNet',
              proofServerAddress: 'mockProofServerAddressMainNet',
            },
            [NetworkId.NetworkId.DevNet]: {
              indexerAddress: 'mockIndexerAddressDevNet',
              nodeAddress: 'mockNodeAddressDevNet',
              proofServerAddress: 'mockProofServerAddressDevNet',
            },
            [NetworkId.NetworkId.TestNet]: {
              indexerAddress: 'mockIndexerAddressTestNet',
              nodeAddress: 'mockNodeAddressTestNet',
              proofServerAddress: 'mockProofServerAddressTestNet',
            },
          };

          return {
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', { a: loadedFeatures }),
                selectNextFeatureFlags$: cold(''),
              },
              midnightContext: {
                selectNetworkId$: cold('a', {
                  a: NetworkId.NetworkId.Preview,
                }),
                selectSupportedNetworksIds$: cold('a', {
                  a: [
                    NetworkId.NetworkId.Preview,
                    NetworkId.NetworkId.MainNet,
                    NetworkId.NetworkId.Undeployed,
                  ],
                }),
                selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                  a: initialFFOverrides,
                }),
              },
            },
            dependencies: {
              actions,
              logger: dummyLogger,
            },
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('(abc)', {
                a: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.Preview,
                  config: {
                    ...omit(initialFFOverrides[NetworkId.NetworkId.Preview], [
                      'nodeAddress',
                      'proofServerAddress',
                      'indexerAddress',
                    ]),
                    proofServerAddress: 'http://proofserver.wastedp.ro:6300',
                  },
                  featureFlagsOverrides: {},
                }),
                b: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.MainNet,
                  config: {
                    ...omit(initialFFOverrides[NetworkId.NetworkId.MainNet], [
                      'nodeAddress',
                      'proofServerAddress',
                      'indexerAddress',
                    ]),
                    proofServerAddress: 'http://proofserver.wastedp.ro:6301',
                  },
                  featureFlagsOverrides: {},
                }),
                c: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.Undeployed,
                  config: omit(
                    initialFFOverrides[NetworkId.NetworkId.Undeployed],
                    ['nodeAddress', 'proofServerAddress', 'indexerAddress'],
                  ),
                  featureFlagsOverrides: {},
                }),
              });
            },
          };
        },
      );
    });

    it('should set indexer address per network when indexer URL feature flag is set', () => {
      testSideEffect(
        setFeatureFlagsNetworksConfigOverrides,
        ({ expectObservable, cold }) => {
          const indexerUrlsFeatureFlag = {
            key: FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_INDEXER_URLS,
            payload: {
              [NetworkId.NetworkId.Preview]:
                'https://indexer.preview.custom.network/api/v3/graphql',
              [NetworkId.NetworkId.MainNet]:
                'https://indexer.mainnet.custom.network/api/v3/graphql',
            },
          } as NetworkStringPayloadFeatureFlag;

          const loadedFeatures: Features = {
            featureFlags: [indexerUrlsFeatureFlag],
            modules: [
              {
                moduleName: ModuleName('TestModule'),
              },
            ],
          };

          const initialFFOverrides: PartialMidnightNetworksConfig = {
            [NetworkId.NetworkId.PreProd]: {},
            [NetworkId.NetworkId.Preview]: {
              nodeAddress: 'mockNodeAddressTestNet',
            },
            [NetworkId.NetworkId.Undeployed]: {
              nodeAddress: 'mockNodeAddressUndeployed',
            },
            [NetworkId.NetworkId.QaNet]: {},
            [NetworkId.NetworkId.MainNet]: {
              nodeAddress: 'mockNodeAddressMainNet',
            },
            [NetworkId.NetworkId.DevNet]: {},
            [NetworkId.NetworkId.TestNet]: {},
          };

          return {
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', { a: loadedFeatures }),
                selectNextFeatureFlags$: cold(''),
              },
              midnightContext: {
                selectNetworkId$: cold('a', {
                  a: NetworkId.NetworkId.Preview,
                }),
                selectSupportedNetworksIds$: cold('a', {
                  a: [
                    NetworkId.NetworkId.Preview,
                    NetworkId.NetworkId.MainNet,
                    NetworkId.NetworkId.Undeployed,
                  ],
                }),
                selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                  a: initialFFOverrides,
                }),
              },
            },
            dependencies: {
              actions,
              logger: dummyLogger,
            },
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('(abc)', {
                a: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.Preview,
                  config: {
                    indexerAddress:
                      'https://indexer.preview.custom.network/api/v3/graphql',
                  },
                  featureFlagsOverrides: {},
                }),
                b: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.MainNet,
                  config: {
                    indexerAddress:
                      'https://indexer.mainnet.custom.network/api/v3/graphql',
                  },
                  featureFlagsOverrides: {},
                }),
                c: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.Undeployed,
                  config: {},
                  featureFlagsOverrides: {},
                }),
              });
            },
          };
        },
      );
    });

    it('should set both proof server and indexer address when both feature flags are present', () => {
      testSideEffect(
        setFeatureFlagsNetworksConfigOverrides,
        ({ expectObservable, cold }) => {
          const proofServerFeatureFlag = {
            key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER'),
            payload: {
              [NetworkId.NetworkId.Preview]:
                'http://proofserver.wastedp.ro:6300',
            },
          } as NetworkStringPayloadFeatureFlag;

          const indexerUrlsFeatureFlag = {
            key: FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_INDEXER_URLS,
            payload: {
              [NetworkId.NetworkId.Preview]:
                'https://indexer.preview.custom.network/api/v3/graphql',
            },
          } as NetworkStringPayloadFeatureFlag;

          const loadedFeatures: Features = {
            featureFlags: [proofServerFeatureFlag, indexerUrlsFeatureFlag],
            modules: [
              {
                moduleName: ModuleName('TestModule'),
              },
            ],
          };

          const initialFFOverrides: PartialMidnightNetworksConfig = {
            [NetworkId.NetworkId.PreProd]: {},
            [NetworkId.NetworkId.Preview]: {
              nodeAddress: 'mockNodeAddressTestNet',
              proofServerAddress: 'mockProofServerAddressTestNet',
              indexerAddress: 'mockIndexerAddressTestNet',
            },
            [NetworkId.NetworkId.Undeployed]: {
              nodeAddress: 'mockNodeAddressUndeployed',
            },
            [NetworkId.NetworkId.QaNet]: {},
            [NetworkId.NetworkId.MainNet]: {},
            [NetworkId.NetworkId.DevNet]: {},
            [NetworkId.NetworkId.TestNet]: {},
          };

          return {
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', { a: loadedFeatures }),
                selectNextFeatureFlags$: cold(''),
              },
              midnightContext: {
                selectNetworkId$: cold('a', {
                  a: NetworkId.NetworkId.Preview,
                }),
                selectSupportedNetworksIds$: cold('a', {
                  a: [
                    NetworkId.NetworkId.Preview,
                    NetworkId.NetworkId.Undeployed,
                  ],
                }),
                selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                  a: initialFFOverrides,
                }),
              },
            },
            dependencies: {
              actions,
              logger: dummyLogger,
            },
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('(ab)', {
                a: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.Preview,
                  config: {
                    proofServerAddress: 'http://proofserver.wastedp.ro:6300',
                    indexerAddress:
                      'https://indexer.preview.custom.network/api/v3/graphql',
                  },
                  featureFlagsOverrides: {},
                }),
                b: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.Undeployed,
                  config: {},
                  featureFlagsOverrides: {},
                }),
              });
            },
          };
        },
      );
    });

    it('should set node address per network when node URL feature flag is set', () => {
      testSideEffect(
        setFeatureFlagsNetworksConfigOverrides,
        ({ expectObservable, cold }) => {
          const nodeUrlsFeatureFlag = {
            key: FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_NODE_URLS,
            payload: {
              [NetworkId.NetworkId.Preview]:
                'https://rpc.preview.custom.network',
              [NetworkId.NetworkId.MainNet]:
                'https://rpc.mainnet.custom.network',
            },
          } as NetworkStringPayloadFeatureFlag;

          const loadedFeatures: Features = {
            featureFlags: [nodeUrlsFeatureFlag],
            modules: [
              {
                moduleName: ModuleName('TestModule'),
              },
            ],
          };

          const initialFFOverrides: PartialMidnightNetworksConfig = {
            [NetworkId.NetworkId.PreProd]: {},
            [NetworkId.NetworkId.Preview]: {
              indexerAddress: 'mockIndexerAddressTestNet',
            },
            [NetworkId.NetworkId.Undeployed]: {
              indexerAddress: 'mockIndexerAddressUndeployed',
            },
            [NetworkId.NetworkId.QaNet]: {},
            [NetworkId.NetworkId.MainNet]: {
              indexerAddress: 'mockIndexerAddressMainNet',
            },
            [NetworkId.NetworkId.DevNet]: {},
            [NetworkId.NetworkId.TestNet]: {},
          };

          return {
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', { a: loadedFeatures }),
                selectNextFeatureFlags$: cold(''),
              },
              midnightContext: {
                selectNetworkId$: cold('a', {
                  a: NetworkId.NetworkId.Preview,
                }),
                selectSupportedNetworksIds$: cold('a', {
                  a: [
                    NetworkId.NetworkId.Preview,
                    NetworkId.NetworkId.MainNet,
                    NetworkId.NetworkId.Undeployed,
                  ],
                }),
                selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                  a: initialFFOverrides,
                }),
              },
            },
            dependencies: {
              actions,
              logger: dummyLogger,
            },
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('(abc)', {
                a: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.Preview,
                  config: {
                    nodeAddress: 'https://rpc.preview.custom.network',
                  },
                  featureFlagsOverrides: {},
                }),
                b: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.MainNet,
                  config: {
                    nodeAddress: 'https://rpc.mainnet.custom.network',
                  },
                  featureFlagsOverrides: {},
                }),
                c: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.Undeployed,
                  config: {},
                  featureFlagsOverrides: {},
                }),
              });
            },
          };
        },
      );
    });

    it('should set all three overrides when node, proof server, and indexer feature flags are present', () => {
      testSideEffect(
        setFeatureFlagsNetworksConfigOverrides,
        ({ expectObservable, cold }) => {
          const nodeUrlsFeatureFlag = {
            key: FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_NODE_URLS,
            payload: {
              [NetworkId.NetworkId.Preview]:
                'https://rpc.preview.custom.network',
            },
          } as NetworkStringPayloadFeatureFlag;

          const proofServerFeatureFlag = {
            key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER'),
            payload: {
              [NetworkId.NetworkId.Preview]:
                'http://proofserver.wastedp.ro:6300',
            },
          } as NetworkStringPayloadFeatureFlag;

          const indexerUrlsFeatureFlag = {
            key: FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_INDEXER_URLS,
            payload: {
              [NetworkId.NetworkId.Preview]:
                'https://indexer.preview.custom.network/api/v3/graphql',
            },
          } as NetworkStringPayloadFeatureFlag;

          const loadedFeatures: Features = {
            featureFlags: [
              nodeUrlsFeatureFlag,
              proofServerFeatureFlag,
              indexerUrlsFeatureFlag,
            ],
            modules: [
              {
                moduleName: ModuleName('TestModule'),
              },
            ],
          };

          const initialFFOverrides: PartialMidnightNetworksConfig = {
            [NetworkId.NetworkId.PreProd]: {},
            [NetworkId.NetworkId.Preview]: {
              nodeAddress: 'mockNodeAddressTestNet',
              proofServerAddress: 'mockProofServerAddressTestNet',
              indexerAddress: 'mockIndexerAddressTestNet',
            },
            [NetworkId.NetworkId.Undeployed]: {
              nodeAddress: 'mockNodeAddressUndeployed',
            },
            [NetworkId.NetworkId.QaNet]: {},
            [NetworkId.NetworkId.MainNet]: {},
            [NetworkId.NetworkId.DevNet]: {},
            [NetworkId.NetworkId.TestNet]: {},
          };

          return {
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', { a: loadedFeatures }),
                selectNextFeatureFlags$: cold(''),
              },
              midnightContext: {
                selectNetworkId$: cold('a', {
                  a: NetworkId.NetworkId.Preview,
                }),
                selectSupportedNetworksIds$: cold('a', {
                  a: [
                    NetworkId.NetworkId.Preview,
                    NetworkId.NetworkId.Undeployed,
                  ],
                }),
                selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                  a: initialFFOverrides,
                }),
              },
            },
            dependencies: {
              actions,
              logger: dummyLogger,
            },
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('(ab)', {
                a: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.Preview,
                  config: {
                    nodeAddress: 'https://rpc.preview.custom.network',
                    proofServerAddress: 'http://proofserver.wastedp.ro:6300',
                    indexerAddress:
                      'https://indexer.preview.custom.network/api/v3/graphql',
                  },
                  featureFlagsOverrides: {},
                }),
                b: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: NetworkId.NetworkId.Undeployed,
                  config: {},
                  featureFlagsOverrides: {},
                }),
              });
            },
          };
        },
      );
    });
  });

  describe('requestResyncWallet', () => {
    it('sends resync action when successfully obtained password', () => {
      testSideEffect(requestResyncWallet, ({ cold, expectObservable }) => {
        return {
          actionObservables: {
            midnight: {
              requestResync$: cold('a'),
            },
          },
          stateObservables: {
            wallets: {
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
              selectActiveNetworkAccounts$: cold('a', { a: [midnightAccount] }),
            },
            midnightContext: {
              selectMidnightBlockchainNetworkId$: cold('a', {
                a: MidnightNetworkId(networkId),
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: expect.objectContaining({
                  operationId: `${accountId}-midnight-sync`,
                  status: 'Pending',
                  description: 'sync.operation.midnight-resync',
                }) as never,
              }),
              b: actions.midnight.resync(),
            });
          },
        };
      });
    });

    it('resyncs accounts for the currently active network after network switch', () => {
      const previewNetworkId = MidnightSDKNetworkIds.Preview;
      const previewAccountId = MidnightAccountId(walletId, 0, previewNetworkId);
      const previewAccount = {
        ...midnightAccount,
        accountId: previewAccountId,
        blockchainNetworkId: MidnightNetworkId(previewNetworkId),
        blockchainSpecific: {
          ...midnightAccount.blockchainSpecific,
          networkId: previewNetworkId,
        },
      };

      testSideEffect(requestResyncWallet, ({ hot, expectObservable }) => {
        // Accounts include both networks, but only the active network's accounts should be used
        const allAccounts = [midnightAccount, previewAccount];

        return {
          actionObservables: {
            midnight: {
              // Frame 2: first request, Frame 7: second request
              requestResync$: hot('--a----b', {
                a: actions.midnight.requestResync(),
                b: actions.midnight.requestResync(),
              }),
            },
          },
          stateObservables: {
            wallets: {
              selectIsWalletRepoMigrating$: hot('a', { a: false }),
              // Accounts don't change throughout the test
              selectActiveNetworkAccounts$: hot('a', { a: allAccounts }),
            },
            midnightContext: {
              // Frame 0: undeployed, Frame 5: switches to preview
              selectMidnightBlockchainNetworkId$: hot('a----b', {
                a: MidnightNetworkId(networkId), // Undeployed
                b: MidnightNetworkId(previewNetworkId), // Preview
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            // Frame 2: resync uses undeployed account (network was undeployed at frame 0)
            // Frame 7: resync uses preview account (network switched to preview at frame 5)
            expectObservable(sideEffect$).toBe('--(ab)-(cd)', {
              a: actions.sync.addSyncOperation({
                accountId, // Undeployed account
                operation: expect.objectContaining({
                  operationId: `${accountId}-midnight-sync`,
                  status: 'Pending',
                  description: 'sync.operation.midnight-resync',
                }) as never,
              }),
              b: actions.midnight.resync(),
              c: actions.sync.addSyncOperation({
                accountId: previewAccountId, // Preview account
                operation: expect.objectContaining({
                  operationId: `${previewAccountId}-midnight-sync`,
                  status: 'Pending',
                  description: 'sync.operation.midnight-resync',
                }) as never,
              }),
              d: actions.midnight.resync(),
            });
          },
        };
      });
    });
  });

  describe('handleMidnightSettingsChange', () => {
    it('confirms change, updates the config and current network id', () => {
      const config = 'config' as unknown as MidnightNetworkConfig;

      testSideEffect(
        handleMidnightSettingsChange,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            midnight: {
              selectSettingsDrawerState$: cold('a', {
                a: {
                  status: 'Saving' as const,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                  config: 'config' as any,
                  networkId: 'preview' as const,
                },
              }),
            },
            wallets: {
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
              selectActiveNetworkAccounts$: cold('a', { a: [midnightAccount] }),
            },
            midnightContext: {
              selectMidnightBlockchainNetworkId$: cold('a', {
                a: MidnightNetworkId(networkId),
              }),
              selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                a: EMPTY_PARTIAL_NETWORKS_CONFIG,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(abcd)', {
              a: actions.network.setNetworkType('testnet'),
              b: actions.network.setBlockchainNetworks({
                blockchain: 'Midnight',
                mainnet: MidnightNetworkId('mainnet'),
                testnet: MidnightNetworkId(MidnightSDKNetworkIds.Preview),
              }),
              c: actions.midnightContext.setUserNetworkConfigOverride({
                networkId: MidnightSDKNetworkIds.Preview,
                config,
                featureFlagsOverrides: {},
              }),
              d: actions.midnight.savingCompleted(),
            });
          },
        }),
      );
    });

    it('confirms change when selecting mainnet, does not update blockchainNetworks', () => {
      const config = 'config' as unknown as MidnightNetworkConfig;

      testSideEffect(
        handleMidnightSettingsChange,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            midnight: {
              selectSettingsDrawerState$: cold('a', {
                a: {
                  status: 'Saving' as const,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                  config: 'config' as any,
                  networkId: MidnightSDKNetworkIds.MainNet,
                },
              }),
            },
            wallets: {
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
              selectActiveNetworkAccounts$: cold('a', { a: [midnightAccount] }),
            },
            midnightContext: {
              selectMidnightBlockchainNetworkId$: cold('a', {
                a: MidnightNetworkId('mainnet'),
              }),
              selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                a: EMPTY_PARTIAL_NETWORKS_CONFIG,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(abc)', {
              a: actions.network.setNetworkType('mainnet'),
              b: actions.midnightContext.setUserNetworkConfigOverride({
                networkId: MidnightSDKNetworkIds.MainNet,
                config,
                featureFlagsOverrides: {},
              }),
              c: actions.midnight.savingCompleted(),
            });
          },
        }),
      );
    });
  });

  describe('syncSupportedNetworksWithFeatureFlags', () => {
    it('should ignore null emissions from selectNextFeatureFlags', () => {
      testSideEffect(
        syncSupportedNetworksWithFeatureFlags,
        ({ expectObservable, cold }) => {
          const previewSupportFeatureFlag = {
            key: FeatureFlagKey(
              FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT,
            ),
          };

          const loadedFeatures: Features = {
            featureFlags: [previewSupportFeatureFlag],
            modules: [
              {
                moduleName: ModuleName('TestModule'),
              },
            ],
          };

          const supportedNetworksIds = [
            MidnightSDKNetworkIds.Preview,
            MidnightSDKNetworkIds.Undeployed,
          ];
          const defaultTestNetNetworkId = MidnightSDKNetworkIds.Preview;
          const activeNetworkId = MidnightSDKNetworkIds.Preview;

          return {
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', { a: loadedFeatures }),
                selectNextFeatureFlags$: cold('a', { a: null }),
              },
              midnightContext: {
                selectSupportedNetworksIds$: cold('a', {
                  a: supportedNetworksIds,
                }),
                selectDefaultTestNetNetworkId$: cold('a', {
                  a: defaultTestNetNetworkId,
                }),
                selectNetworkId$: cold('a', { a: activeNetworkId }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              // Only loaded features should produce actions, null from next is ignored
              expectObservable(sideEffect$).toBe('1000ms (ab)', {
                a: actions.midnightContext.setSupportedNetworksIds([
                  MidnightSDKNetworkIds.Undeployed,
                  MidnightSDKNetworkIds.Preview,
                ]),
                b: actions.network.setTestnetOptions({
                  blockchainName: 'Midnight',
                  options: [
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Undeployed),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Undeployed}`,
                    },
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Preview),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Preview}`,
                    },
                  ],
                }),
              });
            },
          };
        },
      );
    });

    it('should enable mainnet support when feature flag is present', () => {
      testSideEffect(
        syncSupportedNetworksWithFeatureFlags,
        ({ expectObservable, cold }) => {
          const mainnetSupportFeatureFlag = {
            key: FeatureFlagKey(
              FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_MAINNET_SUPPORT,
            ),
          };
          const previewSupportFeatureFlag = {
            key: FeatureFlagKey(
              FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT,
            ),
          };

          const loadedFeatures: Features = {
            featureFlags: [
              mainnetSupportFeatureFlag,
              previewSupportFeatureFlag,
            ],
            modules: [
              {
                moduleName: ModuleName('TestModule'),
              },
            ],
          };

          const supportedNetworksIds = [
            MidnightSDKNetworkIds.Preview,
            MidnightSDKNetworkIds.Undeployed,
          ];
          const defaultTestNetNetworkId = MidnightSDKNetworkIds.Preview;
          const activeNetworkId = MidnightSDKNetworkIds.Preview;

          return {
            actionObservables: {},
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', { a: loadedFeatures }),
                selectNextFeatureFlags$: cold(''),
              },
              midnightContext: {
                selectSupportedNetworksIds$: cold('a', {
                  a: supportedNetworksIds,
                }),
                selectDefaultTestNetNetworkId$: cold('a', {
                  a: defaultTestNetNetworkId,
                }),
                selectNetworkId$: cold('a', { a: activeNetworkId }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('1000ms (ab)', {
                a: actions.midnightContext.setSupportedNetworksIds([
                  MidnightSDKNetworkIds.Undeployed,
                  MidnightSDKNetworkIds.MainNet,
                  MidnightSDKNetworkIds.Preview,
                ]),
                b: actions.network.setTestnetOptions({
                  blockchainName: 'Midnight',
                  options: [
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Undeployed),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Undeployed}`,
                    },
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Preview),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Preview}`,
                    },
                  ],
                }),
              });
            },
          };
        },
      );
    });

    it('should disable mainnet support when feature flag is not present', () => {
      testSideEffect(
        syncSupportedNetworksWithFeatureFlags,
        ({ expectObservable, cold }) => {
          const previewSupportFeatureFlag = {
            key: FeatureFlagKey(
              FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT,
            ),
          };

          const loadedFeatures: Features = {
            featureFlags: [previewSupportFeatureFlag],
            modules: [
              {
                moduleName: ModuleName('TestModule'),
              },
            ],
          };

          const supportedNetworksIds = [
            MidnightSDKNetworkIds.Preview,
            MidnightSDKNetworkIds.Undeployed,
            MidnightSDKNetworkIds.MainNet,
          ];
          const defaultTestNetNetworkId = MidnightSDKNetworkIds.Preview;
          const activeNetworkId = MidnightSDKNetworkIds.Preview;

          return {
            actionObservables: {},
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', { a: loadedFeatures }),
                selectNextFeatureFlags$: cold(''),
              },
              midnightContext: {
                selectSupportedNetworksIds$: cold('a', {
                  a: supportedNetworksIds,
                }),
                selectDefaultTestNetNetworkId$: cold('a', {
                  a: defaultTestNetNetworkId,
                }),
                selectNetworkId$: cold('a', { a: activeNetworkId }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('1000ms (ab)', {
                a: actions.midnightContext.setSupportedNetworksIds([
                  MidnightSDKNetworkIds.Undeployed,
                  MidnightSDKNetworkIds.Preview,
                ]),
                b: actions.network.setTestnetOptions({
                  blockchainName: 'Midnight',
                  options: [
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Undeployed),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Undeployed}`,
                    },
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Preview),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Preview}`,
                    },
                  ],
                }),
              });
            },
          };
        },
      );
    });

    it('should switch to testnet when mainnet is disabled and current network is mainnet', () => {
      testSideEffect(
        syncSupportedNetworksWithFeatureFlags,
        ({ expectObservable, cold }) => {
          const previewSupportFeatureFlag = {
            key: FeatureFlagKey(
              FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT,
            ),
          };

          const loadedFeatures: Features = {
            featureFlags: [previewSupportFeatureFlag],
            modules: [
              {
                moduleName: ModuleName('TestModule'),
              },
            ],
          };

          const supportedNetworksIds = [
            MidnightSDKNetworkIds.Preview,
            MidnightSDKNetworkIds.Undeployed,
            MidnightSDKNetworkIds.MainNet,
          ];
          const defaultTestNetNetworkId = MidnightSDKNetworkIds.Preview;
          const activeNetworkId = MidnightSDKNetworkIds.MainNet;

          return {
            actionObservables: {},
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', { a: loadedFeatures }),
                selectNextFeatureFlags$: cold(''),
              },
              midnightContext: {
                selectSupportedNetworksIds$: cold('a', {
                  a: supportedNetworksIds,
                }),
                selectDefaultTestNetNetworkId$: cold('a', {
                  a: defaultTestNetNetworkId,
                }),
                selectNetworkId$: cold('a', { a: activeNetworkId }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('1000ms (abc)', {
                a: actions.midnightContext.setSupportedNetworksIds([
                  MidnightSDKNetworkIds.Undeployed,
                  MidnightSDKNetworkIds.Preview,
                ]),
                b: actions.network.setTestnetOptions({
                  blockchainName: 'Midnight',
                  options: [
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Undeployed),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Undeployed}`,
                    },
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Preview),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Preview}`,
                    },
                  ],
                }),
                c: actions.network.setBlockchainNetworks({
                  blockchain: 'Midnight',
                  mainnet: MidnightNetworkId('mainnet'),
                  testnet: MidnightNetworkId(MidnightSDKNetworkIds.Preview),
                }),
              });
            },
          };
        },
      );
    });

    it('should not switch network when mainnet is disabled but current network is not mainnet', () => {
      testSideEffect(
        syncSupportedNetworksWithFeatureFlags,
        ({ expectObservable, cold }) => {
          const previewSupportFeatureFlag = {
            key: FeatureFlagKey(
              FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT,
            ),
          };

          const loadedFeatures: Features = {
            featureFlags: [previewSupportFeatureFlag],
            modules: [
              {
                moduleName: ModuleName('TestModule'),
              },
            ],
          };

          const supportedNetworksIds = [
            MidnightSDKNetworkIds.Preview,
            MidnightSDKNetworkIds.Undeployed,
            MidnightSDKNetworkIds.MainNet,
          ];
          const defaultTestNetNetworkId = MidnightSDKNetworkIds.Preview;
          const activeNetworkId = MidnightSDKNetworkIds.Preview;

          return {
            actionObservables: {},
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', { a: loadedFeatures }),
                selectNextFeatureFlags$: cold(''),
              },
              midnightContext: {
                selectSupportedNetworksIds$: cold('a', {
                  a: supportedNetworksIds,
                }),
                selectDefaultTestNetNetworkId$: cold('a', {
                  a: defaultTestNetNetworkId,
                }),
                selectNetworkId$: cold('a', { a: activeNetworkId }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('1000ms (ab)', {
                a: actions.midnightContext.setSupportedNetworksIds([
                  MidnightSDKNetworkIds.Undeployed,
                  MidnightSDKNetworkIds.Preview,
                ]),
                b: actions.network.setTestnetOptions({
                  blockchainName: 'Midnight',
                  options: [
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Undeployed),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Undeployed}`,
                    },
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Preview),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Preview}`,
                    },
                  ],
                }),
              });
            },
          };
        },
      );
    });

    it('should handle feature flag changes from next feature flags', () => {
      testSideEffect(
        syncSupportedNetworksWithFeatureFlags,
        ({ expectObservable, cold }) => {
          const mainnetSupportFeatureFlag = {
            key: FeatureFlagKey(
              FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_MAINNET_SUPPORT,
            ),
            enabled: true,
          };
          const previewSupportFeatureFlag = {
            key: FeatureFlagKey(
              FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT,
            ),
            enabled: true,
          };

          const nextFeatureFlags = {
            features: [mainnetSupportFeatureFlag, previewSupportFeatureFlag],
            added: [],
            removed: [],
            updated: [],
          };

          const supportedNetworksIds = [
            MidnightSDKNetworkIds.Preview,
            MidnightSDKNetworkIds.Undeployed,
          ];
          const defaultTestNetNetworkId = MidnightSDKNetworkIds.Preview;
          const activeNetworkId = MidnightSDKNetworkIds.Preview;

          return {
            actionObservables: {},
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold(''),
                selectNextFeatureFlags$: cold('a', { a: nextFeatureFlags }),
              },
              midnightContext: {
                selectSupportedNetworksIds$: cold('a', {
                  a: supportedNetworksIds,
                }),
                selectDefaultTestNetNetworkId$: cold('a', {
                  a: defaultTestNetNetworkId,
                }),
                selectNetworkId$: cold('a', { a: activeNetworkId }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('1000ms (ab)', {
                a: actions.midnightContext.setSupportedNetworksIds([
                  MidnightSDKNetworkIds.Undeployed,
                  MidnightSDKNetworkIds.MainNet,
                  MidnightSDKNetworkIds.Preview,
                ]),
                b: actions.network.setTestnetOptions({
                  blockchainName: 'Midnight',
                  options: [
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Undeployed),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Undeployed}`,
                    },
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Preview),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Preview}`,
                    },
                  ],
                }),
              });
            },
          };
        },
      );
    });

    it('should handle multiple feature flag changes with throttling', () => {
      testSideEffect(
        syncSupportedNetworksWithFeatureFlags,
        ({ expectObservable, cold }) => {
          const mainnetSupportFeatureFlag = {
            key: FeatureFlagKey(
              FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_MAINNET_SUPPORT,
            ),
            enabled: true,
          };
          const previewSupportFeatureFlag = {
            key: FeatureFlagKey(
              FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT,
            ),
            enabled: true,
          };

          const loadedFeatures: Features = {
            featureFlags: [
              mainnetSupportFeatureFlag,
              previewSupportFeatureFlag,
            ],
            modules: [
              {
                moduleName: ModuleName('TestModule'),
              },
            ],
          };

          const supportedNetworksIds = [
            MidnightSDKNetworkIds.Preview,
            MidnightSDKNetworkIds.Undeployed,
          ];
          const defaultTestNetNetworkId = MidnightSDKNetworkIds.Preview;
          const activeNetworkId = MidnightSDKNetworkIds.Preview;

          return {
            actionObservables: {},
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a-b-c', {
                  a: loadedFeatures,
                  b: loadedFeatures,
                  c: loadedFeatures,
                }),
                selectNextFeatureFlags$: cold(''),
              },
              midnightContext: {
                selectSupportedNetworksIds$: cold('a-b-c', {
                  a: supportedNetworksIds,
                  b: supportedNetworksIds,
                  c: supportedNetworksIds,
                }),
                selectDefaultTestNetNetworkId$: cold('a-b-c', {
                  a: defaultTestNetNetworkId,
                  b: defaultTestNetNetworkId,
                  c: defaultTestNetNetworkId,
                }),
                selectNetworkId$: cold('a-b-c', {
                  a: activeNetworkId,
                  b: activeNetworkId,
                  c: activeNetworkId,
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('1000ms (ab)', {
                a: actions.midnightContext.setSupportedNetworksIds([
                  MidnightSDKNetworkIds.Undeployed,
                  MidnightSDKNetworkIds.MainNet,
                  MidnightSDKNetworkIds.Preview,
                ]),
                b: actions.network.setTestnetOptions({
                  blockchainName: 'Midnight',
                  options: [
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Undeployed),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Undeployed}`,
                    },
                    {
                      id: MidnightNetworkId(MidnightSDKNetworkIds.Preview),
                      label: `midnight.network-config.network-option.${MidnightSDKNetworkIds.Preview}`,
                    },
                  ],
                }),
              });
            },
          };
        },
      );
    });
  });

  // NOTE: updateDustBalance tests moved to subscribe-to-wallet.test.ts

  describe('autoDismissMidnightWalletFailure', () => {
    const testWalletId = stubData.walletId;
    const secondWalletId = WalletId('second-wallet-id');
    const testMidnightWallet = {
      walletId: testWalletId,
      accounts: [stubData.midnightAccount],
    } as AnyWallet;
    const secondMidnightWallet = {
      walletId: secondWalletId,
      accounts: [stubData.midnightAccount],
    } as AnyWallet;

    const failureId = MidnightWalletFailureId(testWalletId);
    const secondFailureId = MidnightWalletFailureId(secondWalletId);

    it('dismisses failures for all wallets when app unlocks', () => {
      testSideEffect(
        {
          build: () => autoDismissMidnightWalletFailure,
        },
        ({ expectObservable, cold, hot }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('-a', { a: true }),
            },
            wallets: {
              selectAll$: hot('a', {
                a: [testMidnightWallet, secondMidnightWallet],
              }),
            },
            failures: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              selectFailureById$: hot('a', {
                a: (id: typeof failureId) =>
                  id === failureId
                    ? {
                        failureId,
                        message: 'sync.error.midnight-wallet-start-failed',
                      }
                    : id === secondFailureId
                    ? {
                        failureId: secondFailureId,
                        message: 'sync.error.midnight-wallet-start-failed',
                      }
                    : undefined,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              }) as any,
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-(ab)', {
              a: actions.failures.dismissFailure(failureId),
              b: actions.failures.dismissFailure(secondFailureId),
            });
          },
        }),
      );
    });

    it('does not emit when app is locked', () => {
      testSideEffect(
        {
          build: () => autoDismissMidnightWalletFailure,
        },
        ({ expectObservable, cold, hot }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: false }),
            },
            wallets: {
              selectAll$: hot('a', {
                a: [testMidnightWallet, secondMidnightWallet],
              }),
            },
            failures: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              selectFailureById$: hot('a', {
                a: () => ({
                  failureId,
                  message: 'sync.error.midnight-wallet-start-failed',
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              }) as any,
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        }),
      );
    });

    it('does not emit when failure does not exist', () => {
      testSideEffect(
        {
          build: () => autoDismissMidnightWalletFailure,
        },
        ({ expectObservable, cold, hot }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('-a', { a: true }),
            },
            wallets: {
              selectAll$: hot('a', {
                a: [testMidnightWallet, secondMidnightWallet],
              }),
            },
            failures: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              selectFailureById$: hot('a', {
                a: () => undefined,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              }) as any,
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        }),
      );
    });
  });
});
