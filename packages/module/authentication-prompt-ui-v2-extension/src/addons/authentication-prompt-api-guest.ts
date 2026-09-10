import { sendAuthSecretApi } from '@lace-contract/authentication-prompt';

import type { AvailableAddons } from '..';
import type { InternalAuthSecretApiExtension } from '@lace-contract/authentication-prompt';
import type { ContextualLaceInit } from '@lace-contract/module';

/**
 * In-process variant of ./authentication-prompt-api-extension for the
 * extension-shell guest (a plain web page, single JS context). Behaviorally
 * identical to that addon's non-web/mobile branch: the auth secret rides the
 * in-process bus, and there is no cross-context expose step. Deliberately
 * free of the top-level `webextension-polyfill` import, which throws at
 * import time outside a browser extension.
 */
const authenticationPromptApiGuest: ContextualLaceInit<
  InternalAuthSecretApiExtension,
  AvailableAddons
> = () => ({
  consumeInternalAuthSecretApi: () => ({
    sendAuthSecretInternally: sendAuthSecretApi.sendAuthSecretInternally,
  }),
});

export default authenticationPromptApiGuest;
