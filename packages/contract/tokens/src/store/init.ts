import { createMigrate } from 'redux-persist';

import { initializeSideEffects } from './side-effects';
import { reducers } from './slice';

import type { TokenFolderState } from './slice/tokenFolderSlice';
import type {
  LaceInit,
  LaceModuleStoreInit,
  PersistedState,
} from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  reducers,
  persistConfig: {
    rawTokens: { version: 1 },
    tokensMetadata: { version: 2 },
    tokenFolders: {
      version: 2,
      migrate: createMigrate({
        2: state => {
          const typedState = state as PersistedState<TokenFolderState>;
          if (!typedState.tokenIdsByFolderId) {
            typedState.tokenIdsByFolderId = {};
          }
          return typedState;
        },
      }),
    },
  },
  sideEffects: initializeSideEffects(),
});

export default store;
export type * from './slice';
