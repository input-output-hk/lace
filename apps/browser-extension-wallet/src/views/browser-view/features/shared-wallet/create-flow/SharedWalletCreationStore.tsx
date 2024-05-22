import { walletRoutePaths } from '@routes';
import { useWalletStore } from '@stores';
import React, { Dispatch, ReactElement, ReactNode, createContext, useContext, useMemo, useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import { SharedWalletCreationStep } from './types';

type BaseState = {
  step: SharedWalletCreationStep;
};

export type SupportingData = {
  activeWalletName: string;
  coSignersKeys: string[];
  walletName: string;
};

// This type util forces to describe complete state - all props from the BaseState and SupportingData has to be specified, otherwise we have a TS error
type MakeState<S extends BaseState & SupportingData> = BaseState & SupportingData & S;

type StateSetup = MakeState<{
  activeWalletName: string;
  coSignersKeys: undefined;
  step: SharedWalletCreationStep.Setup;
  walletName: string;
}>;

type StateCoSigners = MakeState<{
  activeWalletName: string;
  coSignersKeys: string[];
  step: SharedWalletCreationStep.CoSigners;
  walletName: string;
}>;

type State = StateSetup | StateCoSigners;

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
  coSignersKeys: undefined,
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
    switch (prevState.step) {
      case SharedWalletCreationStep.Setup: {
        if (action.type === 'walletNameChanged') {
          return {
            ...prevState,
            walletName: action.walletName
          };
        }
        if (action.type === 'back') {
          // TODO: Side effects should be handled outside the reducer
          history.push(walletRoutePaths.sharedWallet.root);
          return prevState;
        }
        if (action.type === 'next') {
          return {
            ...prevState,
            step: SharedWalletCreationStep.CoSigners
          };
        }
        return prevState;
      }

      case SharedWalletCreationStep.CoSigners: {
        if (action.type === 'back') {
          // TS error that the `coSignersKeys: undefined` is missing. Adding `coSignersKeys: []` also throws an error as undefined is expected instead of an []
          return {
            ...prevState,
            step: SharedWalletCreationStep.Setup
          };
        }
        if (action.type === 'next') {
          return {
            ...prevState,
            // TS error that State does not expect Quorum as a step
            step: SharedWalletCreationStep.Quorum
          };
        }
        return prevState;
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
