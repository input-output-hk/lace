import { ByteArray } from '@lace-sdk/util';
import { BehaviorSubject, filter, finalize, map, switchMap, take } from 'rxjs';

import { AuthSecret } from '../value-objects';

import type { AccessAuthSecret } from './types';
import type { WithLogger } from '@lace-sdk/util';

/**
 * Internal auth secret bus used by the verification flow.
 * When the user enters their password/biometric, the secret is sent here
 * so the verification handler can access it for verification.
 * On successful verification, the secret is also pushed to the global bus.
 */
const internalAuthSecretBus$ = new BehaviorSubject<AuthSecret | null>(null);

export const sendAuthSecretApi = {
  sendAuthSecretInternally: async (authSecret: AuthSecret) => {
    internalAuthSecretBus$.next(authSecret);
  },
};

export type SendAuthSecretApi = typeof sendAuthSecretApi;

export type ExposeInternalAuthSecretApi = (api: SendAuthSecretApi) => void;
export type ConsumeInternalAuthSecretApi = (
  dependencies: WithLogger,
) => SendAuthSecretApi;

export type InternalAuthSecretApiExtension = {
  exposeInternalAuthSecretApi?: ExposeInternalAuthSecretApi;
  consumeInternalAuthSecretApi: ConsumeInternalAuthSecretApi;
};

export const initializeInternalAuthSecretAccessor = (
  apiExtension?: InternalAuthSecretApiExtension,
) => {
  if (apiExtension?.exposeInternalAuthSecretApi) {
    apiExtension.exposeInternalAuthSecretApi(sendAuthSecretApi);
  }

  const accessSecretFromAuthFlow: AccessAuthSecret = callback =>
    internalAuthSecretBus$.pipe(
      take(1),
      filter((secret): secret is AuthSecret => {
        if (secret) return true;
        throw new Error('Auth Secret did not arrive from the Auth Prompt');
      }),
      map(secret => {
        const clone = AuthSecret(ByteArray.clone(secret));
        secret.fill(0);
        return clone;
      }),
      switchMap(secret =>
        callback(secret).pipe(
          finalize(() => {
            secret.fill(0);
            if (internalAuthSecretBus$.value === secret) {
              internalAuthSecretBus$.next(null);
            }
          }),
        ),
      ),
    );

  return {
    accessSecretFromAuthFlow,
  };
};
