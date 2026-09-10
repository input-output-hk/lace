import { activitiesActions } from '@lace-contract/activities';
import { addressesActions } from '@lace-contract/addresses';
import { appActions } from '@lace-contract/app';
import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { failuresActions } from '@lace-contract/failures';
import { FeatureFlagKey } from '@lace-contract/feature';
import {
  EMPTY_PARTIAL_NETWORKS_CONFIG,
  midnightContextActions,
  MidnightNetworkId,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { ModuleName } from '@lace-contract/module';
import { networkActions } from '@lace-contract/network';
import { tokensActions } from '@lace-contract/tokens';
import { viewsActions } from '@lace-contract/views';
import { walletsActions, WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { beforeEach, describe, it, vi } from 'vitest';

import {
  FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_MAINNET_SUPPORT,
  FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT,
} from '../../../src/const';
import {
  autoDismissMidnightWalletFailure,
  handleMidnightSettingsChange,
  registerMidnightBlockchainNetworks,
  syncSupportedNetworksWithFeatureFlags,
} from '../../../src/store/side-effects';
import { midnightActions } from '../../../src/store/slice';
import { MidnightWalletFailureId } from '../../../src/value-objects/midnight-wallet-failure-id.vo';

import type { Features } from '@lace-contract/feature';
import type { MidnightNetworkConfig } from '@lace-contract/midnight-context';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const { midnightAccount, midnightWallet, networkId } = stubData;

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

  // NOTE: triggerUnlockFromAuthenticationPrompt tests removed - functionality
  // is now internal to watchMidnightAccount and tested in account-key-manager.test.ts

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

    it('dismisses failures for all wallets when the wallet resumes', () => {
      testSideEffect(
        {
          build: () => autoDismissMidnightWalletFailure,
        },
        ({ expectObservable, cold, hot }) => ({
          stateObservables: {
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
            walletResumed$: cold('-a', { a: undefined }),
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

    it('does not emit when the wallet has not resumed', () => {
      testSideEffect(
        {
          build: () => autoDismissMidnightWalletFailure,
        },
        ({ expectObservable, cold, hot }) => ({
          stateObservables: {
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
            walletResumed$: cold(''),
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
            walletResumed$: cold('-a', { a: undefined }),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        }),
      );
    });
  });
});
