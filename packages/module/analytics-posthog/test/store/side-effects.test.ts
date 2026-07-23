import { analyticsActions } from '@lace-contract/analytics';
import { featuresActions } from '@lace-contract/feature';
import { FeatureFlagKey } from '@lace-contract/feature';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import {
  identifyUserWithSuperProperties,
  initializePostHogAnalyticsDependencies,
  trackFeatureInteraction,
  trackFeatureView,
} from '../../src/store/side-effects';

import type { PostHogAnalyticsDependencies } from '../../src/store';
import type { AccountRewardAccountDetailsMap } from '@lace-contract/cardano-context';
import type { PostHogClient } from '@lace-contract/posthog';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const actions = { ...featuresActions, ...analyticsActions };

const makeInMemoryWallet = (
  overrides: Partial<AnyWallet> & { walletId: WalletId },
): AnyWallet =>
  ({
    metadata: { name: 'w', order: 0 },
    accounts: [],
    blockchainSpecific: {},
    type: WalletType.InMemory,
    encryptedRecoveryPhrase: new Uint8Array() as never,
    isPassphraseConfirmed: true,
    ...overrides,
  } as AnyWallet);

describe('Side Effects', () => {
  describe('initializePostHogDependencies', () => {
    it('should subscribe to analytics user ID changes and initialize PostHog dependencies', async () => {
      const stubPosthog = {} as PostHogClient;
      let mockInitializePostHogDependencies: (posthog: PostHogClient) => void;

      const promise = new Promise<void>(resolve => {
        mockInitializePostHogDependencies = vi.fn(posthog => {
          expect(posthog).toBe(stubPosthog);
          resolve(); // resolve promise when called
        });
      });

      testSideEffect(
        initializePostHogAnalyticsDependencies,
        ({ hot, expectObservable }) => {
          return {
            actionObservables: {
              analytics: {
                load$: hot('-a', {
                  a: actions.analytics.load({
                    id: '1',
                  }),
                }),
              },
            },
            dependencies: {
              initializePostHogAnalytics: mockInitializePostHogDependencies,
              posthog: stubPosthog,
              actions,
            } as PostHogAnalyticsDependencies,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('|'); // no emissions
            },
          };
        },
      );

      await promise; // wait until expect inside mock passes
    });
  });

  describe('trackFeatureView', () => {
    it('should track a feature view event when a featureView action is dispatched', () => {
      testSideEffect(trackFeatureView, ({ hot, expectObservable }) => {
        return {
          actionObservables: {
            features: {
              featureView$: hot('-a', {
                a: actions.features.featureView(FeatureFlagKey('key')),
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.analytics.trackEvent({
                eventName: '$feature_view',
                payload: { feature_flag: 'key' },
              }),
            });
          },
        };
      });
    });
  });

  describe('trackFeatureInteraction', () => {
    it('should track a feature interaction event when a featureInteraction action is dispatched', () => {
      testSideEffect(trackFeatureInteraction, ({ hot, expectObservable }) => {
        return {
          actionObservables: {
            features: {
              featureInteraction$: hot('-a', {
                a: actions.features.featureInteraction(FeatureFlagKey('key')),
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.analytics.trackEvent({
                eventName: '$feature_interaction',
                payload: {
                  feature_flag: 'key',
                  $set: { [`$feature_interaction/key`]: true },
                },
              }),
            });
          },
        };
      });
    });
  });

  describe('identifyUserWithSuperProperties', () => {
    const buildStateObservables = ({
      cold,
      wallets = [],
      networkType = 'mainnet',
      cardanoAccounts = [],
      rewardAccountDetails = {},
    }: {
      cold: (pattern: string, values?: Record<string, unknown>) => unknown;
      wallets?: AnyWallet[];
      networkType?: string;
      cardanoAccounts?: Array<{ accountId: AccountId }>;
      rewardAccountDetails?: AccountRewardAccountDetailsMap;
    }) => ({
      analytics: { selectAnalyticsUser$: cold('a', { a: { id: 'user-1' } }) },
      wallets: { selectAll$: cold('a', { a: wallets }) },
      network: { selectNetworkType$: cold('a', { a: networkType }) },
      views: {
        selectColorScheme$: cold('a', { a: 'dark' }),
        selectLanguage$: cold('a', { a: 'en' }),
        selectThemePreference$: cold('a', { a: 'system' }),
      },
      tokenPricing: {
        selectCurrencyPreference$: cold('a', {
          a: { name: 'US Dollar', ticker: 'USD' },
        }),
      },
      cardanoContext: {
        selectActiveCardanoAccounts$: cold('a', { a: cardanoAccounts }),
        selectRewardAccountDetails$: cold('a', { a: rewardAccountDetails }),
      },
    });

    it('identifies the user with baseline super-properties when no wallets', () => {
      const identify = vi.fn();
      testSideEffect(
        identifyUserWithSuperProperties,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: buildStateObservables({
            cold,
            wallets: [],
          }) as never,
          dependencies: {
            posthog: {
              captureEvent: vi.fn(),
              getFeatureFlags: vi.fn(),
              identify,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            // startWith on non-user observables causes multiple emissions as
            // real values trickle in; assert the final stable call.
            expect(identify).toHaveBeenLastCalledWith('user-1', {
              num_wallets: 0,
              num_accounts: 0,
              has_hardware_wallet: false,
              has_ledger: false,
              has_trezor: false,
              has_seed_signer: false,
              has_keystone: false,
              blockchains_with_accounts: [],
              preferred_network_type: 'mainnet',
              preferred_theme: 'dark',
              preferred_theme_mode: 'system',
              preferred_language: 'en',
              preferred_currency: 'USD',
              cardano_governance_accounts: [],
            });
          },
        }),
      );
    });

    it('reports hardware wallet presence and blockchains with accounts', () => {
      const identify = vi.fn();
      const ledgerWallet = makeInMemoryWallet({
        walletId: WalletId('ledger-1'),
        type: WalletType.HardwareLedger,
        accounts: [
          {
            blockchainName: 'Cardano',
            networkType: 'mainnet',
          } as never,
        ],
      });
      const inMemoryWallet = makeInMemoryWallet({
        walletId: WalletId('inmem-1'),
        accounts: [
          { blockchainName: 'Midnight', networkType: 'mainnet' } as never,
          { blockchainName: 'Cardano', networkType: 'testnet' } as never,
        ],
      });

      testSideEffect(
        identifyUserWithSuperProperties,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: buildStateObservables({
            cold,
            wallets: [ledgerWallet, inMemoryWallet],
          }) as never,
          dependencies: {
            posthog: {
              captureEvent: vi.fn(),
              getFeatureFlags: vi.fn(),
              identify,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            // startWith on non-user observables causes multiple emissions as
            // real values trickle in; assert the final stable call.
            const [userId, props] = identify.mock.lastCall as [
              string,
              Record<string, unknown>,
            ];
            expect(userId).toBe('user-1');
            expect(props).toMatchObject({
              num_wallets: 2,
              num_accounts: 3,
              has_hardware_wallet: true,
              has_ledger: true,
              has_trezor: false,
              has_seed_signer: false,
              has_keystone: false,
              blockchains_with_accounts: ['Cardano', 'Midnight'],
              preferred_network_type: 'mainnet',
              preferred_theme: 'dark',
              preferred_language: 'en',
              preferred_currency: 'USD',
            });
          },
        }),
      );
    });

    it('reports has_seed_signer and has_hardware_wallet for a seed signer wallet without flagging ledger or trezor', () => {
      const identify = vi.fn();
      const seedSignerWallet = makeInMemoryWallet({
        walletId: WalletId('seed-signer-1'),
        type: WalletType.HardwareSeedSigner,
        accounts: [
          { blockchainName: 'Cardano', networkType: 'mainnet' } as never,
        ],
      });

      testSideEffect(
        identifyUserWithSuperProperties,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: buildStateObservables({
            cold,
            wallets: [seedSignerWallet],
          }) as never,
          dependencies: {
            posthog: {
              captureEvent: vi.fn(),
              getFeatureFlags: vi.fn(),
              identify,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            const [userId, props] = identify.mock.lastCall as [
              string,
              Record<string, unknown>,
            ];
            expect(userId).toBe('user-1');
            expect(props).toMatchObject({
              num_wallets: 1,
              num_accounts: 1,
              has_hardware_wallet: true,
              has_ledger: false,
              has_trezor: false,
              has_seed_signer: true,
            });
          },
        }),
      );
    });

    it('reports has_keystone and has_hardware_wallet for a keystone wallet without flagging ledger or trezor', () => {
      const identify = vi.fn();
      const keystoneWallet = makeInMemoryWallet({
        walletId: WalletId('keystone-1'),
        type: WalletType.HardwareKeystone,
        accounts: [
          { blockchainName: 'Cardano', networkType: 'mainnet' } as never,
        ],
      });

      testSideEffect(
        identifyUserWithSuperProperties,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: buildStateObservables({
            cold,
            wallets: [keystoneWallet],
          }) as never,
          dependencies: {
            posthog: {
              captureEvent: vi.fn(),
              getFeatureFlags: vi.fn(),
              identify,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            const [userId, props] = identify.mock.lastCall as [
              string,
              Record<string, unknown>,
            ];
            expect(userId).toBe('user-1');
            expect(props).toMatchObject({
              num_wallets: 1,
              num_accounts: 1,
              has_hardware_wallet: true,
              has_ledger: false,
              has_trezor: false,
              has_seed_signer: false,
              has_keystone: true,
            });
          },
        }),
      );
    });

    it('does not identify before consent (analytics user is null)', () => {
      const identify = vi.fn();
      testSideEffect(
        identifyUserWithSuperProperties,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            analytics: { selectAnalyticsUser$: cold('a', { a: null }) },
            wallets: { selectAll$: cold('a', { a: [] }) },
            network: { selectNetworkType$: cold('a', { a: 'mainnet' }) },
            views: {
              selectColorScheme$: cold('a', { a: 'light' }),
              selectLanguage$: cold('a', { a: 'en' }),
              selectThemePreference$: cold('a', { a: 'system' }),
            },
            tokenPricing: {
              selectCurrencyPreference$: cold('a', {
                a: { name: 'US Dollar', ticker: 'USD' },
              }),
            },
            cardanoContext: {
              selectActiveCardanoAccounts$: cold('a', { a: [] }),
              selectRewardAccountDetails$: cold('a', { a: {} }),
            },
          } as never,
          dependencies: {
            posthog: {
              captureEvent: vi.fn(),
              getFeatureFlags: vi.fn(),
              identify,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();
            expect(identify).not.toHaveBeenCalled();
          },
        }),
      );
    });

    it('identifies the user as soon as analytics user is available, before wallets emit', () => {
      const identify = vi.fn();
      testSideEffect(
        identifyUserWithSuperProperties,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            analytics: {
              selectAnalyticsUser$: cold('a', { a: { id: 'user-1' } }),
            },
            // Wallets never emit — simulates cold-start delay
            wallets: { selectAll$: cold('') },
            network: { selectNetworkType$: cold('a', { a: 'mainnet' }) },
            views: {
              selectColorScheme$: cold('a', { a: 'dark' }),
              selectLanguage$: cold('a', { a: 'en' }),
              selectThemePreference$: cold('a', { a: 'system' }),
            },
            tokenPricing: {
              selectCurrencyPreference$: cold('a', {
                a: { name: 'US Dollar', ticker: 'USD' },
              }),
            },
            cardanoContext: {
              selectActiveCardanoAccounts$: cold('a', { a: [] }),
              selectRewardAccountDetails$: cold('a', { a: {} }),
            },
          } as never,
          dependencies: {
            posthog: {
              captureEvent: vi.fn(),
              getFeatureFlags: vi.fn(),
              identify,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            // identify fires despite wallets never emitting — startWith([])
            // provides the initial value. Assert the first call used defaults.
            expect(identify).toHaveBeenCalled();
            expect(identify.mock.calls[0]).toEqual([
              'user-1',
              expect.objectContaining({
                num_wallets: 0,
                num_accounts: 0,
                blockchains_with_accounts: [],
              }),
            ]);
          },
        }),
      );
    });

    it('includes cardano_governance_accounts per account on mainnet, with voting power reported even when not delegating', () => {
      const identify = vi.fn();
      const delegatedAccount = AccountId('wallet1-0-764824073');
      const undelegatedAccount = AccountId('wallet1-1-764824073');
      const rewardAccountDetails: AccountRewardAccountDetailsMap = {
        [delegatedAccount]: {
          rewardAccountInfo: {
            rewardsSum: BigNumber(0n),
            isActive: true,
            isRegistered: true,
            withdrawableAmount: BigNumber(0n),
            drepId: 'drep1abc',
            controlledAmount: BigNumber(BigInt(4_321_550_000)), // 4321.55 ADA
          },
        },
        // Has stake (voting power) but has not delegated its vote.
        [undelegatedAccount]: {
          rewardAccountInfo: {
            rewardsSum: BigNumber(0n),
            isActive: true,
            isRegistered: true,
            withdrawableAmount: BigNumber(0n),
            drepId: undefined,
            controlledAmount: BigNumber(BigInt(4_321_550_000)),
          },
        },
      };

      testSideEffect(
        identifyUserWithSuperProperties,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: buildStateObservables({
            cold,
            cardanoAccounts: [
              { accountId: delegatedAccount },
              { accountId: undelegatedAccount },
            ],
            rewardAccountDetails,
          }) as never,
          dependencies: {
            posthog: {
              captureEvent: vi.fn(),
              getFeatureFlags: vi.fn(),
              identify,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            const [, props] = identify.mock.lastCall as [
              string,
              Record<string, unknown>,
            ];
            expect(props).toMatchObject({
              cardano_governance_accounts: [
                {
                  accountId: delegatedAccount,
                  delegatedTo: 'drep1abc',
                  votingPower: 4320,
                },
                {
                  accountId: undelegatedAccount,
                  delegatedTo: null,
                  votingPower: 4320,
                },
              ],
            });
          },
        }),
      );
    });

    it('omits cardano_governance_accounts when not on mainnet', () => {
      const identify = vi.fn();
      const accountId = AccountId('wallet1-0-764824073');

      testSideEffect(
        identifyUserWithSuperProperties,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: buildStateObservables({
            cold,
            networkType: 'testnet',
            cardanoAccounts: [{ accountId }],
          }) as never,
          dependencies: {
            posthog: {
              captureEvent: vi.fn(),
              getFeatureFlags: vi.fn(),
              identify,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            const [, props] = identify.mock.lastCall as [
              string,
              Record<string, unknown>,
            ];
            expect(props).not.toHaveProperty('cardano_governance_accounts');
          },
        }),
      );
    });
  });
});
