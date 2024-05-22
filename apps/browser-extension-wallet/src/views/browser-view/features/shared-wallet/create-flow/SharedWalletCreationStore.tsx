import { walletRoutePaths } from '@routes';
import { useWalletStore } from '@stores';
import React, { Dispatch, ReactElement, ReactNode, createContext, useContext, useMemo, useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import { SharedWalletCreationStep } from './types';

type State = {
  activeWalletName: string;
  coSignersKeys: string[];
  step: SharedWalletCreationStep;
  walletName: string;
};

type Action = { type: 'next' } | { type: 'back' } | { type: 'walletNameChanged'; walletName: string };

type ContextValue = {
  state: State;
  dispatch: Dispatch<Action>;
};

// eslint-disable-next-line unicorn/no-null
const sharedWalletCreationContext = createContext<ContextValue>(null);

export const useSharedWalletCreationStore = (): ContextValue => {
  const value = useContext(sharedWalletCreationContext);
  if (value === null) throw new Error('SharedWalletCreationContext not defined');
  return value;
};

const makeInitialState = (activeWalletName: string): State => ({
  activeWalletName,
  coSignersKeys: ['', ''],
  step: SharedWalletCreationStep.Setup,
  walletName: ''
});

type SharedWalletCreationStoreProps = {
  children: (value: ContextValue) => ReactNode;
};

export const SharedWalletCreationStore = ({ children }: SharedWalletCreationStoreProps): ReactElement => {
  const history = useHistory();
  const {
    walletInfo: { name: activeWalletName }
  } = useWalletStore();

  const initialState = makeInitialState(activeWalletName);
  const [state, dispatch] = useReducer((prevState: State, action: Action): State => {
    if (prevState.step === SharedWalletCreationStep.Setup) {
      if (action.type === 'walletNameChanged') {
        return {
          ...prevState,
          walletName: action.walletName
        };
      }
      if (action.type === 'back') {
        history.push(walletRoutePaths.sharedWallet.root);
        return prevState;
      }
      if (action.type === 'next') {
        return {
          ...prevState,
          step: SharedWalletCreationStep.CoSigners
        };
      }
    }

    if (prevState.step === SharedWalletCreationStep.CoSigners) {
      if (action.type === 'back') {
        return {
          ...prevState,
          step: SharedWalletCreationStep.Setup
        };
      }
      if (action.type === 'next') {
        return {
          ...prevState,
          step: SharedWalletCreationStep.Quorum
        };
      }
    }

    return prevState;
  }, initialState);

  const contextValue: ContextValue = useMemo(
    () => ({
      state,
      dispatch
    }),
    [state]
  );

  return (
    <sharedWalletCreationContext.Provider value={contextValue}>
      {children(contextValue)}
    </sharedWalletCreationContext.Provider>
  );
};
