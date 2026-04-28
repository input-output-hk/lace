import { createObservableHook } from '@lace-lib/util-store';
import { lastValueFrom } from 'rxjs';

import type { AuthSecretVerifier } from '@lace-contract/authentication-prompt';
import type { MakePropertiesObservable } from '@lace-sdk/util';

export const verifyAuthSecretHook =
  createObservableHook<
    MakePropertiesObservable<AuthSecretVerifier>['verifyAuthSecret']
  >();

const loadAuthSecretVerifier = (): AuthSecretVerifier => ({
  verifyAuthSecret: async ({ authSecret }) =>
    lastValueFrom(verifyAuthSecretHook.trigger({ authSecret })),
});

export default loadAuthSecretVerifier;
