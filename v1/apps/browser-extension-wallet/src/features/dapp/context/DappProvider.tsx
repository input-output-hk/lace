/* eslint-disable react/no-multi-comp */
import React, { useState, useEffect } from 'react';
import { DappContext } from './context';
import { AuthorizedDappService } from '@src/types';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { consumeRemoteApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { runtime } from 'webextension-polyfill';
import { Wallet } from '@lace/cardano';
import isEqual from 'lodash/isEqual';
import { logger } from '@lace/common';

interface DappProviderProps {
  children: React.ReactNode;
  initialState?: Wallet.DappInfo[];
}

export const DappProvider = ({ children, initialState }: DappProviderProps): React.ReactElement => {
  const [dappList, setDappList] = useState<Wallet.DappInfo[]>(initialState);
  useEffect(() => {
    const authorizedDappService = consumeRemoteApi<Partial<AuthorizedDappService>>(
      {
        baseChannel: DAPP_CHANNELS.authorizedDapps,
        properties: {
          authorizedDappsList: RemoteApiPropertyType.HotObservable
        }
      },
      { logger, runtime }
    );

    authorizedDappService?.authorizedDappsList.subscribe((dapps) => {
      if (!isEqual(dappList, dapps)) {
        setDappList(dapps);
      }
    });
  }, [dappList]);

  return <DappContext.Provider value={dappList}>{children}</DappContext.Provider>;
};

type WithDappContext = <TProps>(
  element: React.JSXElementConstructor<TProps>,
  initialState?: Wallet.DappInfo[]
) => (props?: TProps) => React.ReactElement;

export const withDappContext: WithDappContext = (Component, initialState) => (props) =>
  (
    <DappProvider initialState={initialState}>
      <Component {...props} />
    </DappProvider>
  );
