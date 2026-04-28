import { inferStoreContext } from '@lace-contract/module';

import {
  authenticationPromptActions,
  authenticationPromptSelectors,
} from './slice';

export {
  authenticationPromptActions,
  authenticationPromptSelectors,
  authenticationPromptReducers,
} from './slice';

export { sendAuthSecretApi } from './auth-secret-accessor-internal';

export type {
  SendAuthSecretApi,
  InternalAuthSecretApiExtension,
  ExposeInternalAuthSecretApi,
  ConsumeInternalAuthSecretApi,
} from './auth-secret-accessor-internal';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: authenticationPromptActions,
    selectors: authenticationPromptSelectors,
  },
});

export type * from './types';
export type { AuthenticationPromptStoreState } from './slice';
