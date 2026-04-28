import type { PersistState } from 'redux-persist';

export const reduxPersistProperty = '_persist';

export const isReduxPersistState = <T>(
  key: number | string | symbol,
  _state: PersistState | T,
): _state is PersistState => {
  return key === reduxPersistProperty;
};
