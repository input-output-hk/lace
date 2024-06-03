import { useWalletManager } from '@hooks';
import { CoSigner, QuorumOptionValue, QuorumRadioOption } from '@lace/core';
import { walletRoutePaths } from '@routes';
import { useWalletStore } from '@stores';
import React, {
  createContext,
  Dispatch,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer
} from 'react';
import { useHistory } from 'react-router-dom';
import { firstValueFrom } from 'rxjs';
import { v1 as uuid } from 'uuid';
import { SharedWalletCreationStep } from './types';

type StateMainPart = {
  step: SharedWalletCreationStep;
};

type StateVariableDataPart = {
  coSigners?: CoSigner[];
  quorumRules?: QuorumOptionValue;
  walletName?: string;
};

type StateConstantDataPart = {
  activeWalletName: string;
};

type MakeState<S extends StateMainPart & StateVariableDataPart> = S &
  StateMainPart &
  StateVariableDataPart &
  StateConstantDataPart;

export type StateSetup = MakeState<{
  coSigners: undefined;
  quorumRules: undefined;
  step: SharedWalletCreationStep.Setup;
  walletName: string | undefined;
}>;

export type StateCoSigners = MakeState<{
  coSigners: CoSigner[];
  quorumRules: undefined;
  step: SharedWalletCreationStep.CoSigners;
  walletName: string;
}>;

export type StateQuorum = MakeState<{
  coSigners: CoSigner[];
  quorumRules: QuorumOptionValue;
  step: SharedWalletCreationStep.Quorum;
  walletName: string;
}>;

type State = StateSetup | StateCoSigners | StateQuorum;

export enum SharedWalletActionType {
  NEXT = 'NEXT',
  BACK = 'BACK',
  CHANGE_WALLET_NAME = 'CHANGE_WALLET_NAME',
  COSIGNERS_CHANGED = 'COSIGNERS_CHANGED',
  QUORUM_RULES_CHANGED = 'QUORUM_RULES_CHANGED'
}

type Action =
  | { type: SharedWalletActionType.NEXT }
  | { type: SharedWalletActionType.BACK }
  | { type: SharedWalletActionType.CHANGE_WALLET_NAME; walletName: string }
  | { type: SharedWalletActionType.COSIGNERS_CHANGED; cosigners: { index: number; data: CoSigner } }
  | { type: SharedWalletActionType.QUORUM_RULES_CHANGED; quorumRules: QuorumOptionValue };

type Handler<S extends State> = (prevState: S, action: Action) => State;

type StateMachine = {
  [SharedWalletCreationStep.Setup]: Handler<StateSetup>;
  [SharedWalletCreationStep.CoSigners]: Handler<StateCoSigners>;
  [SharedWalletCreationStep.Quorum]: Handler<StateQuorum>;
};

type ContextValue = {
  state: State;
  dispatch: Dispatch<Action>;
};

// eslint-disable-next-line unicorn/no-null
const sharedWalletCreationContext = createContext<ContextValue | null>(null);

export const useSharedWalletCreationStore = (): ContextValue => {
  const value = useContext(sharedWalletCreationContext);
  if (value === null) throw new Error('SharedWalletCreationContext not defined');
  return value;
};

const makeInitialState = (activeWalletName: string): State => ({
  activeWalletName,
  coSigners: undefined,
  quorumRules: undefined,
  step: SharedWalletCreationStep.Setup,
  walletName: undefined
});

const makeStateMachine = ({ navigateHome }: { navigateHome: () => void }): StateMachine => ({
  [SharedWalletCreationStep.Setup]: (prevState, action) => {
    if (action.type === SharedWalletActionType.CHANGE_WALLET_NAME) {
      return {
        ...prevState,
        walletName: action.walletName
      };
    }
    if (action.type === SharedWalletActionType.BACK) {
      navigateHome();
      return prevState;
    }
    if (action.type === SharedWalletActionType.NEXT) {
      if (!prevState.walletName) return prevState;
      return {
        ...prevState,
        coSigners: [
          { address: '', isValid: false, id: uuid() },
          { address: '', isValid: false, id: uuid() }
        ],
        coSignersErrors: [],
        step: SharedWalletCreationStep.CoSigners,
        walletName: prevState.walletName
      };
    }
    return prevState;
  },
  [SharedWalletCreationStep.CoSigners]: (prevState, action) => {
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
        quorumRules: {
          option: QuorumRadioOption.AllAddresses
        },
        step: SharedWalletCreationStep.Quorum
      };
    }
    if (action.type === SharedWalletActionType.COSIGNERS_CHANGED) {
      const { index, data } = action.cosigners;
      prevState.coSigners[index] = data;
      return {
        ...prevState,
        coSigners: [...prevState.coSigners]
      };
    }
    return prevState;
  },
  [SharedWalletCreationStep.Quorum]: (prevState, action) => {
    if (action.type === SharedWalletActionType.BACK) {
      return {
        ...prevState,
        quorumRules: undefined,
        step: SharedWalletCreationStep.CoSigners
      };
    }
    if (action.type === SharedWalletActionType.NEXT) {
      return {
        ...prevState,
        coSigners: undefined,
        quorumRules: undefined,
        step: SharedWalletCreationStep.Setup
      };
    }
    if (action.type === SharedWalletActionType.QUORUM_RULES_CHANGED) {
      return {
        ...prevState,
        quorumRules: action.quorumRules
      };
    }
    return prevState;
  }
});

type SharedWalletCreationStoreProps = {
  children: (value: ContextValue) => ReactNode;
};

export const SharedWalletCreationStore = ({ children }: SharedWalletCreationStoreProps): ReactElement => {
  const history = useHistory();
  const { walletRepository } = useWalletManager();
  const { walletInfo } = useWalletStore();

  const initialState = makeInitialState(walletInfo?.name || '');
  const [state, dispatch] = useReducer((prevState: State, action: Action): State => {
    const stateMachine = makeStateMachine({
      navigateHome: () => {
        history.push(walletRoutePaths.sharedWallet.root);
      }
    });
    const handler = stateMachine[prevState.step] as Handler<State>;
    return handler(prevState, action);
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
