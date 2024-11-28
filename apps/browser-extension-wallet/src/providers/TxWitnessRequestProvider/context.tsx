import React, { createContext, FC, useContext, useEffect, useState } from 'react';
import { signingCoordinator } from '@lib/wallet-api-ui';
import { exposeApi, RemoteApiPropertyType, TransactionWitnessRequest } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { of, take } from 'rxjs';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { UserPromptService } from '@lib/scripts/background/services';

export type TxWitnessRequestContextType = TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

// eslint-disable-next-line unicorn/no-null
const TxWitnessRequestContext = createContext<TxWitnessRequestContextType | null>(null);

export const useTxWitnessRequest = (): TxWitnessRequestContextType => {
  const context = useContext(TxWitnessRequestContext);
  if (context === null) throw new Error('TxWitnessRequestContext not defined');
  return context;
};

export const TxWitnessRequestProvider: FC = ({ children }) => {
  const [request, setRequest] = useState<TxWitnessRequestContextType | undefined>();

  useEffect(() => {
    const subscription = signingCoordinator.transactionWitnessRequest$.pipe(take(1)).subscribe(async (r) => {
      setRequest(r);
    });

    const api = exposeApi<Pick<UserPromptService, 'readyToSignTx'>>(
      {
        api$: of({
          async readyToSignTx(): Promise<boolean> {
            return Promise.resolve(true);
          }
        }),
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { readyToSignTx: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger: console, runtime }
    );

    return () => {
      subscription.unsubscribe();
      api.shutdown();
    };
  }, [setRequest]);

  return <TxWitnessRequestContext.Provider value={request}>{children}</TxWitnessRequestContext.Provider>;
};
