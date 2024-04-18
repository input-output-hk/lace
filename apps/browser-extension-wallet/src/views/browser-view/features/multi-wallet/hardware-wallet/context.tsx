import { Wallet } from '@lace/cardano';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Data, Providers } from './types';
import { Observable } from 'rxjs';

interface Props {
  children: React.ReactNode;
  providers: Providers;
}

interface State {
  data: Data;
  connect: (model: Wallet.HardwareWallets) => Promise<void>;
  setName: (name: string) => void;
  setAccount: (account: number) => void;
  resetConnection: () => void;
  createWallet: () => Promise<void>;
  disconnectHardwareWallet$: Observable<USBConnectionEvent>;
}

// eslint-disable-next-line unicorn/no-null
const HardwareWalletContext = createContext<State>(null);

export const useHardwareWallet = (): State => {
  const state = useContext(HardwareWalletContext);
  if (state === null) throw new Error('HardwareWalletContext not defined');
  return state;
};

export const HardwareWalletProvider = ({ children, providers }: Props): React.ReactElement => {
  const [state, setState] = useState<Data>({
    model: undefined,
    connection: undefined,
    account: 0,
    name: ''
  });

  const connect = useCallback(
    async (model: Wallet.HardwareWallets) => {
      try {
        const connection = await providers.connectHardwareWallet(model);
        setState((prevState) => ({ ...prevState, model, connection }));
        providers.shouldShowDialog$.next(true);
      } catch (error) {
        if (error.innerError?.innerError?.message !== 'The device is already open.') {
          throw error;
        }
      }
    },
    [setState, providers]
  );

  const resetConnection = useCallback(() => {
    setState((prevState) => ({ ...prevState, connection: undefined, model: undefined }));
  }, [setState]);

  const setName = useCallback(
    (name: string) => {
      setState((prevState) => ({ ...prevState, name }));
    },
    [setState]
  );

  const setAccount = useCallback(
    (account: number) => {
      setState((prevState) => ({ ...prevState, account }));
    },
    [setState]
  );

  const createWallet = useCallback(() => providers.createWallet(state), [providers, state]);

  const value = useMemo<State>(
    () => ({
      data: state,
      connect,
      setName,
      setAccount,
      resetConnection,
      createWallet,
      disconnectHardwareWallet$: providers.disconnectHardwareWallet$
    }),
    [state, connect, setName, setAccount, resetConnection, createWallet, providers.disconnectHardwareWallet$]
  );

  return <HardwareWalletContext.Provider value={value}>{children}</HardwareWalletContext.Provider>;
};
