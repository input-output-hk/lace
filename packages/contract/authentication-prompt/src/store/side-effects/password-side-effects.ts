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
 * The side effect uses a pre-configured authentication handler
 *
 * @param params - Configuration parameters for the side effect
 * @param params.verifyAndPropagateAuthSecret - Pre-configured function that handles
 *   the complete authentication verification and propagation flow
 * @returns Side effect function that can be used in the authentication prompt system
 *
 * @example
 * ```typescript
 * // Create the pre-configured auth handler
 * const verifyAndPropagateAuthSecret = createVerifyAndPropagateAuthSecret({
 *   accessInternalAuthSecret,
 *   propagateAuthSecretExternally,
 *   verifyAuthSecret,
 * });
 *
 * // Create the side effect
 * const passwordSideEffect = makeAuthenticationPromptVerifying({
 *   verifyAndPropagateAuthSecret,
 * });
 * ```
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
