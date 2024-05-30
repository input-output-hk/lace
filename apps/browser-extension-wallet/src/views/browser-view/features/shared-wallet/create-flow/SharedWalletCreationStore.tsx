import { walletRoutePaths } from '@routes';
import { useWalletStore } from '@stores';
import React, {
  Dispatch,
  ReactElement,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer
} from 'react';
import { useHistory } from 'react-router-dom';
import { SharedWalletCreationStep } from './types';
import { CoSigner } from '@lace/core';
import { firstValueFrom } from 'rxjs';
import { useWalletManager } from '@hooks';

type BaseState = {
  step: SharedWalletCreationStep;
  activeWalletName: string;
  coSigners: CoSigner[];
  walletName: string | undefined;
};

// This type util forces to describe complete state - all props from the BaseState and SupportingData has to be specified, otherwise we have a TS error
type MakeState<S extends BaseState> = S;

export type StateSetup = MakeState<{
  activeWalletName: string;
  coSigners: CoSigner[];
  step: SharedWalletCreationStep.Setup;
  walletName: string | undefined;
}>;

export type StateCoSigners = MakeState<{
  activeWalletName: string;
  coSigners: CoSigner[];
  step: SharedWalletCreationStep.CoSigners;
  walletName: string | undefined;
}>;

type State = StateSetup | StateCoSigners;

export enum SharedWalletActionType {
  NEXT,
  BACK,
  CHANGE_WALLET_NAME,
  IS_WALLET_PREFILLED,
  COSIGNERS_CHANGED
}

type Action =
  | { type: SharedWalletActionType.NEXT }
  | { type: SharedWalletActionType.BACK }
  | { type: SharedWalletActionType.CHANGE_WALLET_NAME; walletName: string }
  | { type: SharedWalletActionType.COSIGNERS_CHANGED; cosigners: CoSigner[] };

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
  coSigners: undefined,
  step: SharedWalletCreationStep.Setup,
  walletName: undefined
});

type SharedWalletCreationStoreProps = {
  children: (value: ContextValue) => ReactNode;
};

export const SharedWalletCreationStore = ({ children }: SharedWalletCreationStoreProps): ReactElement => {
  const history = useHistory();
  const { walletRepository } = useWalletManager();
  const {
    walletInfo: { name: activeWalletName }
  } = useWalletStore();

  const initialState = makeInitialState(activeWalletName);
  const [state, dispatch] = useReducer((prevState: State, action: Action): State => {
    if (prevState.step === SharedWalletCreationStep.Setup) {
      if (action.type === SharedWalletActionType.CHANGE_WALLET_NAME) {
        return {
          ...prevState,
          walletName: action.walletName
        };
      }
      if (action.type === SharedWalletActionType.BACK) {
        history.push(walletRoutePaths.sharedWallet.root);
        return prevState;
      }

      if (action.type === SharedWalletActionType.NEXT) {
        return {
          ...prevState,
          step: SharedWalletCreationStep.CoSigners
        };
      }
    }

    if (prevState.step === SharedWalletCreationStep.CoSigners) {
      if (action.type === SharedWalletActionType.BACK) {
        return {
          ...prevState,
          coSigners: undefined,
          step: SharedWalletCreationStep.Setup
        };
      }
      if (action.type === SharedWalletActionType.NEXT) {
        return {
          ...prevState,
          step: SharedWalletCreationStep.Setup
        };
      }
      if (action.type === SharedWalletActionType.COSIGNERS_CHANGED) {
        return {
          ...prevState,
          coSigners: action.cosigners
        };
      }
    }
    return prevState;
  }, initialState);

  useEffect(() => {
    (async () => {
      if (state.walletName !== undefined) return;
      const wallets = await firstValueFrom(walletRepository.wallets$);
      const walletName = `Wallet ${wallets.length + 1}`;
      dispatch({ type: SharedWalletActionType.CHANGE_WALLET_NAME, walletName });
    })();
  }, [state.walletName, walletRepository]);

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
