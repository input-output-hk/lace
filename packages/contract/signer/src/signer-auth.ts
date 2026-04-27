import type { SignerAuth } from './types';
import type {
  AccessAuthSecret,
  Authenticate,
} from '@lace-contract/authentication-prompt';
import type { TranslationKey } from '@lace-contract/i18n';

type AuthPromptConfig = {
  cancellable?: boolean;
  confirmButtonLabel: TranslationKey;
  message: TranslationKey;
};

type SignerAuthDeps = {
  accessAuthSecret: AccessAuthSecret;
  authenticate: Authenticate;
};

/** Creates a SignerAuth from auth secret dependencies with bound prompt configuration. */
export const signerAuthFromPrompt = (
  deps: SignerAuthDeps,
  config: AuthPromptConfig,
): SignerAuth => ({
  authenticate: () => deps.authenticate(config),
  accessAuthSecret: deps.accessAuthSecret,
});
