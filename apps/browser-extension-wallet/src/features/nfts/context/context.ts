import { createContext, useContext } from 'react';
import { NftFoldersSchema, useDbState, useDbStateValue } from '../../../lib/storage';

// eslint-disable-next-line unicorn/no-null
export const NftsFoldersContext = createContext<useDbStateValue<NftFoldersSchema> | null>(null);

export const useNftsFoldersContext = (): ReturnType<typeof useDbState> => {
  const nftsFlders = useContext(NftsFoldersContext);
  if (nftsFlders === null) throw new Error('NftsFoldersContext is not defined.');
  return nftsFlders;
};
