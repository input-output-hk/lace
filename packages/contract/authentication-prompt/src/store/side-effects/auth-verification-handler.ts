import { toEmpty } from '@cardano-sdk/util-rxjs';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { filter, take, merge, tap, switchMap, of, EMPTY } from 'rxjs';

import { propagateAuthSecret } from '../auth-secret-accessor';

import type {
  AuthSecretVerifier,
  AuthenticationPromptSliceState,
  AccessAuthSecret,
} from '../types';
import type { Observable } from 'rxjs';

type VerifyAuthSecret = (
  ...params: Parameters<AuthSecretVerifier['verifyAuthSecret']>
) => Observable<Awaited<ReturnType<AuthSecretVerifier['verifyAuthSecret']>>>;

type MakeVerifyAndPropagateAuthSecretParams = {
  accessSecretFromAuthFlow: AccessAuthSecret;
  verifyAuthSecret: VerifyAuthSecret;
};

type VerifyAndPropagateAuthSecretParams<T = unknown> = {
  selectAuthenticationPromptState$: Observable<AuthenticationPromptSliceState>;
  actionCreator: (params: { success: boolean }) => T;
};

type VerifyAndPropagateAuthSecret = <T>(params: {
  selectAuthenticationPromptState$: Observable<AuthenticationPromptSliceState>;
  actionCreator: (params: { success: boolean }) => T;
}) => Observable<T>;

export const createVerifyAndPropagateAuthSecret =
  ({
    accessSecretFromAuthFlow,
    verifyAuthSecret,
  }: MakeVerifyAndPropagateAuthSecretParams): VerifyAndPropagateAuthSecret =>
  <T>({
    selectAuthenticationPromptState$,
    actionCreator,
  }: VerifyAndPropagateAuthSecretParams<T>) =>
    accessSecretFromAuthFlow(authSecret =>
      verifyAuthSecret({ authSecret }).pipe(
        switchMap(success =>
          merge(
            success
              ? firstStateOfStatus(
                  selectAuthenticationPromptState$,
                  'Completing',
                ).pipe(
                  filter(state => state.success),
                  take(1),
                  tap(() => {
                    propagateAuthSecret(authSecret);
                  }),
                  toEmpty,
                )
              : EMPTY,
            of(actionCreator({ success })),
          ),
        ),
      ),
    );

export type { VerifyAndPropagateAuthSecret };
