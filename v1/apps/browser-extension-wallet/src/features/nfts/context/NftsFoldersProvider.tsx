/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React, { useMemo } from 'react';
import { NftsFoldersContext } from './context';
import { nftFoldersQueries, NftFoldersSchema, nftFoldersSchema, useDbState } from '@src/lib/storage';
import { useWalletStore } from '@src/stores';

interface NftsFoldersProviderProps {
  children: React.ReactNode;
  initialState?: Array<NftFoldersSchema>;
}

export type NftFoldersRecordParams = Pick<NftFoldersSchema, 'assets' | 'name' | 'id'>;

export const NftsFoldersProvider = ({ children, initialState }: NftsFoldersProviderProps): React.ReactElement => {
  const { environmentName } = useWalletStore();
  const queries = useMemo(() => nftFoldersQueries(environmentName), [environmentName]);

  return (
    <NftsFoldersContext.Provider
      value={useDbState<NftFoldersSchema, NftFoldersRecordParams>(initialState, nftFoldersSchema, queries)}
    >
      {children}
    </NftsFoldersContext.Provider>
  );
};

type WithNftsFoldersContext = <TProps>(
  element: React.JSXElementConstructor<TProps>,
  initialState?: Array<NftFoldersSchema>
) => (props?: TProps) => React.ReactElement;

export const withNftsFoldersContext: WithNftsFoldersContext = (Component, initialState) => (props) =>
  (
    <NftsFoldersProvider initialState={initialState}>
      <Component {...props} />
    </NftsFoldersProvider>
  );
