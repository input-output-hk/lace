import { firstStateOfStatus } from '@lace-lib/util-store';
import { EMPTY, of, switchMap, take } from 'rxjs';

import type { SideEffect } from '../../contract';
import type { DeferBiometricPromptUntilActiveExtension } from '../../defer-biometric-prompt-until-active';
import type { LacePlatform } from '@lace-contract/module';

type MakeAutoConfirmBiometricFromOpenPasswordParams = {
  platform: LacePlatform;
  deferBiometricExtension?: DeferBiometricPromptUntilActiveExtension;
};

/**
 * On every transition into `OpenBiometric`, dispatches `confirmedBiometric` once
 * so `makeAuthenticationBiometricVerifying` remains the only path that reads
 * the biometric-protected secret.
 *
 * When a `DeferBiometricPromptUntilActiveExtension` is provided, waits until
 * the extension signals the biometric prompt is allowed before dispatching.
 *
 * Disabled on `web` / `web-extension` platforms.
 */
export const makeAutoConfirmBiometricFromOpenPassword =
  ({
    platform,
    deferBiometricExtension,
  }: MakeAutoConfirmBiometricFromOpenPasswordParams): SideEffect =>
  (_, { authenticationPrompt: { selectState$ } }, { actions }) => {
    if (platform === 'web' || platform === 'web-extension') return EMPTY;

    const confirmed$ = of(actions.authenticationPrompt.confirmedBiometric());

    return firstStateOfStatus(selectState$, 'OpenBiometric').pipe(
      switchMap(() =>
        deferBiometricExtension
          ? deferBiometricExtension
              .createWaitUntilBiometricPromptAllowed()
              .pipe(
                take(1),
                switchMap(() => confirmed$),
              )
          : confirmed$,
      ),
    );
  };
