import { FeatureFlagKey } from '@lace-contract/feature';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { delay, from, map, of, switchMap, take, withLatestFrom } from 'rxjs';

import { createSecureStorePasswordManager } from '../../authenticators/password/secure-store-password-manager';
import {
  initializeInternalAuthSecretAccessor,
  sendAuthSecretApi,
} from '../auth-secret-accessor-internal';

import { createVerifyAndPropagateAuthSecret } from './auth-verification-handler';
import { authenticateSideEffect } from './authentication';
import { makeAutoConfirmBiometricFromOpenPassword } from './auto-confirm-biometric-from-open-password';
import { makeAuthenticationBiometricVerifying } from './biometrics-side-effects';
import { makeAuthenticationPromptVerifying } from './password-side-effects';

import type { SecureStorePasswordManager } from '../../authenticators/password/secure-store-password-manager';
import type { SideEffect } from '../../contract';
import type { LocalAuthenticationDependency } from '../../local-authentication';
import type { Features } from '@lace-contract/feature';
import type {
  AnyLaceSideEffect,
  LaceInit,
  LacePlatform,
} from '@lace-contract/module';
import type { SecureStore } from '@lace-contract/secure-store';
import type { Observable } from 'rxjs';

/**
 * Checks if biometric enforcement is enabled from feature flags.
 */
const isBiometricEnforcementEnabled = (
  loadedFeatures: Features | undefined,
): boolean => {
  const flag = loadedFeatures?.featureFlags?.find(
    f => f.key === FeatureFlagKey('ENFORCE_BIOMETRIC_REQUIREMENT'),
  );
  if (!flag || !('payload' in flag)) {
    return false;
  }
  return (flag.payload as { enabled?: boolean })?.enabled === true;
};

/**
 * Safely clears the password flag with error handling.
 */
const tryClearPasswordFlag = (
  passwordManager: SecureStorePasswordManager,
): void => {
  try {
    passwordManager.clearPasswordFlag();
  } catch {
    // Silently handle error - clearing the flag is a best-effort operation
  }
};

/**
 * Handles the case where no password is stored and device auth is unavailable.
 * Either requires biometrics (if enforced) or falls back to password.
 */
const shouldEnforceBiometric = (
  selectLoadedFeatures$: Observable<Features | undefined>,
  platform: LacePlatform,
) => {
  return selectLoadedFeatures$.pipe(
    take(1),
    map(
      loadedFeatures =>
        (['ios', 'android'] as LacePlatform[]).includes(platform) &&
        isBiometricEnforcementEnabled(loadedFeatures),
    ),
  );
};

const checkLocalAuthAvailability = ({
  localAuthentication,
  platform,
  secureStore,
}: {
  localAuthentication: LocalAuthenticationDependency;
  platform: LacePlatform;
  secureStore: SecureStore;
}) =>
  localAuthentication.getEnrolledLevel().pipe(
    map(enrolledLevel => {
      // - Web: none
      // - iOS and Android: biometrics ONLY
      const isMobile = (['ios', 'android'] as LacePlatform[]).includes(
        platform,
      );
      let isLocalAuthAvailable = false;
      if (isMobile) {
        isLocalAuthAvailable =
          enrolledLevel === 'biometric' &&
          secureStore.canUseBiometricAuthentication();
      }

      return isLocalAuthAvailable;
    }),
  );

/**
 * Determines which authentication method to use based on device capabilities
 * and whether a biometric-protected password exists.
 *
 * Decision flow:
 * 1. Check if a biometric password was stored (flag check - no auth prompt)
 * 2. Check if device auth is currently available
 * 3. Cross-check: If flag says "yes" but device auth says "no", go to recovery
 * 4. If both say "yes", try biometric flow
 * 5. If flag says "no", check enforcement and fall back to password
 *
 * This cross-check prevents infinite retry loops when:
 * - User removes passcode after setting up wallet (iOS deletes Keychain item)
 * - User adds passcode after setting up wallet (no protected password exists)
 */
export const makeAuthenticationPreparingSideEffect =
  (platform: LacePlatform): SideEffect =>
  (
    _,
    {
      authenticationPrompt: { selectState$ },
      features: { selectLoadedFeatures$ },
    },
    { actions: { authenticationPrompt }, secureStore, localAuthentication },
  ) => {
    const passwordManager = createSecureStorePasswordManager(secureStore);

    return firstStateOfStatus(selectState$, 'Preparing').pipe(
      switchMap(() =>
        checkLocalAuthAvailability({
          localAuthentication,
          platform,
          secureStore,
        }).pipe(
          withLatestFrom(
            shouldEnforceBiometric(selectLoadedFeatures$, platform),
          ),
        ),
      ),
      map(([isLocalAuthAvailable, shouldEnforceBioAuth]) => {
        const hasBiometricPassword = passwordManager.hasStoredPassword();

        if (isLocalAuthAvailable) {
          if (hasBiometricPassword) {
            // Case: Mobile, device auth available, password available - biometric auth
            return authenticationPrompt.openedBiometric();
          }

          if (!hasBiometricPassword) {
            // Case: Mobile, device auth available, password NOT available - password auth
            return authenticationPrompt.openedPassword();
          }
        }

        if (shouldEnforceBioAuth) {
          // Case: Mobile, device auth NOT available but REQUIRED - biometric required info
          return authenticationPrompt.biometricRequired();
        }

        if (!hasBiometricPassword) {
          // Case: Web - password auth
          // Case: Mobile, device auth NOT available, password NOT available - password auth
          return authenticationPrompt.openedPassword();
        }

        // Case: Mobile, device auth NOT available, password available - device auth removed - password auth
        tryClearPasswordFlag(passwordManager);
        return authenticationPrompt.openedPassword();
      }),
    );
  };

export const makeCheckBiometricAvailabilitySideEffect =
  (platform: LacePlatform): SideEffect =>
  (
    { authenticationPrompt: { checkBiometricAvailability$ } },
    _,
    { actions: { authenticationPrompt }, secureStore, localAuthentication },
  ) =>
    checkBiometricAvailability$.pipe(
      // Reduce risk of canUseBiometricAuthentication giving incorrect value.
      // It happens it reports incorrectly when called too early
      delay(100),
      switchMap(() =>
        checkLocalAuthAvailability({
          localAuthentication,
          platform,
          secureStore,
        }),
      ),
      map(isDeviceAuthAvailable =>
        authenticationPrompt.updateBiometricInfo({
          isDeviceAuthAvailable,
        }),
      ),
    );

export const makeAuthenticationPromptCompleting =
  (platform: LacePlatform): SideEffect =>
  (
    _,
    { authenticationPrompt: { selectState$, selectAwaitingBiometricSetup$ } },
    { actions, localAuthentication, secureStore, accessAuthSecret },
  ) =>
    firstStateOfStatus(selectState$, 'Completing').pipe(
      withLatestFrom(selectAwaitingBiometricSetup$),
      switchMap(([{ success }, isAwaitingBiometricSetup]) => {
        return checkLocalAuthAvailability({
          localAuthentication,
          platform,
          secureStore,
        }).pipe(
          switchMap(isLocalAuthAvailable => {
            if (!success || !isAwaitingBiometricSetup || !isLocalAuthAvailable)
              return of(actions.authenticationPrompt.completed({ success }));

            return accessAuthSecret(authSecret => {
              try {
                const passwordManager =
                  createSecureStorePasswordManager(secureStore);
                passwordManager.setPassword(authSecret);
                return of(true);
              } catch {
                return of(false);
              }
            }).pipe(
              switchMap(deviceAuthReady => [
                actions.authenticationPrompt.setDeviceAuthReady({
                  deviceAuthReady,
                }),
                actions.authenticationPrompt.completed({ success }),
              ]),
            );
          }),
        );
      }),
    );

export const initializeSideEffects: LaceInit<AnyLaceSideEffect[]> = async ({
  loadModules,
  runtime,
}) => {
  const [internalAuthSecretApiExtension] = await loadModules(
    'addons.loadAuthenticationPromptInternalAuthSecretApiExtension',
  );
  const { accessSecretFromAuthFlow } = initializeInternalAuthSecretAccessor(
    internalAuthSecretApiExtension,
  );

  const [authSecretVerifier] = await loadModules(
    'addons.loadAuthSecretVerifier',
  );
  if (!authSecretVerifier) {
    throw new Error('Auth secret verifier not provided');
  }
  const { verifyAuthSecret } = authSecretVerifier;

  const verifyAndPropagateAuthSecret = createVerifyAndPropagateAuthSecret({
    accessSecretFromAuthFlow,
    verifyAuthSecret: (...params) => from(verifyAuthSecret(...params)),
  });

  const [deferBiometricExtension] = await loadModules(
    'addons.loadDeferBiometricPromptUntilActive',
  );

  return [
    makeAuthenticationPreparingSideEffect(runtime.platform),
    makeCheckBiometricAvailabilitySideEffect(runtime.platform),
    makeAuthenticationPromptVerifying({
      verifyAndPropagateAuthSecret,
    }),
    makeAuthenticationPromptCompleting(runtime.platform),
    makeAuthenticationBiometricVerifying({
      verifyAndPropagateAuthSecret,
      platform: runtime.platform,
      sendAuthSecretInternally: authSecret =>
        from(sendAuthSecretApi.sendAuthSecretInternally(authSecret)),
    }),
    makeAutoConfirmBiometricFromOpenPassword({
      platform: runtime.platform,
      deferBiometricExtension,
    }),
    authenticateSideEffect,
  ];
};
