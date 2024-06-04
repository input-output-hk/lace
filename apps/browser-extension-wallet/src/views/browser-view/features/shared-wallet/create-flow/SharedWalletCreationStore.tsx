import { useWalletManager } from '@hooks';
import { CoSigner, CoSignerError, maxCoSignerNameLength, QuorumOptionValue, QuorumRadioOption } from '@lace/core';
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
  coSigners: CoSigner[] | undefined;
  coSignersErrors: CoSignerError[] | undefined;
  quorumRules: QuorumOptionValue | undefined;
  walletName: string | undefined;
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
  coSignersErrors: undefined;
  quorumRules: undefined;
  step: SharedWalletCreationStep.Setup;
  walletName: string | undefined;
}>;

export type StateCoSigners = MakeState<{
  coSigners: CoSigner[];
  coSignersErrors: CoSignerError[];
  quorumRules: undefined;
  step: SharedWalletCreationStep.CoSigners;
  walletName: string;
}>;

export type StateQuorum = MakeState<{
  coSigners: CoSigner[];
  coSignersErrors: CoSignerError[];
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
  | { type: SharedWalletActionType.COSIGNERS_CHANGED; coSigner: CoSigner }
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
  coSignersErrors: undefined,
  quorumRules: undefined,
  step: SharedWalletCreationStep.Setup,
  walletName: undefined
});

const keysRegex = /(?<payment>addr_shared_vk[\da-z]*),(?<stake>stake_shared_vk[\da-z]*)?/;
const validateCoSigners = (coSigners: CoSigner[]): CoSignerError[] => {
  let coSignersErrors: CoSignerError[] = [];

  coSigners.forEach(({ id, keys, name }) => {
    let keysError: CoSignerError['keys'];
    let nameError: CoSignerError['name'];

    const keysValidationResult = keysRegex.exec(keys);
    if (!keys) keysError = 'required';
    else if (!keysValidationResult) keysError = 'invalid';

    if (!name) nameError = 'required';
    else if (name.length > maxCoSignerNameLength) nameError = 'tooLong';
    else if (coSigners.some((coSigner) => coSigner.id !== id && coSigner.name === name)) nameError = 'duplicated';

    if (keysError || nameError) {
      coSignersErrors = [...coSignersErrors, { id, keys: keysError, name: nameError }];
    }
  });

  return coSignersErrors;
};

const getInitialCoSignerValue = (): CoSigner => ({ id: uuid(), keys: '', name: '' });

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
          getInitialCoSignerValue(),
          getInitialCoSignerValue()
        ],
        coSignersErrors: [],
        step: SharedWalletCreationStep.CoSigners,
        walletName: prevState.walletName
      };
    }
    return prevState;
  },
  [SharedWalletCreationStep.CoSigners]: (prevState, action) => {
    if (action.type === SharedWalletActionType.COSIGNERS_CHANGED) {
      const matchingPrevCoSigner = prevState.coSigners.find((prevCosigner) => prevCosigner.id === action.coSigner.id);
      if (!matchingPrevCoSigner) return prevState;

      const nextCoSigners = prevState.coSigners.map((coSigner) =>
        coSigner.id === action.coSigner.id ? action.coSigner : coSigner
      );
      const coSignersErrors = validateCoSigners(nextCoSigners).filter(
        ({ id }) => !nextCoSigners.some((c) => c.id === id && !c.keys && !c.name)
      );

      return {
        ...prevState,
        coSigners: nextCoSigners,
        coSignersErrors
      };
    }
    if (action.type === SharedWalletActionType.BACK) {
      return {
        ...prevState,
        coSigners: undefined,
        coSignersErrors: undefined,
        step: SharedWalletCreationStep.Setup
      };
    }
    if (action.type === SharedWalletActionType.NEXT) {
      const coSigners = prevState.coSigners.filter((c) => c.keys && c.name);
      if (coSigners.length === 0) return prevState;

      return {
        ...prevState,
        coSigners,
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
      const coSigners = [
        prevState.coSigners[0] || getInitialCoSignerValue(),
        prevState.coSigners[1] || getInitialCoSignerValue()
      ];
      return {
        ...prevState,
        coSigners,
        quorumRules: undefined,
        step: SharedWalletCreationStep.CoSigners
      };
    }
    if (action.type === SharedWalletActionType.NEXT) {
      return {
        ...prevState,
        coSigners: undefined,
        coSignersErrors: undefined,
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
