import { initializeSideEffects } from './side-effects/side-effects';
import { initializeAuthenticationPromptSideEffectsDependencies } from './side-effects-dependencies';
import { authenticationPromptReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  reducers: authenticationPromptReducers,
  persistConfig: {
    authenticationPrompt: {
      version: 1,
      whitelist: ['deviceAuthReady'],
    },
  },
  sideEffects: await initializeSideEffects(props, dependencies),
  sideEffectDependencies:
    await initializeAuthenticationPromptSideEffectsDependencies(
      props,
      dependencies,
    ),
});

export default store;

export {
  authenticationPromptActions,
  authenticationPromptSelectors,
} from './slice';
