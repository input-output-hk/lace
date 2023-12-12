import React, { createContext, useContext, useState } from 'react';
import { Data, Providers } from './types';

interface Props {
  children: React.ReactNode;
  providers: Providers;
}

interface State {
  data: Data;
  setMnemonic: (mnemonic: string[]) => void;
  setName: (name: string) => void;
  setPassword: (password: string) => void;
  generatedMnemonic: () => void;
}

// eslint-disable-next-line unicorn/no-null
const CreateWalletContext = createContext<State>(null);

export const useCreateWallet = (): State => {
  const state = useContext(CreateWalletContext);
  if (state === null) throw new Error('CreateWalletContext not defined');
  return state;
};

export const CreateWalletProvider = ({ children, providers }: Props): React.ReactElement => {
  const [state, setState] = useState<Data>({
    mnemonic: providers.generateMnemonicWords(),
    name: '',
    password: ''
  });

  const setMnemonic = (mnemonic: string[]) => {
    setState((prevState) => ({ ...prevState, mnemonic }));
  };

  const setName = (name: string) => {
    setState((prevState) => ({ ...prevState, name }));
  };

  const setPassword = (password: string) => {
    setState((prevState) => ({ ...prevState, password }));
  };

  const generatedMnemonic = () => {
    setState((prevState) => ({ ...prevState, mnemonic: providers.generateMnemonicWords() }));
  };

  return (
    <CreateWalletContext.Provider
      value={{
        data: state,
        setMnemonic,
        setName,
        setPassword,
        generatedMnemonic
      }}
    >
      {children}
    </CreateWalletContext.Provider>
  );
};
