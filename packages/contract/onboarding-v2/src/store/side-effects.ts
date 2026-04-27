import { util } from '@cardano-sdk/key-management';
import { createSecureStorePasswordManager } from '@lace-contract/authentication-prompt';
import { classifyHardwareError } from '@lace-lib/util-hw';
import {
  catchError,
  defer,
  EMPTY,
  finalize,
  from,
  mergeMap,
  of,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';

import {
  createInMemoryWalletEntityFactory,
  executePasswordStrategy,
  resetGuards,
  selectPasswordStrategy,
  validateWalletInput,
  walletCreationGuard,
} from './wallet-creation';

import type { SideEffect } from '../contract';
import type { CreateHardwareWalletProps } from '../types';
import type { WalletCreationContext } from './wallet-creation';
import type { SetupAppLock } from '@lace-contract/app-lock';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { State } from '@lace-contract/module';
import type { LaceInit, LacePlatform } from '@lace-contract/module';
import type { SecureStore } from '@lace-contract/secure-store';
import type { WalletEntity } from '@lace-contract/wallet-repo';
import type { HardwareIntegrationId } from '@lace-lib/util-hw';
import type { Observable } from 'rxjs';

/**
 * Reset the wallet creation guard. Used in tests to ensure clean state.
 */
export const resetWalletCreationGuard = resetGuards;

/**
 * Refreshes the secure store's biometric availability cache.
 */
const refreshBiometricAvailability$ = (secureStore: SecureStore) =>
  from(secureStore.isAvailableAsync()).pipe(switchMap(() => of(undefined)));

interface CreateWalletOptions {
  context: WalletCreationContext;
  trimmedName: string;
  finalRecoveryPhrase: string[];
  isRecoveryFlow: boolean;
  authSecret: AuthSecret;
  hasBiometricPassword: boolean;
}

/**
 * Creates wallet entity and emits success/failure actions.
 */
const createWalletAndEmitActions = ({
  context,
  trimmedName,
  finalRecoveryPhrase,
  isRecoveryFlow,
  authSecret,
  hasBiometricPassword,
}: CreateWalletOptions) => {
  const { integrations, logger, actions, wallets, setupAppLock } = context;

  const createWalletEntity = createInMemoryWalletEntityFactory({
    integrations,
    logger,
  });

  return from(
    createWalletEntity({
      walletName: trimmedName,
      blockchains: context.payload.blockchains,
      password: authSecret,
      order: wallets.length,
      recoveryPhrase: finalRecoveryPhrase,
    }),
  ).pipe(
    mergeMap(wallet => {
      const walletToAdd =
        isRecoveryFlow && !wallet.isPassphraseConfirmed
          ? { ...wallet, isPassphraseConfirmed: true }
          : wallet;

      // For newly created (not restored) Midnight wallets,
      // mark accounts as synced immediately so the portfolio
      // shows an empty state instead of a skeleton loader.
      // A new wallet has no history, so the initial state IS the synced state.
      const midnightSyncActions = isRecoveryFlow
        ? []
        : walletToAdd.accounts
            .filter(account => account.blockchainName === 'Midnight')
            .map(account =>
              actions.sync.markAccountAsSynced({
                accountId: account.accountId,
              }),
            );

      return setupAppLock(authSecret).pipe(
        tap(success => {
          if (success) return;
          throw new Error('Failed to setup the App Lock');
        }),
        switchMap(() => [
          actions.authenticationPrompt.setDeviceAuthReady({
            deviceAuthReady: hasBiometricPassword,
          }),
          actions.wallets.addWallet(walletToAdd),
          ...midnightSyncActions,
          actions.onboardingV2.createWalletSuccess({
            walletId: walletToAdd.walletId,
            isRecovery: isRecoveryFlow,
          }),
        ]),
      );
    }),
    catchError(error => {
      logger.error('Failed to create wallet during onboarding', error);
      return of(
        actions.onboardingV2.createWalletFailure({ reason: 'creation-failed' }),
      );
    }),
    finalize(() => {
      authSecret.fill(0);
    }),
  );
};

/**
 * Handles the wallet creation flow after validation.
 */
const handleWalletCreation = (context: WalletCreationContext) => {
  const { payload, integrations, secureStore, logger, actions } = context;
  const { walletName, blockchains, password, recoveryPhrase } = payload;

  // Validate input
  const validation = validateWalletInput({
    walletName,
    blockchains,
    integrations,
    logger,
  });

  if (!validation.valid) {
    return of(
      actions.onboardingV2.createWalletFailure({ reason: validation.reason }),
    );
  }

  const { trimmedName } = validation;
  const isRecoveryFlow =
    recoveryPhrase !== undefined &&
    Array.isArray(recoveryPhrase) &&
    recoveryPhrase.length > 0;
  const finalRecoveryPhrase = isRecoveryFlow
    ? [...recoveryPhrase]
    : util.generateMnemonicWords();

  // Determine password strategy
  const canUseSecureStoreWithAuth =
    secureStore.canUseBiometricAuthentication() ?? false;
  const hasUserProvidedPassword = password.length > 0;

  logger.debug(
    `[Onboarding] Can use secure store with auth: ${canUseSecureStoreWithAuth}`,
  );
  logger.debug(
    `[Onboarding] User provided password: ${hasUserProvidedPassword}`,
  );

  const strategy = selectPasswordStrategy(
    context.platform,
    canUseSecureStoreWithAuth,
  );

  // Execute password strategy and create wallet
  return from(
    executePasswordStrategy({ strategy, password, secureStore, logger }),
  ).pipe(
    switchMap(passwordResult => {
      if (!passwordResult.success) {
        logger.error('Password strategy failed', passwordResult.error);
        const reason = passwordResult.retryable
          ? 'biometric-auth-failed'
          : 'creation-failed';
        return of(actions.onboardingV2.createWalletFailure({ reason }));
      }

      let hasBiometricPassword = false;
      if (strategy === 'mobileWithBiometricsAndPassword') {
        const passwordManager = createSecureStorePasswordManager(secureStore);
        hasBiometricPassword = passwordManager.hasStoredPassword();
      }

      return createWalletAndEmitActions({
        context,
        trimmedName,
        finalRecoveryPhrase,
        isRecoveryFlow,
        authSecret: passwordResult.authSecret,
        hasBiometricPassword,
      });
    }),
  );
};

const createWalletCreationSideEffect =
  ({
    integrations,
    platform,
    setupAppLock,
  }: {
    integrations: InMemoryWalletIntegration[];
    platform: LacePlatform;
    setupAppLock: SetupAppLock;
  }): SideEffect =>
  (
    { onboardingV2: { attemptCreateWallet$ } },
    { wallets: { selectAll$ } },
    { actions, logger, secureStore },
  ) =>
    attemptCreateWallet$.pipe(
      withLatestFrom(selectAll$),
      switchMap(([{ payload }, wallets]) => {
        if (!walletCreationGuard.tryAcquire()) {
          logger.warn(
            '[Onboarding] Wallet creation already in progress, ignoring duplicate attempt',
          );
          return EMPTY;
        }

        return refreshBiometricAvailability$(secureStore).pipe(
          switchMap(() =>
            handleWalletCreation({
              payload,
              wallets,
              integrations,
              secureStore,
              logger,
              actions,
              platform,
              setupAppLock,
            }),
          ),
          finalize(() => {
            walletCreationGuard.release();
          }),
        );
      }),
    );

/** Promise-based {@link HwWalletConnector} wrapped to return Observables. */
interface ObservableHwWalletConnector {
  id: HardwareIntegrationId;
  createWallet: (
    state: State,
    props: CreateHardwareWalletProps,
  ) => Observable<WalletEntity>;
}

/**
 * The HW connector creates the wallet entity via the service worker. Before
 * registering it we bootstrap the vault's master password (so later in-memory
 * wallet additions can authenticate against it) using the password the user
 * set in the OnboardingDesktopLogin step.
 */
export const createHwWalletCreationSideEffect =
  ({
    hwConnectors,
    platform,
    setupAppLock,
  }: {
    hwConnectors: ObservableHwWalletConnector[];
    platform: LacePlatform;
    setupAppLock: SetupAppLock;
  }): SideEffect =>
  (
    { onboardingV2: { attemptCreateHardwareWallet$ } },
    { onboardingV2: { selectPendingCreateWallet$ } },
    { actions, logger, secureStore, __getState },
  ) =>
    attemptCreateHardwareWallet$.pipe(
      withLatestFrom(selectPendingCreateWallet$),
      switchMap(([{ payload }, pendingCreateWallet]) => {
        if (!walletCreationGuard.tryAcquire()) {
          logger.warn(
            '[Onboarding] Wallet creation already in progress, ignoring duplicate attempt',
          );
          return EMPTY;
        }

        const connector = hwConnectors.find(c => c.id === payload.optionId);
        if (!connector) {
          walletCreationGuard.release();
          logger.error(
            `[Onboarding] Hardware wallet connector not found for ${payload.optionId}`,
          );
          return of(
            actions.onboardingV2.createWalletFailure({ reason: 'generic' }),
          );
        }

        const password = pendingCreateWallet?.password;
        if (!password) {
          walletCreationGuard.release();
          logger.error(
            '[Onboarding] Hardware wallet creation dispatched without a pending password',
          );
          return of(
            actions.onboardingV2.createWalletFailure({
              reason: 'creation-failed',
            }),
          );
        }

        return connector
          .createWallet(__getState(), {
            blockchainName: payload.blockchainName,
            device: payload.device,
            accountIndex: payload.accountIndex,
            derivationType: payload.derivationType,
          })
          .pipe(
            switchMap(wallet =>
              refreshBiometricAvailability$(secureStore).pipe(
                switchMap(() => {
                  const canUseSecureStoreWithAuth =
                    secureStore.canUseBiometricAuthentication() ?? false;
                  const strategy = selectPasswordStrategy(
                    platform,
                    canUseSecureStoreWithAuth,
                  );
                  return from(
                    executePasswordStrategy({
                      strategy,
                      password,
                      secureStore,
                      logger,
                    }),
                  );
                }),
                switchMap(passwordResult => {
                  if (!passwordResult.success) {
                    logger.error(
                      'Password strategy failed',
                      passwordResult.error,
                    );
                    return of(
                      actions.onboardingV2.createWalletFailure({
                        reason: passwordResult.retryable
                          ? 'biometric-auth-failed'
                          : 'creation-failed',
                      }),
                    );
                  }

                  const { authSecret } = passwordResult;
                  return setupAppLock(authSecret).pipe(
                    switchMap(success => {
                      if (!success) {
                        logger.error(
                          '[Onboarding] Failed to setup the App Lock for hardware wallet',
                        );
                        return of(
                          actions.onboardingV2.createWalletFailure({
                            reason: 'creation-failed',
                          }),
                        );
                      }
                      return of(
                        actions.wallets.addWallet(wallet),
                        actions.onboardingV2.createWalletSuccess({
                          walletId: wallet.walletId,
                          isRecovery: false,
                        }),
                      );
                    }),
                    finalize(() => {
                      authSecret.fill(0);
                    }),
                  );
                }),
              ),
            ),
            catchError(error => {
              // Only connector.createWallet errors reach here: the inner
              // password/app-lock chain emits failure actions as values
              // rather than erroring.
              const category = classifyHardwareError(error);
              const message = `[Onboarding] Hardware wallet creation failed: ${category}`;
              if (category === 'generic') {
                logger.error(message, error);
              } else {
                logger.warn(message, error);
              }
              return of(
                actions.onboardingV2.createWalletFailure({ reason: category }),
              );
            }),
            finalize(() => {
              walletCreationGuard.release();
            }),
          );
      }),
    );

export const initializeSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
  runtime,
}) => {
  const integrations =
    (await loadModules('addons.loadInMemoryWalletIntegration')) ?? [];

  const [setupAppLock] = await loadModules('addons.loadSetupAppLock');

  if (!setupAppLock) {
    throw new Error('setupAppLock is not available');
  }

  const hwConnectors =
    (await loadModules('addons.loadHwWalletConnector')) ?? [];

  const observableHwConnectors: ObservableHwWalletConnector[] =
    hwConnectors.map(c => ({
      id: c.id,
      createWallet: (state, props) =>
        defer(() => from(c.createWallet(state, props))),
    }));

  return [
    createWalletCreationSideEffect({
      integrations,
      platform: runtime.platform,
      setupAppLock,
    }),
    ...(observableHwConnectors.length > 0
      ? [
          createHwWalletCreationSideEffect({
            hwConnectors: observableHwConnectors,
            platform: runtime.platform,
            setupAppLock,
          }),
        ]
      : []),
  ];
};
