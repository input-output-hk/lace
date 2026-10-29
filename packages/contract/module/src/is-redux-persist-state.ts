import type { PersistState } from 'redux-persist';

/** The state key under which redux-persist keeps its own bookkeeping. */
export const reduxPersistProperty = '_persist';

/**
 * Tells whether a state entry is redux-persist's bookkeeping rather than slice
 * state, judged by its key. Useful when iterating persisted state in a
 * state reconciler.
 */
export const isReduxPersistState = <T>(
  key: number | string | symbol,
  _state: PersistState | T,
): _state is PersistState => {
  return key === reduxPersistProperty;
};
