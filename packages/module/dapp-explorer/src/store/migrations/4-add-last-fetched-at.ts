import type { PersistedState } from 'redux-persist';

export const addLastFetchedAt = (state: PersistedState) => ({
  ...(state as PersistedState & Record<string, unknown>),
  lastFetchedAt: null,
});
