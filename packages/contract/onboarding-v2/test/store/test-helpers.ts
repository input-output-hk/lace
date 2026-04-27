import {
  AuthSecret,
  authenticationPromptActions,
} from '@lace-contract/authentication-prompt';
import { BlockchainNetworkId } from '@lace-contract/network';
import {
  AccountId,
  WalletId,
  walletsActions,
} from '@lace-contract/wallet-repo';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { onboardingV2Actions as actions } from '../../src';
import {
  initializeSideEffects,
  resetWalletCreationGuard,
} from '../../src/store/side-effects';

import type { SetupAppLock } from '@lace-contract/app-lock';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { LacePlatform, State } from '@lace-contract/module';
import type { SecureStore } from '@lace-contract/secure-store';
import type { WalletEntity } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';
import type { UnknownAction } from 'redux';
import type { Logger } from 'ts-log';

export const mockPasswordManager = {
  createPassword: vi.fn(),
  getPassword: vi.fn(),
  setPassword: vi.fn(),
  deletePassword: vi.fn(),
  hasStoredPassword: vi.fn(),
  clearPasswordFlag: vi.fn(),
};

export const actionsBag = {
  onboardingV2: actions.onboardingV2,
  wallets: walletsActions.wallets,
  authenticationPrompt: authenticationPromptActions.authenticationPrompt,
};

export const testRecoveryPhrase = [
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

export const createLogger = (): Logger => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
});

export const createMockSecureStore = (): SecureStore => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
  canUseBiometricAuthentication: vi.fn().mockReturnValue(true),
  isAvailableAsync: vi.fn().mockResolvedValue(true),
});

export const createMockIntegration = (
  blockchainName: BlockchainName,
): InMemoryWalletIntegration => ({
  blockchainName,
  initializeWallet: vi.fn(async ({ walletId }: { walletId: string }) => ({
    accounts: [
      {
        accountId: AccountId('acc-1'),
        walletId: WalletId(walletId),
        blockchainName,
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

export const createMockSetupAppLock = (): SetupAppLock => vi.fn(() => of(true));

export const loadSideEffects = async (
  integrations: InMemoryWalletIntegration[] | undefined,
  platform: LacePlatform = 'ios',
  setupAppLock: SetupAppLock = createMockSetupAppLock(),
) =>
  initializeSideEffects(
    {
      loadModules: async (token: string) => {
        if (token === 'addons.loadInMemoryWalletIntegration')
          return integrations;
        if (token === 'addons.loadSetupAppLock') return [setupAppLock];
        return undefined;
      },
      runtime: { platform },
    } as never,
    {} as never,
  );

type CreateWalletSuccessAction = {
  type: typeof actionsBag.onboardingV2.createWalletSuccess.type;
  payload: ReturnType<
    typeof actionsBag.onboardingV2.createWalletSuccess
  >['payload'];
};

export const isCreateWalletSuccessAction = (
  action: UnknownAction,
): action is CreateWalletSuccessAction =>
  action.type === actionsBag.onboardingV2.createWalletSuccess.type;

export const setupMobileMocks = () => {
  vi.clearAllMocks();
  resetWalletCreationGuard();
  mockPasswordManager.createPassword.mockReturnValue(
    AuthSecret.fromUTF8('mock-password'),
  );
};

export const setupSideEffect = (
  sideEffect: Awaited<ReturnType<typeof loadSideEffects>>[number],
  logger: Logger,
  secureStore: SecureStore = createMockSecureStore(),
) => {
  const attempt$ = new Subject<
    ReturnType<typeof actionsBag.onboardingV2.attemptCreateWallet>
  >();
  const selectAll$ = new BehaviorSubject<WalletEntity[]>([]);
  const emittedActions: UnknownAction[] = [];

  const subscription = sideEffect(
    {
      onboardingV2: { attemptCreateWallet$: attempt$.asObservable() },
    } as Parameters<typeof sideEffect>[0],
    {
      wallets: { selectAll$: selectAll$.asObservable() },
    } as Parameters<typeof sideEffect>[1],
    {
      actions: actionsBag,
      logger,
      secureStore,
      __getState: () => ({} as State),
    } as Parameters<typeof sideEffect>[2],
  ).subscribe((emission: UnknownAction) => {
    emittedActions.push(emission);
  });

  const trigger = (payload: {
    walletName: string;
    password: string;
    blockchains?: BlockchainName[];
    recoveryPhrase?: string[];
  }) => {
    attempt$.next(
      actionsBag.onboardingV2.attemptCreateWallet({
        walletName: payload.walletName,
        blockchains: payload.blockchains ?? ['Cardano' as BlockchainName],
        password: payload.password,
        recoveryPhrase: payload.recoveryPhrase ?? testRecoveryPhrase,
      }),
    );
  };

  const cleanup = () => {
    subscription.unsubscribe();
    attempt$.complete();
    selectAll$.complete();
  };

  return {
    attempt$,
    selectAll$,
    emittedActions,
    subscription,
    trigger,
    cleanup,
  };
};
