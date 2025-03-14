import React, { createContext, FC, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { signingCoordinator } from '@lib/wallet-api-ui';
import { TransactionWitnessRequest } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { take } from 'rxjs';
import { dAppRoutePaths } from '@routes';
import { readyToSign } from '@src/features/dapp/components/confirm-transaction/utils';

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
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== dAppRoutePaths.dappSignTx) {
      return () => void 0;
    }

    const subscription = signingCoordinator.transactionWitnessRequest$.pipe(take(1)).subscribe(async (r) => {
      setRequest(r);
    });

    const api = readyToSign();

    return () => {
      subscription.unsubscribe();
      api.shutdown();
    };
  }, [location.pathname, setRequest]);

  return <TxWitnessRequestContext.Provider value={request}>{children}</TxWitnessRequestContext.Provider>;
};
