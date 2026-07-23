import { firstStateOfStatus } from '@lace-lib/util-store';
import { switchMap } from 'rxjs';

import type { VerifyAndPropagateAuthSecret } from './auth-verification-handler';
import type { SideEffect } from '../../contract';

/**
 * Configuration parameters for creating the password authentication side effect.
 * Uses the higher-order function pattern where dependencies are pre-configured.
 */
type MakeAuthenticationPromptVerificationParams = {
  /** Pre-configured function that handles authentication verification and propagation */
  verifyAndPropagateAuthSecret: VerifyAndPropagateAuthSecret;
};

/**
 * Creates a side effect that handles password-based authentication verification.
 * This side effect listens for the 'VerifyingPassword' state and triggers the
 * authentication verification and propagation flow.
 *
 * Verification runs synchronously on entering VerifyingPassword. Do NOT wrap it
 * in a timer/delay: the auth secret is placed on the internal bus by reference
 * and zeroed by the prompt UI right after submission, so deferring the read
 * (even by `timer(0)`) makes verification read a zeroed secret and every unlock
 * fails. The L-201 unlock backoff is enforced at the prompt UI (submit disabled
 * with a countdown) rather than here — see `computeUnlockBackoffMs` in
 * `../unlock-backoff` and the `selectUnlockBackoffMs` selector.
 *
 * @param params - Configuration parameters for the side effect
 * @param params.verifyAndPropagateAuthSecret - Pre-configured function that handles
 *   the complete authentication verification and propagation flow
 * @returns Side effect function that can be used in the authentication prompt system
 */
export const makeAuthenticationPromptVerifying =
  ({
    verifyAndPropagateAuthSecret,
  }: MakeAuthenticationPromptVerificationParams): SideEffect =>
  (_, { authenticationPrompt: { selectState$ } }, { actions }) =>
    firstStateOfStatus(selectState$, 'VerifyingPassword').pipe(
      switchMap(() =>
        verifyAndPropagateAuthSecret({
          selectAuthenticationPromptState$: selectState$,
          actionCreator: actions.authenticationPrompt.verifiedPassword,
        }),
      ),
    );
