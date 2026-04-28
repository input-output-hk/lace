import { accessAuthSecret, propagateAuthSecret } from './auth-secret-accessor';
import { authenticate } from './authenticate';

import type { AuthenticationPromptSideEffectDependencies } from './types';
import type { LaceInit } from '@lace-contract/module';

export const initializeAuthenticationPromptSideEffectsDependencies: LaceInit<
  AuthenticationPromptSideEffectDependencies
> = () => ({
  accessAuthSecret,
  authenticate,
  propagateAuthSecret,
});
