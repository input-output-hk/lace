import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { BlockchainNetworkId } from '@lace-contract/network';
import { syncActions } from '@lace-contract/sync';
import {
  AccountId,
  WalletId,
  WalletType,
  walletsActions,
} from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { HardwareIntegrationId } from '@lace-lib/util-hw';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { onboardingV2Actions as actions } from '../../src';
import {
  createHwWalletCreationSideEffect,
  initializeSideEffects,
  resetWalletCreationGuard,
} from '../../src/store/side-effects';

import type { SetupAppLock } from '@lace-contract/app-lock';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { SecureStore } from '@lace-contract/secure-store';
import type { WalletEntity } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';
import type { AnyAction } from 'redux';
import type { Logger } from 'ts-log';

// Mock executePasswordStrategy so from(executePasswordStrategy(...)) can emit
// within the RxJS TestScheduler's virtual time (async functions always return
// native Promises which resolve in the microtask queue, outside virtual time).
const { mockExecutePasswordStrategy, realExecuteRef } = vi.hoisted(() => ({
  mockExecutePasswordStrategy: vi.fn(),
  realExecuteRef: { current: undefined as (() => unknown) | undefined },
}));

vi.mock('../../src/store/wallet-creation', async importOriginal => {
  const module_ = await importOriginal();
  const original = module_ as Record<string, unknown>;
  realExecuteRef.current = original.executePasswordStrategy as () => unknown;
  return {
    ...original,
    executePasswordStrategy: mockExecutePasswordStrategy,
  };
});

/**
 * Create a synchronous thenable that `from()` resolves within virtual time.
 * Unlike a native `Promise`, calling `.then(cb)` invokes `cb` immediately.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const syncThenable = <T>(value: T): any => ({
  then: (callback: (v: T) => void) => {
    callback(value);
  },
});

const actionsBag = {
  onboardingV2: actions.onboardingV2,
  wallets: walletsActions.wallets,
  sync: syncActions.sync,
  authenticationPrompt: authenticationPromptActions.authenticationPrompt,
};

const createLogger = (): Logger => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
});

const createMockSecureStore = (): SecureStore => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
  canUseBiometricAuthentication: vi.fn().mockReturnValue(true),
  // Use a then-able that resolves synchronously so from() emits
  // within the RxJS TestScheduler's virtual time frame.
  isAvailableAsync: vi.fn().mockReturnValue({
    then: (callback: (value: boolean) => boolean) => callback(true),
  }),
});

const testRecoveryPhrase = [
  'abandon',
  'ability',
  'able',
  'about',
  'above',
  'absent',
  'absorb',
  'abstract',
  'absurd',
  'abuse',
  'access',
  'accident',
];

const createMockIntegration = (): InMemoryWalletIntegration => ({
  blockchainName: 'Cardano' as BlockchainName,
  initializeWallet: vi.fn(async ({ walletId }) => ({
    accounts: [
      {
        accountId: AccountId('acc-1'),
        walletId: WalletId(String(walletId)),
        blockchainName: 'Cardano' as BlockchainName,
        networkType: 'mainnet' as const,
        blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
        metadata: { name: 'Account 1' },
        blockchainSpecific: {},
        accountType: 'InMemory' as const,
      },
    ],
    blockchainSpecificWalletData: { network: 'Mainnet' },
  })),
  createAccounts: vi.fn(),
  addAccounts: vi.fn(),
});

const createMockSetupAppLock = (): SetupAppLock => vi.fn(() => of(true));

const loadSideEffects = async (
  integrations: InMemoryWalletIntegration[] | undefined,
  setupAppLock: SetupAppLock = createMockSetupAppLock(),
) =>
  initializeSideEffects(
    {
      loadModules: async (token: string) => {
        if (token === 'addons.loadInMemoryWalletIntegration') {
          return integrations;
        }
        if (token === 'addons.loadSetupAppLock') {
          return [setupAppLock];
        }
        return undefined;
      },
      runtime: { platform: 'ios' },
    } as never,
    {} as never,
  );

type AddWalletAction = {
  type: typeof actionsBag.wallets.addWallet.type;
  payload: WalletEntity;
};

type CreateWalletSuccessPayload = ReturnType<
  typeof actionsBag.onboardingV2.createWalletSuccess
>['payload'];

type CreateWalletSuccessAction = {
  type: typeof actionsBag.onboardingV2.createWalletSuccess.type;
  payload: CreateWalletSuccessPayload;
};

const isAddWalletAction = (action: AnyAction): action is AddWalletAction =>
  action.type === actionsBag.wallets.addWallet.type;

const isCreateWalletSuccessAction = (
  action: AnyAction,
): action is CreateWalletSuccessAction =>
  action.type === actionsBag.onboardingV2.createWalletSuccess.type;

/**
 * Wires up a side effect with standard observables and returns helpers to
 * trigger a wallet creation attempt and tear down afterwards.
 */
const setupSideEffect = (
  sideEffect: Awaited<ReturnType<typeof loadSideEffects>>[number],
  logger: Logger,
  onEmit: (action: AnyAction) => void = () => {},
) => {
  const attempt$ = new Subject<
    ReturnType<typeof actionsBag.onboardingV2.attemptCreateWallet>
  >();
  const selectAll$ = new BehaviorSubject<WalletEntity[]>([]);

  const subscription = sideEffect(
    {
      onboardingV2: { attemptCreateWallet$: attempt$.asObservable() },
    } as never,
    {
      wallets: { selectAll$: selectAll$.asObservable() },
    } as never,
    {
      actions: actionsBag,
      logger,
      secureStore: createMockSecureStore(),
    } as never,
  ).subscribe(onEmit);

  const trigger = (
    overrides: {
      walletName?: string;
      password?: string;
      blockchains?: BlockchainName[];
      recoveryPhrase?: string[] | undefined;
    } = {},
  ) => {
    attempt$.next(
      actionsBag.onboardingV2.attemptCreateWallet({
        walletName: overrides.walletName ?? 'Test Wallet',
        blockchains: overrides.blockchains ?? ['Cardano' as BlockchainName],
        password: overrides.password ?? 'test-password',
        ...('recoveryPhrase' in overrides
          ? { recoveryPhrase: overrides.recoveryPhrase }
          : { recoveryPhrase: testRecoveryPhrase }),
      }),
    );
  };

  const cleanup = () => {
    subscription.unsubscribe();
    attempt$.complete();
    selectAll$.complete();
  };

  return { trigger, cleanup };
};

describe('onboarding-v2 side effects', () => {
  beforeEach(() => {
    resetWalletCreationGuard();
    // Default: call through to real async implementation (imperative tests)
    mockExecutePasswordStrategy.mockImplementation(
      realExecuteRef.current as typeof mockExecutePasswordStrategy,
    );
  });

  it('returns invalid-input when wallet name or blockchains are missing', async () => {
    const [sideEffect] = await loadSideEffects([]);
    const logger = createLogger();

    testSideEffect(sideEffect, ({ cold, hot, expectObservable, flush }) => {
      return {
        actionObservables: {
          onboardingV2: {
            attemptCreateWallet$: cold('-a', {
              a: actions.onboardingV2.attemptCreateWallet({
                walletName: '   ',
                blockchains: [],
                password: 'secret',
                recoveryPhrase: ['abandon'],
              }),
            }),
          },
        },
        stateObservables: {
          wallets: {
            selectAll$: hot('a', { a: [] }),
          },
        },
        dependencies: {
          actions: actionsBag,
          logger,
          secureStore: createMockSecureStore(),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: actions.onboardingV2.createWalletFailure({
              reason: 'invalid-input',
            }),
          });

          flush();
        },
      };
    });

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('fails with missing-integration when no integration is available', async () => {
    const [sideEffect] = await loadSideEffects([]);
    const logger = createLogger();

    testSideEffect(sideEffect, ({ cold, hot, expectObservable, flush }) => {
      return {
        actionObservables: {
          onboardingV2: {
            attemptCreateWallet$: cold('-a', {
              a: actions.onboardingV2.attemptCreateWallet({
                walletName: 'My wallet',
                blockchains: ['Cardano' as BlockchainName],
                password: 'secret',
                recoveryPhrase: ['abandon', 'ability', 'able'],
              }),
            }),
          },
        },
        stateObservables: {
          wallets: {
            selectAll$: hot('a', { a: [] }),
          },
        },
        dependencies: {
          actions: actionsBag,
          logger,
          secureStore: createMockSecureStore(),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: actions.onboardingV2.createWalletFailure({
              reason: 'missing-integration',
            }),
          });

          flush();
        },
      };
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Missing in-memory wallet integration for selected blockchains during onboarding',
      { blockchains: ['Cardano'] },
    );
  });

  it('creates an in-memory wallet when inputs are valid', async () => {
    const integration = createMockIntegration();
    const [sideEffect] = await loadSideEffects([integration]);
    const logger = createLogger();

    const emittedWallets: WalletEntity[] = [];
    const emittedSuccessPayloads: CreateWalletSuccessPayload[] = [];
    const { trigger, cleanup } = setupSideEffect(sideEffect, logger, action => {
      if (isAddWalletAction(action)) emittedWallets.push(action.payload);
      else if (isCreateWalletSuccessAction(action))
        emittedSuccessPayloads.push(action.payload);
      else if (
        action.type === actionsBag.authenticationPrompt.setDeviceAuthReady.type
      )
        return;
      else throw new Error(`Unexpected action emitted: ${action.type}`);
    });

    trigger({ walletName: ' Test Wallet ', password: 'top-secret' });
    await vi.waitFor(() => {
      expect(emittedWallets).toHaveLength(1);
      expect(emittedSuccessPayloads).toHaveLength(1);
    });
    cleanup();

    const newWallet = emittedWallets[0];
    expect(newWallet.metadata).toMatchObject({ name: 'Test Wallet', order: 0 });
    expect(newWallet.type).toBe(WalletType.InMemory);
    expect(newWallet.accounts).toHaveLength(1);
    expect(newWallet.blockchainSpecific).toMatchObject({
      Cardano: { network: 'Mainnet' },
    });
    expect(emittedSuccessPayloads[0]).toEqual({
      walletId: newWallet.walletId,
      isRecovery: true,
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(integration.initializeWallet).toHaveBeenCalledTimes(1);
  });

  it('emits addWallet and createWalletSuccess only after setupAppLock succeeds', async () => {
    const mockSetupAppLock: SetupAppLock = vi.fn(() => new Subject<boolean>());

    const [sideEffect] = await loadSideEffects(
      [createMockIntegration()],
      mockSetupAppLock,
    );
    const emittedActions: AnyAction[] = [];
    const { trigger, cleanup } = setupSideEffect(
      sideEffect,
      createLogger(),
      action => emittedActions.push(action),
    );

    // Replace the Subject-returning mock with one we can control
    const setupSubject = new Subject<boolean>();
    vi.mocked(mockSetupAppLock).mockReturnValue(setupSubject.asObservable());

    trigger();

    // Wait for setupAppLock to be called
    await vi.waitFor(() => {
      expect(mockSetupAppLock).toHaveBeenCalledTimes(1);
    });

    // Setup is still pending — success actions must not have been dispatched yet.
    const pendingTypes = emittedActions.map(a => a.type);
    expect(pendingTypes).not.toContain(actionsBag.wallets.addWallet.type);
    expect(pendingTypes).not.toContain(
      actionsBag.onboardingV2.createWalletSuccess.type,
    );

    // Resolve setup — success actions should now be dispatched.
    setupSubject.next(true);
    setupSubject.complete();
    await vi.waitFor(() => {
      const resolvedTypes = emittedActions.map(a => a.type);
      expect(resolvedTypes).toContain(actionsBag.wallets.addWallet.type);
      expect(resolvedTypes).toContain(
        actionsBag.onboardingV2.createWalletSuccess.type,
      );
    });

    cleanup();
  });

  it('dispatches only createWalletFailure when setupAppLock returns false', async () => {
    const mockSetupAppLock: SetupAppLock = vi.fn(() => of(false));

    const [sideEffect] = await loadSideEffects(
      [createMockIntegration()],
      mockSetupAppLock,
    );
    const logger = createLogger();

    const emittedActions: AnyAction[] = [];
    const { trigger, cleanup } = setupSideEffect(sideEffect, logger, action =>
      emittedActions.push(action),
    );

    trigger();
    await vi.waitFor(() => {
      expect(emittedActions).toContainEqual(
        actionsBag.onboardingV2.createWalletFailure({
          reason: 'creation-failed',
        }),
      );
    });
    cleanup();

    // addWallet and createWalletSuccess must never reach the store when
    // setup fails.
    const emittedTypes = emittedActions.map(a => a.type);
    expect(emittedTypes).not.toContain(actionsBag.wallets.addWallet.type);
    expect(emittedTypes).not.toContain(
      actionsBag.onboardingV2.createWalletSuccess.type,
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to create wallet during onboarding',
      expect.any(Error),
    );
  });

  it('throws when setupAppLock addon is missing', async () => {
    return expect(
      initializeSideEffects(
        {
          loadModules: async (token: string) => {
            if (token === 'addons.loadSetupAppLock') return [];
            return undefined;
          },
          runtime: { platform: 'ios' },
        } as never,
        {} as never,
      ),
    ).rejects.toThrow('setupAppLock is not available');
  });

  describe('markAccountAsSynced for Midnight wallets', () => {
    const midnightAccountId = AccountId('midnight-acc-1');

    const createMidnightIntegration = (): InMemoryWalletIntegration => ({
      blockchainName: 'Midnight' as BlockchainName,
      initializeWallet: vi.fn(async ({ walletId }) => ({
        accounts: [
          {
            accountId: midnightAccountId,
            walletId: WalletId(String(walletId)),
            blockchainName: 'Midnight' as BlockchainName,
            networkType: 'testnet' as const,
            blockchainNetworkId: BlockchainNetworkId('midnight-testnet'),
            metadata: { name: 'Midnight Account' },
            blockchainSpecific: {},
            accountType: 'InMemory' as const,
          },
        ],
        blockchainSpecificWalletData: {},
      })),
      createAccounts: vi.fn(),
      addAccounts: vi.fn(),
    });

    it('dispatches markAccountAsSynced for Midnight accounts when creating a new wallet', async () => {
      const integration = createMidnightIntegration();
      const [sideEffect] = await loadSideEffects([integration]);
      const logger = createLogger();

      const allEmissions: AnyAction[] = [];
      const { trigger, cleanup } = setupSideEffect(sideEffect, logger, action =>
        allEmissions.push(action),
      );

      // No recoveryPhrase → isRecoveryFlow = false → new wallet creation
      trigger({
        blockchains: ['Midnight' as BlockchainName],
        recoveryPhrase: undefined,
      });
      await vi.waitFor(() => {
        expect(allEmissions.length).toBeGreaterThanOrEqual(2);
      });
      cleanup();

      const markSyncedActions = allEmissions.filter(
        a => a.type === 'sync/markAccountAsSynced',
      );
      expect(markSyncedActions).toHaveLength(1);
      expect(markSyncedActions[0].payload).toEqual({
        accountId: midnightAccountId,
      });
    });

    it('does not dispatch markAccountAsSynced when restoring a Midnight wallet', async () => {
      const integration = createMidnightIntegration();
      const [sideEffect] = await loadSideEffects([integration]);
      const logger = createLogger();

      const allEmissions: AnyAction[] = [];
      const { trigger, cleanup } = setupSideEffect(sideEffect, logger, action =>
        allEmissions.push(action),
      );

      // Passing recoveryPhrase → isRecoveryFlow = true → restore
      trigger({
        blockchains: ['Midnight' as BlockchainName],
        recoveryPhrase: testRecoveryPhrase,
      });
      await vi.waitFor(() => {
        expect(allEmissions.length).toBeGreaterThanOrEqual(2);
      });
      cleanup();

      const markSyncedActions = allEmissions.filter(
        a => a.type === 'sync/markAccountAsSynced',
      );
      expect(markSyncedActions).toHaveLength(0);
    });

    it('does not dispatch markAccountAsSynced for Cardano-only wallets', async () => {
      const integration = createMockIntegration();
      const [sideEffect] = await loadSideEffects([integration]);
      const logger = createLogger();

      const allEmissions: AnyAction[] = [];
      const { trigger, cleanup } = setupSideEffect(sideEffect, logger, action =>
        allEmissions.push(action),
      );

      trigger({
        blockchains: ['Cardano' as BlockchainName],
        recoveryPhrase: undefined,
      });
      await vi.waitFor(() => {
        expect(allEmissions.length).toBeGreaterThanOrEqual(2);
      });
      cleanup();

      const markSyncedActions = allEmissions.filter(
        a => a.type === 'sync/markAccountAsSynced',
      );
      expect(markSyncedActions).toHaveLength(0);
    });
  });

  describe('hardware wallet creation side effect', () => {
    const ledgerId = HardwareIntegrationId('ledger');
    const mockDevice = {
      vendorId: 0x2c97,
      productId: 0x4015,
      serialNumber: '0001',
    };

    const mockHwWallet: WalletEntity = {
      walletId: WalletId('hw-wallet-1'),
      type: WalletType.HardwareLedger,
      metadata: { name: 'Ledger Wallet', order: 0 },
      accounts: [
        {
          accountId: AccountId('hw-acc-1'),
          walletId: WalletId('hw-wallet-1'),
          blockchainName: 'Cardano' as BlockchainName,
          networkType: 'mainnet' as const,
          blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
          metadata: { name: 'Account 0' },
          blockchainSpecific: {},
          accountType: 'HardwareLedger' as const,
        },
      ],
      blockchainSpecific: {},
    };

    const defaultPayload = actions.onboardingV2.attemptCreateHardwareWallet({
      optionId: ledgerId,
      device: mockDevice,
      accountIndex: 0,
      blockchainName: 'Cardano' as BlockchainName,
    });

    // Mock auth secret with a fill() method (mimics Uint8Array)
    const mockAuthSecret = new Uint8Array(8);

    beforeEach(() => {
      // Return a synchronous thenable so from(executePasswordStrategy(...))
      // emits within the TestScheduler's virtual time.
      mockExecutePasswordStrategy.mockReturnValue(
        syncThenable({ success: true, authSecret: mockAuthSecret }),
      );
    });

    it('dispatches addWallet and createWalletSuccess when connector succeeds', () => {
      const logger = createLogger();
      const createWallet = vi.fn();

      const sideEffect = createHwWalletCreationSideEffect({
        hwConnectors: [{ id: ledgerId, createWallet }],
        platform: 'ios',
        setupAppLock: () => of(true),
      });

      testSideEffect(sideEffect, ({ cold, hot, expectObservable, flush }) => {
        createWallet.mockReturnValue(cold('(a|)', { a: mockHwWallet }));

        return {
          actionObservables: {
            onboardingV2: {
              attemptCreateHardwareWallet$: cold('-a', { a: defaultPayload }),
            },
          },
          stateObservables: {
            onboardingV2: {
              selectPendingCreateWallet$: hot('a', {
                a: { password: 'pwd' },
              }),
            },
          },
          dependencies: {
            actions: actionsBag,
            logger,
            secureStore: createMockSecureStore(),
            __getState: () => ({} as never),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-(ab)', {
              a: actionsBag.wallets.addWallet(mockHwWallet),
              b: actionsBag.onboardingV2.createWalletSuccess({
                walletId: mockHwWallet.walletId,
                isRecovery: false,
              }),
            });

            flush();

            expect(createWallet).toHaveBeenCalledWith(expect.anything(), {
              blockchainName: 'Cardano',
              device: mockDevice,
              accountIndex: 0,
              derivationType: undefined,
            });
          },
        };
      });

      expect(logger.error).not.toHaveBeenCalled();
    });

    it('fails with creation-failed when no pending password is set', () => {
      const logger = createLogger();
      const createWallet = vi.fn();

      const sideEffect = createHwWalletCreationSideEffect({
        hwConnectors: [{ id: ledgerId, createWallet }],
        platform: 'ios',
        setupAppLock: createMockSetupAppLock(),
      });

      testSideEffect(sideEffect, ({ cold, hot, expectObservable, flush }) => {
        return {
          actionObservables: {
            onboardingV2: {
              attemptCreateHardwareWallet$: cold('-a', { a: defaultPayload }),
            },
          },
          stateObservables: {
            onboardingV2: {
              selectPendingCreateWallet$: hot('a', { a: null }),
            },
          },
          dependencies: {
            actions: actionsBag,
            logger,
            secureStore: createMockSecureStore(),
            __getState: () => ({} as never),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actionsBag.onboardingV2.createWalletFailure({
                reason: 'creation-failed',
              }),
            });

            flush();

            expect(createWallet).not.toHaveBeenCalled();
          },
        };
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('without a pending password'),
      );
    });

    it('dispatches createWalletFailure with generic reason when connector not found', () => {
      const logger = createLogger();
      const createWallet = vi.fn();

      const sideEffect = createHwWalletCreationSideEffect({
        hwConnectors: [{ id: ledgerId, createWallet }],
        platform: 'ios',
        setupAppLock: createMockSetupAppLock(),
      });

      testSideEffect(sideEffect, ({ cold, hot, expectObservable, flush }) => {
        const unknownPayload = actions.onboardingV2.attemptCreateHardwareWallet(
          {
            optionId: HardwareIntegrationId('trezor'),
            device: mockDevice,
            accountIndex: 0,
            blockchainName: 'Cardano' as BlockchainName,
          },
        );

        return {
          actionObservables: {
            onboardingV2: {
              attemptCreateHardwareWallet$: cold('-a', { a: unknownPayload }),
            },
          },
          stateObservables: {
            onboardingV2: {
              selectPendingCreateWallet$: hot('a', {
                a: { password: 'pwd' },
              }),
            },
          },
          dependencies: {
            actions: actionsBag,
            logger,
            secureStore: createMockSecureStore(),
            __getState: () => ({} as never),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actionsBag.onboardingV2.createWalletFailure({
                reason: 'generic',
              }),
            });

            flush();

            expect(createWallet).not.toHaveBeenCalled();
          },
        };
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('connector not found'),
      );
    });

    it('classifies error and dispatches createWalletFailure when createWallet errors', () => {
      const transportError = new Error(
        'Cannot communicate with Ledger Cardano App',
      );
      const logger = createLogger();
      const createWallet = vi.fn();

      const sideEffect = createHwWalletCreationSideEffect({
        hwConnectors: [{ id: ledgerId, createWallet }],
        platform: 'ios',
        setupAppLock: () => of(true),
      });

      testSideEffect(sideEffect, ({ cold, hot, expectObservable, flush }) => {
        createWallet.mockReturnValue(cold('#', undefined, transportError));

        return {
          actionObservables: {
            onboardingV2: {
              attemptCreateHardwareWallet$: cold('-a', { a: defaultPayload }),
            },
          },
          stateObservables: {
            onboardingV2: {
              selectPendingCreateWallet$: hot('a', {
                a: { password: 'pwd' },
              }),
            },
          },
          dependencies: {
            actions: actionsBag,
            logger,
            secureStore: createMockSecureStore(),
            __getState: () => ({} as never),
          },
          assertion: sideEffect$ => {
            // classifyHardwareError maps "cardano app" message → 'app-not-open'
            expectObservable(sideEffect$).toBe('-a', {
              a: actionsBag.onboardingV2.createWalletFailure({
                reason: 'app-not-open',
              }),
            });

            flush();
          },
        };
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Hardware wallet creation failed: app-not-open',
        ),
        transportError,
      );
    });

    it('logs non-generic hw failures without detaching the logger method binding', () => {
      // Regression: AppLogger.warn reads `this.shouldLog`; calling it via a
      // detached reference (`const log = logger.warn; log(...)`) crashes at
      // runtime. Enforce the binding with a logger that throws if `this` is
      // not the logger instance.
      class BindingCheckingLogger implements Logger {
        public readonly warnCalls: unknown[][] = [];
        public readonly errorCalls: unknown[][] = [];
        private readonly shouldLog = true;

        public trace() {
          this.assertBound();
        }
        public debug() {
          this.assertBound();
        }
        public info() {
          this.assertBound();
        }
        public warn(...args: unknown[]) {
          this.assertBound();
          this.warnCalls.push(args);
        }
        public error(...args: unknown[]) {
          this.assertBound();
          this.errorCalls.push(args);
        }

        private assertBound(): void {
          // Mimics AppLogger reading `this.shouldLog`: throws when detached.
          if (!this.shouldLog) return;
        }
      }

      const logger = new BindingCheckingLogger();
      const createWallet = vi.fn();

      const sideEffect = createHwWalletCreationSideEffect({
        hwConnectors: [{ id: ledgerId, createWallet }],
        platform: 'ios',
        setupAppLock: () => of(true),
      });

      testSideEffect(sideEffect, ({ cold, hot, expectObservable, flush }) => {
        createWallet.mockReturnValue(
          cold(
            '#',
            undefined,
            new Error('Cannot communicate with Ledger Cardano App'),
          ),
        );

        return {
          actionObservables: {
            onboardingV2: {
              attemptCreateHardwareWallet$: cold('-a', { a: defaultPayload }),
            },
          },
          stateObservables: {
            onboardingV2: {
              selectPendingCreateWallet$: hot('a', {
                a: { password: 'pwd' },
              }),
            },
          },
          dependencies: {
            actions: actionsBag,
            logger,
            secureStore: createMockSecureStore(),
            __getState: () => ({} as never),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actionsBag.onboardingV2.createWalletFailure({
                reason: 'app-not-open',
              }),
            });
            flush();
          },
        };
      });

      expect(logger.warnCalls).toHaveLength(1);
      expect(logger.errorCalls).toHaveLength(0);
    });

    it('dispatches only createWalletFailure when setupAppLock returns false', () => {
      const logger = createLogger();
      const createWallet = vi.fn();

      const sideEffect = createHwWalletCreationSideEffect({
        hwConnectors: [{ id: ledgerId, createWallet }],
        platform: 'ios',
        setupAppLock: () => of(false),
      });

      testSideEffect(sideEffect, ({ cold, hot, expectObservable, flush }) => {
        createWallet.mockReturnValue(cold('(a|)', { a: mockHwWallet }));

        return {
          actionObservables: {
            onboardingV2: {
              attemptCreateHardwareWallet$: cold('-a', { a: defaultPayload }),
            },
          },
          stateObservables: {
            onboardingV2: {
              selectPendingCreateWallet$: hot('a', {
                a: { password: 'pwd' },
              }),
            },
          },
          dependencies: {
            actions: actionsBag,
            logger,
            secureStore: createMockSecureStore(),
            __getState: () => ({} as never),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actionsBag.onboardingV2.createWalletFailure({
                reason: 'creation-failed',
              }),
            });

            flush();

            expect(createWallet).toHaveBeenCalledTimes(1);
          },
        };
      });

      expect(logger.error).toHaveBeenCalledWith(
        '[Onboarding] Failed to setup the App Lock for hardware wallet',
      );
    });
  });
});
