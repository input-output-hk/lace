import { QuorumOptionValue, QuorumRadioOption } from '@lace/core';
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
import { SharedWalletCreationStep } from './types';
import { firstValueFrom } from 'rxjs';
import { useWalletManager } from '@hooks';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { useHistory } from 'react-router';
import { walletRoutePaths } from '@routes';

type StateMainPart = {
  step: SharedWalletCreationStep;
};

type StateVariableDataPart = {
  coSignersKeys?: string[];
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
  coSignersKeys: undefined;
  quorumRules: undefined;
  step: SharedWalletCreationStep.Setup;
  walletName: string | undefined;
}>;

export type StateCoSigners = MakeState<{
  coSignersKeys: string[];
  quorumRules: undefined;
  step: SharedWalletCreationStep.CoSigners;
  walletName: string;
}>;

export type StateQuorum = MakeState<{
  coSignersKeys: string[];
  quorumRules: QuorumOptionValue;
  step: SharedWalletCreationStep.Quorum;
  walletName: string;
}>;

export type StateShareDetails = MakeState<{
  coSignersKeys: string[];
  step: SharedWalletCreationStep.ShareDetails;
  walletName: string;
}>;

type State = StateSetup | StateCoSigners | StateQuorum | StateShareDetails;

export enum SharedWalletActionType {
  NEXT,
  BACK,
  CHANGE_WALLET_NAME,
  QUORUM_RULES_CHANGED
}

type Action =
  | { type: SharedWalletActionType.NEXT }
  | { type: SharedWalletActionType.BACK }
  | { type: SharedWalletActionType.CHANGE_WALLET_NAME; walletName: string }
  | { type: SharedWalletActionType.QUORUM_RULES_CHANGED; quorumRules: QuorumOptionValue };

type Handler<S extends State> = (prevState: S, action: Action) => State;

type StateMachine = {
  [SharedWalletCreationStep.Setup]: Handler<StateSetup>;
  [SharedWalletCreationStep.CoSigners]: Handler<StateCoSigners>;
  [SharedWalletCreationStep.Quorum]: Handler<StateQuorum>;
  [SharedWalletCreationStep.ShareDetails]: Handler<StateShareDetails>;
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
  coSignersKeys: undefined,
  quorumRules: undefined,
  step: SharedWalletCreationStep.Setup,
  walletName: undefined
});

const makeStateMachine = ({
  navigateHome,
  navigateToStart
}: {
  navigateHome: () => void;
  navigateToStart: () => void;
}): StateMachine => ({
  [SharedWalletCreationStep.Setup]: (prevState, action) => {
    if (action.type === SharedWalletActionType.CHANGE_WALLET_NAME) {
      return {
        ...prevState,
        walletName: action.walletName
      };
    }
    if (action.type === SharedWalletActionType.BACK) {
      navigateToStart();
      return prevState;
    }
    if (action.type === SharedWalletActionType.NEXT) {
      return {
        ...prevState,
        coSignersKeys: ['', ''],
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
        coSignersKeys: undefined,
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
        step: SharedWalletCreationStep.ShareDetails
      };
    }
    if (action.type === SharedWalletActionType.QUORUM_RULES_CHANGED) {
      return {
        ...prevState,
        quorumRules: action.quorumRules
      };
    }
    return prevState;
  },
  [SharedWalletCreationStep.ShareDetails]: (prevState, action) => {
    if (action.type === SharedWalletActionType.NEXT) {
      navigateHome();
      return prevState;
    }

    return prevState;
  }
});

type SharedWalletCreationStoreProps = {
  children: (value: ContextValue) => ReactNode;
};

export const SharedWalletCreationStore = ({ children }: SharedWalletCreationStoreProps): ReactElement => {
  const { walletRepository } = useWalletManager();
  const history = useHistory();
  const { walletInfo } = useWalletStore();

  const { setBackgroundPage } = useBackgroundPage();

  const initialState = makeInitialState(walletInfo?.name || '');

  const [state, dispatch] = useReducer((prevState: State, action: Action): State => {
    const stateMachine = makeStateMachine({
      navigateHome: setBackgroundPage,
      navigateToStart: () => history.push(walletRoutePaths.sharedWallet.root)
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
