import type { PersistedState } from 'redux-persist';

export const clearDappListOnSchemaChange = (state: PersistedState) => {
  const s = state as PersistedState & Record<string, unknown>;
  s.selectedDapp = null;
  s.categories = [];
  s.dappList = [];
  return s;
};
