import { testSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { authenticationPromptActions as actions } from '../../src';
import { makeAuthenticationPromptVerifying } from '../../src/store/side-effects/password-side-effects';

import type {
  AuthenticationPromptSliceState,
  AuthenticationPromptSliceStateVerifying,
  Config,
} from '../../src';

const config: Config = {
  purpose: 'wallet-unlock',
  confirmButtonLabel: 'authentication-prompt.confirm-button-label',
  message: 'authentication-prompt.message.wallet-lock',
};

const verifyingPasswordState: AuthenticationPromptSliceStateVerifying = {
  config,
  status: 'VerifyingPassword',
};

const verifiedOk = actions.authenticationPrompt.verifiedPassword({
  success: true,
});

describe('makeAuthenticationPromptVerifying', () => {
  it('verifies synchronously on entering VerifyingPassword', () => {
    const verify = vi.fn(() => of(verifiedOk));

    testSideEffect(
      makeAuthenticationPromptVerifying({
        verifyAndPropagateAuthSecret: verify,
      }),
      ({ cold, flush }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          // Verification runs immediately (no timer): the auth secret is read
          // before the prompt UI zeroes it. The L-201 backoff is enforced at
          // the UI, not by delaying this side-effect.
          expect(verify).toHaveBeenCalledTimes(1);
          expect(emissions).toEqual([verifiedOk]);
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold<AuthenticationPromptSliceState>('a', {
              a: verifyingPasswordState,
            }),
          },
        },
      }),
    );
  });
});
