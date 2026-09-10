import { analyticsActions } from '@lace-contract/analytics';
import { featuresActions } from '@lace-contract/feature';
import { FeatureFlagKey } from '@lace-contract/feature';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  identifyUserWithSuperProperties,
  initializePostHogAnalyticsDependencies,
  trackFeatureInteraction,
  trackFeatureView,
} from '../../src/store/side-effects';
import {
  posthogAnalyticsActions,
  posthogAnalyticsReducers,
} from '../../src/store/slice';

import type { PostHogAnalyticsDependencies } from '../../src/store';
import type { IdentifiedUser } from '../../src/store/slice';
import type { AccountRewardAccountDetailsMap } from '@lace-contract/cardano-context';
import type { PostHogClient } from '@lace-contract/posthog';
import type { AnyWallet } from '@lace-contract/wallet-repo';
import type { UnknownAction } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

const actions = {
  ...featuresActions,
  ...analyticsActions,
  ...posthogAnalyticsActions,
};

const stubLogger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  trace: vi.fn(),
  warn: vi.fn(),
};

const makeDependencies = (
  identify: PostHogClient['identify'],
  logger: typeof stubLogger = stubLogger,
) => ({
  actions,
  logger,
  posthog: {
    captureEvent: vi.fn(),
    getFeatureFlags: vi.fn(),
    identify,
  },
});

/**
 * Records what the side effect emits, and rethrows: a stream that dies takes
 * the root epic with it in production, so it has to fail the test rather than
 * quietly emit nothing.
 */
const runSideEffect = (
  sideEffect$: Readonly<Observable<unknown>>,
  flush: () => void,
): unknown[] => {
  const emitted: unknown[] = [];
  sideEffect$.subscribe({
    error: (error: unknown) => {
      throw error;
    },
    next: action => emitted.push(action),
  });
  flush();
  return emitted;
};

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
    const baselineProperties = {
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
    };

    const buildStateObservables = ({
      cold,
      wallets = [],
      networkType = 'mainnet',
      cardanoAccounts = [],
      rewardAccountDetails = {},
      identifiedUser = null,
    }: {
      cold: (pattern: string, values?: Record<string, unknown>) => unknown;
      wallets?: AnyWallet[];
      networkType?: string;
      cardanoAccounts?: Array<{ accountId: AccountId }>;
      rewardAccountDetails?: AccountRewardAccountDetailsMap;
      identifiedUser?: IdentifiedUser | null;
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
      posthogAnalytics: {
        selectIdentifiedUser$: cold('a', { a: identifiedUser }),
      },
    });

    it('identifies once after the debounce window, emits the identified action to persist the snapshot and completes', () => {
      const identify = vi.fn();
      testSideEffect(
        identifyUserWithSuperProperties,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: buildStateObservables({
            cold,
            wallets: [],
          }) as never,
          dependencies: makeDependencies(identify),
          assertion: sideEffect$ => {
            // Completes on the emission: the session cap is spent.
            expectObservable(sideEffect$).toBe('1s (a|)', {
              a: actions.posthogAnalytics.identified({
                userId: 'user-1',
                properties: baselineProperties,
              }),
            });
            flush();

            expect(identify).toHaveBeenCalledTimes(1);
            expect(identify).toHaveBeenCalledWith('user-1', baselineProperties);
          },
        }),
      );
    });

    it('does not re-identify when the snapshot matches the persisted identifiedUser', () => {
      const identify = vi.fn();
      testSideEffect(
        identifyUserWithSuperProperties,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: buildStateObservables({
            cold,
            wallets: [],
            identifiedUser: {
              userId: 'user-1',
              properties: baselineProperties,
            },
          }) as never,
          dependencies: makeDependencies(identify),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();
            expect(identify).not.toHaveBeenCalled();
          },
        }),
      );
    });

    it('re-identifies when the snapshot differs from the persisted identifiedUser', () => {
      const identify = vi.fn();
      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => ({
        stateObservables: buildStateObservables({
          cold,
          wallets: [],
          identifiedUser: {
            userId: 'user-1',
            properties: { ...baselineProperties, num_wallets: 1 },
          },
        }) as never,
        dependencies: makeDependencies(identify),
        assertion: sideEffect$ => {
          expect(runSideEffect(sideEffect$, flush)).toEqual([
            actions.posthogAnalytics.identified({
              userId: 'user-1',
              properties: baselineProperties,
            }),
          ]);
          expect(identify).toHaveBeenCalledTimes(1);
          expect(identify).toHaveBeenCalledWith('user-1', baselineProperties);
        },
      }));
    });

    it('collapses staggered state emissions within the debounce window into a single identify call', () => {
      const identify = vi.fn();
      const wallet = makeInMemoryWallet({ walletId: WalletId('w-1') });
      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => ({
        stateObservables: {
          ...buildStateObservables({ cold }),
          // Async settling shortly after boot: the startWith placeholder is
          // replaced by the real wallet list a few frames into the window.
          wallets: { selectAll$: cold('a-b', { a: [], b: [wallet] }) },
        } as never,
        dependencies: makeDependencies(identify),
        assertion: sideEffect$ => {
          expect(runSideEffect(sideEffect$, flush)).toHaveLength(1);
          expect(identify).toHaveBeenCalledTimes(1);
          expect(identify).toHaveBeenCalledWith(
            'user-1',
            expect.objectContaining({ num_wallets: 1 }),
          );
        },
      }));
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

      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => ({
        stateObservables: buildStateObservables({
          cold,
          wallets: [ledgerWallet, inMemoryWallet],
        }) as never,
        dependencies: makeDependencies(identify),
        assertion: sideEffect$ => {
          expect(runSideEffect(sideEffect$, flush)).toHaveLength(1);

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
      }));
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

      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => ({
        stateObservables: buildStateObservables({
          cold,
          wallets: [seedSignerWallet],
        }) as never,
        dependencies: makeDependencies(identify),
        assertion: sideEffect$ => {
          expect(runSideEffect(sideEffect$, flush)).toHaveLength(1);

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
      }));
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

      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => ({
        stateObservables: buildStateObservables({
          cold,
          wallets: [keystoneWallet],
        }) as never,
        dependencies: makeDependencies(identify),
        assertion: sideEffect$ => {
          expect(runSideEffect(sideEffect$, flush)).toHaveLength(1);

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
      }));
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
            posthogAnalytics: {
              selectIdentifiedUser$: cold('a', { a: null }),
            },
          } as never,
          dependencies: makeDependencies(identify),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();
            expect(identify).not.toHaveBeenCalled();
          },
        }),
      );
    });

    it('identifies after the debounce window even when wallets never emit', () => {
      const identify = vi.fn();
      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => ({
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
          posthogAnalytics: {
            selectIdentifiedUser$: cold('a', { a: null }),
          },
        } as never,
        dependencies: makeDependencies(identify),
        assertion: sideEffect$ => {
          expect(runSideEffect(sideEffect$, flush)).toHaveLength(1);

          // identify fires despite wallets never emitting — startWith([])
          // provides the initial value.
          expect(identify).toHaveBeenCalledTimes(1);
          expect(identify).toHaveBeenCalledWith(
            'user-1',
            expect.objectContaining({
              num_wallets: 0,
              num_accounts: 0,
              blockchains_with_accounts: [],
            }),
          );
        },
      }));
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

      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => ({
        stateObservables: buildStateObservables({
          cold,
          cardanoAccounts: [
            { accountId: delegatedAccount },
            { accountId: undelegatedAccount },
          ],
          rewardAccountDetails,
        }) as never,
        dependencies: makeDependencies(identify),
        assertion: sideEffect$ => {
          expect(runSideEffect(sideEffect$, flush)).toHaveLength(1);

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
      }));
    });

    it('omits cardano_governance_accounts when not on mainnet', () => {
      const identify = vi.fn();
      const accountId = AccountId('wallet1-0-764824073');

      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => ({
        stateObservables: buildStateObservables({
          cold,
          networkType: 'testnet',
          cardanoAccounts: [{ accountId }],
        }) as never,
        dependencies: makeDependencies(identify),
        assertion: sideEffect$ => {
          expect(runSideEffect(sideEffect$, flush)).toHaveLength(1);

          const [, props] = identify.mock.lastCall as [
            string,
            Record<string, unknown>,
          ];
          expect(props).not.toHaveProperty('cardano_governance_accounts');
        },
      }));
    });

    it('omits cardano_governance_accounts while reward account details are unloaded, so a boot before they arrive does not re-identify', () => {
      const identify = vi.fn();
      const accountId = AccountId('wallet1-0-764824073');

      testSideEffect(
        identifyUserWithSuperProperties,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: buildStateObservables({
            cold,
            cardanoAccounts: [{ accountId }],
            // rewardAccountDetails is not persisted while the accounts it
            // describes are: this is the state of every mainnet boot.
            rewardAccountDetails: {},
            identifiedUser: {
              userId: 'user-1',
              properties: {
                ...baselineProperties,
                cardano_governance_accounts: [
                  { accountId, delegatedTo: 'drep1abc', votingPower: 4320 },
                ],
              },
            },
          }) as never,
          dependencies: makeDependencies(identify),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();
            expect(identify).not.toHaveBeenCalled();
          },
        }),
      );
    });

    it('identifies exactly once when reward account details arrive after boot, carrying the loaded governance data', () => {
      const identify = vi.fn();
      const accountId = AccountId('wallet1-0-764824073');
      const rewardAccountDetails: AccountRewardAccountDetailsMap = {
        [accountId]: {
          rewardAccountInfo: {
            rewardsSum: BigNumber(0n),
            isActive: true,
            isRegistered: true,
            withdrawableAmount: BigNumber(0n),
            drepId: 'drep1abc',
            controlledAmount: BigNumber(BigInt(4_321_550_000)),
          },
        },
      };

      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => ({
        stateObservables: {
          ...buildStateObservables({
            cold,
            cardanoAccounts: [{ accountId }],
            identifiedUser: {
              userId: 'user-1',
              properties: baselineProperties,
            },
          }),
          cardanoContext: {
            selectActiveCardanoAccounts$: cold('a', { a: [{ accountId }] }),
            // The provider answers well after the debounce window closes.
            selectRewardAccountDetails$: cold('a 2s b', {
              a: {},
              b: rewardAccountDetails,
            }),
          },
        } as never,
        dependencies: makeDependencies(identify),
        assertion: sideEffect$ => {
          expect(runSideEffect(sideEffect$, flush)).toHaveLength(1);
          expect(identify).toHaveBeenCalledTimes(1);
          expect(identify).toHaveBeenCalledWith('user-1', {
            ...baselineProperties,
            cardano_governance_accounts: [
              { accountId, delegatedTo: 'drep1abc', votingPower: 4320 },
            ],
          });
        },
      }));
    });

    it('logs when identify throws, persists no snapshot for it and does not spend the session cap on it', () => {
      const failure = new Error('posthog unreachable');
      const identify = vi.fn().mockImplementationOnce(() => {
        throw failure;
      });
      const logger = { ...stubLogger, error: vi.fn() };
      const wallet = makeInMemoryWallet({ walletId: WalletId('w-1') });

      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => ({
        stateObservables: {
          ...buildStateObservables({ cold }),
          wallets: { selectAll$: cold('a 2s b', { a: [], b: [wallet] }) },
        } as never,
        dependencies: makeDependencies(identify, logger),
        assertion: sideEffect$ => {
          // Only the second identity is persisted: a snapshot for the throw
          // would dedupe against an identify that never left.
          expect(runSideEffect(sideEffect$, flush)).toEqual([
            actions.posthogAnalytics.identified({
              userId: 'user-1',
              properties: { ...baselineProperties, num_wallets: 1 },
            }),
          ]);
          expect(identify).toHaveBeenCalledTimes(2);
          expect(logger.error).toHaveBeenCalledWith(
            'Failed to identify PostHog user',
            failure,
          );
        },
      }));
    });

    it('identifies at most once per session, writing the sent payload to the snapshot and leaving a later change to the next session', () => {
      const identify = vi.fn();
      const wallet = makeInMemoryWallet({ walletId: WalletId('w-1') });
      const reducer = posthogAnalyticsReducers.posthogAnalytics;

      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => {
        // Real slice state driven by the emitted actions, so the
        // identify -> persist loop the restart dedupe rests on is exercised
        // end to end; a broken write-back cannot pass this.
        let sliceState = reducer(undefined, { type: '@@init' });
        const identifiedUser$ = new BehaviorSubject(sliceState.identifiedUser);

        return {
          stateObservables: {
            ...buildStateObservables({ cold }),
            wallets: { selectAll$: cold('a 2s b', { a: [], b: [wallet] }) },
            posthogAnalytics: { selectIdentifiedUser$: identifiedUser$ },
          } as never,
          dependencies: makeDependencies(identify),
          assertion: sideEffect$ => {
            sideEffect$.subscribe(action => {
              sliceState = reducer(sliceState, action as UnknownAction);
              identifiedUser$.next(sliceState.identifiedUser);
            });
            flush();

            expect(identify).toHaveBeenCalledTimes(1);
            expect(identify).toHaveBeenCalledWith('user-1', baselineProperties);
            expect(sliceState.identifiedUser).toEqual({
              userId: 'user-1',
              properties: baselineProperties,
            });
          },
        };
      });
    });

    it('omits cardano_governance_accounts while only some accounts have reward details, so partial zeroes are never sent', () => {
      const identify = vi.fn();
      const loadedAccount = AccountId('wallet1-0-764824073');
      const unloadedAccount = AccountId('wallet1-1-764824073');

      testSideEffect(identifyUserWithSuperProperties, ({ cold, flush }) => ({
        stateObservables: buildStateObservables({
          cold,
          cardanoAccounts: [
            { accountId: loadedAccount },
            { accountId: unloadedAccount },
          ],
          rewardAccountDetails: {
            [loadedAccount]: {
              rewardAccountInfo: {
                rewardsSum: BigNumber(0n),
                isActive: true,
                isRegistered: true,
                withdrawableAmount: BigNumber(0n),
                drepId: 'drep1abc',
                controlledAmount: BigNumber(BigInt(4_321_550_000)),
              },
            },
          },
        }) as never,
        dependencies: makeDependencies(identify),
        assertion: sideEffect$ => {
          expect(runSideEffect(sideEffect$, flush)).toHaveLength(1);

          const [, props] = identify.mock.lastCall as [
            string,
            Record<string, unknown>,
          ];
          expect(props).not.toHaveProperty('cardano_governance_accounts');
        },
      }));
    });
  });
});
