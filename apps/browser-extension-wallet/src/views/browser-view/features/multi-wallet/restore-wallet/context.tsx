import React, { createContext, useContext, useState } from 'react';
import { Data, Providers } from './types';

interface Props {
  children: React.ReactNode;
  providers: Providers;
}

interface State {
  data: Data;
  setMnemonic: (mnemonic: string[]) => void;
  setLength: (length: number) => void;
  setName: (name: string) => void;
  setPassword: (password: string) => void;
  onChange: (state: { name: string; password: string }) => void;
}

// eslint-disable-next-line unicorn/no-null
const RestoreWalletContext = createContext<State>(null);

export const useRestoreWallet = (): State => {
  const state = useContext(RestoreWalletContext);
  if (state === null) throw new Error('RestoreWalletContext not defined');
  return state;
};

export const RestoreWalletProvider = ({ children, providers }: Props): React.ReactElement => {
  const [state, setState] = useState<Data>({
    mnemonic: [],
    length: 0,
    name: '',
    password: ''
  });

  const setMnemonic = (mnemonic: string[]) => {
    providers.confirmationDialog.shouldShowDialog$.next(Boolean(mnemonic));
    setState((prevState) => ({ ...prevState, mnemonic }));
  };

  const setLength = (length: number) => {
    setState((prevState) => ({ ...prevState, length, mnemonic: Array.from({ length }) }));
  };

  const setName = (name: string) => {
    setState((prevState) => ({ ...prevState, name }));
  };

  const setPassword = (password: string) => {
    setState((prevState) => ({ ...prevState, password }));
  };

  const onChange = (s: { name: string; password: string }) => {
    providers.confirmationDialog.shouldShowDialog$.next(Boolean(s.name || s.password));
  };

  return (
    <RestoreWalletContext.Provider
      value={{
        data: state,
        setMnemonic,
        setLength,
        setName,
        setPassword,
        onChange
      }}
    >
      {children}
    </RestoreWalletContext.Provider>
  );
};
