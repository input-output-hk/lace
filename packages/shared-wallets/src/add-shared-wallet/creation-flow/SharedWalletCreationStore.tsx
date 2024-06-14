import { Dispatch, ReactElement, ReactNode, createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { v1 as uuid } from 'uuid';
import { makeInitialStateProvider } from '../../initial-state-provider';
import { CoSigner, CoSignerDirty, CoSignerError } from './AddCoSigners';
import { QuorumOptionValue, QuorumRadioOption } from './Quorum';
import { SharedWalletCreationStep } from './types';
import { validateCoSigners } from './validateCoSigners';

type StateMainPart = {
  step: SharedWalletCreationStep;
};

type StateVariableDataPart = {
  coSignerInputsDirty: CoSignerDirty[] | undefined;
  coSignerInputsErrors: CoSignerError[] | undefined;
  coSigners: CoSigner[] | undefined;
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
  coSignerInputsDirty: undefined;
  coSignerInputsErrors: undefined;
  coSigners: undefined;
  quorumRules: undefined;
  step: SharedWalletCreationStep.Setup;
  walletName: string | undefined;
}>;

type StateCoSignersCommon = {
  coSignerInputsDirty: CoSignerDirty[];
  coSignerInputsErrors: CoSignerError[];
  coSigners: CoSigner[];
  quorumRules: undefined;
  walletName: string;
};

export type StateCoSigners = MakeState<
  StateCoSignersCommon & {
    step: SharedWalletCreationStep.CoSigners;
  }
>;

export type StateCoSignersImportantInfo = MakeState<
  StateCoSignersCommon & {
    step: SharedWalletCreationStep.CoSignersImportantInfo;
  }
>;

export type StateQuorum = MakeState<{
  coSignerInputsDirty: CoSignerDirty[];
  coSignerInputsErrors: CoSignerError[];
  coSigners: CoSigner[];
  quorumRules: QuorumOptionValue;
  step: SharedWalletCreationStep.Quorum;
  walletName: string;
}>;

export type StateShareDetails = MakeState<{
  coSignerInputsDirty: CoSignerDirty[];
  coSignerInputsErrors: CoSignerError[];
  coSigners: CoSigner[];
  quorumRules: QuorumOptionValue;
  step: SharedWalletCreationStep.ShareDetails;
  walletName: string;
}>;

export type CreationFlowState =
  | StateSetup
  | StateCoSigners
  | StateCoSignersImportantInfo
  | StateQuorum
  | StateShareDetails;

export enum SharedWalletActionType {
  BACK = 'BACK',
  CHANGE_WALLET_NAME = 'CHANGE_WALLET_NAME',
  COSIGNERS_CHANGED = 'COSIGNERS_CHANGED',
  NEXT = 'NEXT',
  QUORUM_RULES_CHANGED = 'QUORUM_RULES_CHANGED',
}

type Action =
  | { type: SharedWalletActionType.NEXT }
  | { type: SharedWalletActionType.BACK }
  | { type: SharedWalletActionType.CHANGE_WALLET_NAME; walletName: string }
  | { coSigner: CoSigner; type: SharedWalletActionType.COSIGNERS_CHANGED }
  | { quorumRules: QuorumOptionValue; type: SharedWalletActionType.QUORUM_RULES_CHANGED };

type Handler<S extends CreationFlowState> = (prevState: S, action: Action) => CreationFlowState;

type StateMachine = {
  [SharedWalletCreationStep.Setup]: Handler<StateSetup>;
  [SharedWalletCreationStep.CoSigners]: Handler<StateCoSigners>;
  [SharedWalletCreationStep.CoSignersImportantInfo]: Handler<StateCoSignersImportantInfo>;
  [SharedWalletCreationStep.Quorum]: Handler<StateQuorum>;
  [SharedWalletCreationStep.ShareDetails]: Handler<StateShareDetails>;
};

type ContextValue = {
  dispatch: Dispatch<Action>;
  state: CreationFlowState;
};

const { InitialStateProvider, useInitialState } = makeInitialStateProvider<CreationFlowState>();

export const SharedWalletCreationFlowInitialStateProvider = InitialStateProvider;

// eslint-disable-next-line unicorn/no-null
const sharedWalletCreationContext = createContext<ContextValue | null>(null);

export const useSharedWalletCreationStore = (): ContextValue => {
  const value = useContext(sharedWalletCreationContext);
  if (value === null) throw new Error('SharedWalletCreationContext not defined');
  return value;
};

export const makeInitialState = (activeWalletName: string): CreationFlowState => ({
  activeWalletName,
  coSignerInputsDirty: undefined,
  coSignerInputsErrors: undefined,
  coSigners: undefined,
  quorumRules: undefined,
  step: SharedWalletCreationStep.Setup,
  walletName: undefined,
});

export const getInitialCoSignerValue = (): CoSigner => ({ id: uuid(), keys: '', name: '' });

const getNextCoSignersDirtyValue = ({
  action,
  matchingPrevCoSigner,
  prevState,
}: {
  action: { coSigner: CoSigner; type: SharedWalletActionType.COSIGNERS_CHANGED };
  matchingPrevCoSigner: CoSigner;
  prevState: StateCoSigners;
}) =>
  prevState.coSignerInputsDirty.map((dirty) =>
    dirty.id === action.coSigner.id
      ? {
          id: dirty.id,
          keys: matchingPrevCoSigner.keys !== action.coSigner.keys ? true : dirty.keys,
          name: matchingPrevCoSigner.name !== action.coSigner.name ? true : dirty.name,
        }
      : dirty,
  );

const makeStateMachine = ({
  navigateToAppHome,
  navigateToParentFlow,
}: {
  navigateToAppHome: () => void;
  navigateToParentFlow: () => void;
}): StateMachine => ({
  [SharedWalletCreationStep.Setup]: (prevState, action) => {
    if (action.type === SharedWalletActionType.CHANGE_WALLET_NAME) {
      return {
        ...prevState,
        walletName: action.walletName,
      };
    }
    if (action.type === SharedWalletActionType.BACK) {
      navigateToParentFlow();
      return prevState;
    }
    if (action.type === SharedWalletActionType.NEXT) {
      if (!prevState.walletName) return prevState;
      const coSigners = [getInitialCoSignerValue(), getInitialCoSignerValue()];
      return {
        ...prevState,
        coSignerInputsDirty: coSigners.map(({ id }) => ({ id, keys: false, name: false })),
        coSignerInputsErrors: [],
        coSigners,
        step: SharedWalletCreationStep.CoSigners,
        walletName: prevState.walletName,
      };
    }
    return prevState;
  },
  [SharedWalletCreationStep.CoSigners]: (prevState, action) => {
    if (action.type === SharedWalletActionType.COSIGNERS_CHANGED) {
      const matchingPrevCoSigner = prevState.coSigners.find((prevCosigner) => prevCosigner.id === action.coSigner.id);
      if (!matchingPrevCoSigner) return prevState;

      const nextCoSigners = prevState.coSigners.map((coSigner) =>
        coSigner.id === action.coSigner.id ? action.coSigner : coSigner,
      );
      const coSignersDirty = getNextCoSignersDirtyValue({
        action,
        matchingPrevCoSigner,
        prevState,
      });
      const coSignersErrors = validateCoSigners(nextCoSigners);
      // Validation function raises errors for every cosigner entry. Our current implementation
      // have fixed 2 fields for cosigners so if user decided to specify only 1 then the second
      // fields should stay empty and should not show errors.
      // This filter should be removed once we enable the "add cosigner" button
      const filteredCosignerErrors = coSignersErrors.filter(
        ({ id }) => !nextCoSigners.some((c) => c.id === id && !c.keys && !c.name),
      );

      return {
        ...prevState,
        coSignerInputsDirty: coSignersDirty,
        coSignerInputsErrors: filteredCosignerErrors,
        coSigners: nextCoSigners,
      };
    }
    if (action.type === SharedWalletActionType.BACK) {
      return {
        ...prevState,
        coSignerInputsDirty: undefined,
        coSignerInputsErrors: undefined,
        coSigners: undefined,
        step: SharedWalletCreationStep.Setup,
      };
    }
    if (action.type === SharedWalletActionType.NEXT) {
      if (prevState.coSigners.length === 0) return prevState;

      return {
        ...prevState,
        step: SharedWalletCreationStep.CoSignersImportantInfo,
      };
    }
    return prevState;
  },
  [SharedWalletCreationStep.CoSignersImportantInfo]: (prevState, action) => {
    if (action.type === SharedWalletActionType.BACK) {
      return {
        ...prevState,
        step: SharedWalletCreationStep.CoSigners,
      };
    }
    if (action.type === SharedWalletActionType.NEXT) {
      // Having two cosigner fields fixed we need to filter out the empty cosigner
      const coSigners = prevState.coSigners.filter((c) => c.keys && c.name);
      if (coSigners.length === 0) return prevState;

      return {
        ...prevState,
        coSigners,
        quorumRules: {
          option: QuorumRadioOption.AllAddresses,
        },
        step: SharedWalletCreationStep.Quorum,
      };
    }
    return prevState;
  },
  [SharedWalletCreationStep.Quorum]: (prevState, action) => {
    if (action.type === SharedWalletActionType.BACK) {
      // Having two cosigner fields fixed we need to fall back to two entries if user specified
      // just one because the empty one was filtere out in brevious step.
      const coSigners = [
        prevState.coSigners[0] || getInitialCoSignerValue(),
        prevState.coSigners[1] || getInitialCoSignerValue(),
      ];
      return {
        ...prevState,
        coSigners,
        quorumRules: undefined,
        step: SharedWalletCreationStep.CoSigners,
      };
    }
    if (action.type === SharedWalletActionType.NEXT) {
      return {
        ...prevState,
        step: SharedWalletCreationStep.ShareDetails,
      };
    }
    if (action.type === SharedWalletActionType.QUORUM_RULES_CHANGED) {
      return {
        ...prevState,
        quorumRules: action.quorumRules,
      };
    }
    return prevState;
  },
  [SharedWalletCreationStep.ShareDetails]: (prevState, action) => {
    if (action.type === SharedWalletActionType.NEXT) {
      navigateToAppHome();
      return prevState;
    }

    return prevState;
  },
});

export type SharedWalletCreationStoreSharedProps = {
  activeWalletName: string;
  initialWalletName: string;
  navigateToAppHome: () => void;
  navigateToParentFlow: () => void;
};

export type SharedWalletCreationStoreProps = SharedWalletCreationStoreSharedProps & {
  children: (value: ContextValue) => ReactNode;
};

export const SharedWalletCreationStore = ({
  activeWalletName,
  children,
  initialWalletName,
  navigateToAppHome,
  navigateToParentFlow,
}: SharedWalletCreationStoreProps): ReactElement => {
  const initialState = useInitialState(makeInitialState(activeWalletName));
  const [state, dispatch] = useReducer((prevState: CreationFlowState, action: Action): CreationFlowState => {
    const stateMachine = makeStateMachine({
      navigateToAppHome,
      navigateToParentFlow,
    });
    const handler = stateMachine[prevState.step] as Handler<CreationFlowState>;
    return handler(prevState, action);
  }, initialState);

  useEffect(() => {
    if (state.walletName !== undefined || initialWalletName === undefined) return;
    dispatch({ type: SharedWalletActionType.CHANGE_WALLET_NAME, walletName: initialWalletName });
  }, [state.walletName, initialWalletName]);

  const contextValue: ContextValue = useMemo(
    () => ({
      dispatch,
      state,
    }),
    [state],
  );

  return (
    <sharedWalletCreationContext.Provider value={contextValue}>
      {children(contextValue)}
    </sharedWalletCreationContext.Provider>
  );
};
