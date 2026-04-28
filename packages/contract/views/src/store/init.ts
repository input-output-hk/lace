import { DEFAULT_LANGUAGE } from '@lace-contract/i18n';
import { createMigrate } from 'redux-persist';

import { trackColorSchemeChange } from './side-effects';
import { viewsReducers } from './slice';

import type { ViewsSliceState } from './slice';
import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';
import type { MigrationManifest, PersistedState } from 'redux-persist';

type PersistedViewsState = Partial<ViewsSliceState> & PersistedState;

// Migrations for persisted views state
const migrations: MigrationManifest = {
  // Version 3: Migrate Japanese language code from 'jp' to 'ja' (ISO 639-1 standard)
  3: (state: PersistedState): PersistedState => {
    const viewsState = state as PersistedViewsState;
    // Migrate 'jp' language code to 'ja' (ISO 639-1 standard)
    if (viewsState.language === ('jp' as string)) {
      return {
        ...viewsState,
        language: 'ja',
      } as unknown as PersistedState;
    }
    // If language is undefined, set to default
    if (viewsState.language === undefined) {
      return {
        ...viewsState,
        language: DEFAULT_LANGUAGE,
      } as unknown as PersistedState;
    }
    return state;
  },
};

const viewsStore: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: viewsReducers,
  sideEffects: [trackColorSchemeChange],
  persistConfig: {
    views: {
      whitelist: ['colorScheme', 'language', 'hasExplicitLanguagePreference'],
      version: 3,
      migrate: createMigrate(migrations, { debug: false }),
    },
  },
});

export default viewsStore;
