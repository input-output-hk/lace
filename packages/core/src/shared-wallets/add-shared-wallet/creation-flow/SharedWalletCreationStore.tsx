import React, {
  Dispatch,
  ReactElement,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { v1 as uuid } from 'uuid';
import { makeInitialStateProvider } from '../../initial-state-provider';
import { CoSigner } from './AddCoSigners';
import { QuorumRadioOption } from './Quorum';
import {
  CreationFlowState,
  SharedWalletCreationAction,
  SharedWalletCreationActionType,
  SharedWalletCreationStep,
  StateCoSigners,
  StateCoSignersImportantInfo,
  StateQuorum,
  StateSetup,
  StateShareDetails,
  stateCoSigners,
  stateCoSignersImportantInfo,
  stateQuorum,
  stateSetup,
  stateShareDetails,
} from './state-and-types';
import { validateCoSigners } from './validateCoSigners';

type Handler<S extends CreationFlowState> = (prevState: S, action: SharedWalletCreationAction) => CreationFlowState;

type SharedWalletCreationStateMachine = {
  [SharedWalletCreationStep.Setup]: Handler<StateSetup>;
  [SharedWalletCreationStep.CoSigners]: Handler<StateCoSigners>;
  [SharedWalletCreationStep.CoSignersImportantInfo]: Handler<StateCoSignersImportantInfo>;
  [SharedWalletCreationStep.Quorum]: Handler<StateQuorum>;
  [SharedWalletCreationStep.ShareDetails]: Handler<StateShareDetails>;
};

type ContextValue = {
  dispatch: Dispatch<SharedWalletCreationAction>;
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

export const makeInitialState = (activeWalletName: string) =>
  stateSetup({
    activeWalletName,
    coSignerInputsDirty: undefined,
    coSignerInputsErrors: undefined,
    coSigners: undefined,
    quorumRules: undefined,
    step: SharedWalletCreationStep.Setup,
    walletName: undefined,
  });

export const createEmptyCosignerObject = (): CoSigner => ({ id: uuid(), keys: '', name: '' });

const getNextCoSignersDirtyValue = ({
  action,
  matchingPrevCoSigner,
  prevState,
}: {
  action: { coSigner: CoSigner; type: SharedWalletCreationActionType.COSIGNERS_CHANGED };
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
  exitTheFlow,
  navigateToAppHome,
}: {
  exitTheFlow: () => void;
  navigateToAppHome: () => void;
}): SharedWalletCreationStateMachine => ({
  [SharedWalletCreationStep.Setup]: (prevState, action) => {
    if (action.type === SharedWalletCreationActionType.CHANGE_WALLET_NAME) {
      return stateSetup({
        ...prevState,
        walletName: action.walletName,
      });
    }
    if (action.type === SharedWalletCreationActionType.BACK) {
      exitTheFlow();
      return prevState;
    }
    if (action.type === SharedWalletCreationActionType.NEXT) {
      if (!prevState.walletName) return prevState;
      const coSigners = [createEmptyCosignerObject(), createEmptyCosignerObject()];
      return stateCoSigners({
        ...prevState,
        coSignerInputsDirty: coSigners.map(({ id }) => ({ id, keys: false, name: false })),
        coSignerInputsErrors: [],
        coSigners,
        step: SharedWalletCreationStep.CoSigners,
        walletName: prevState.walletName,
      });
    }
    return prevState;
  },
  [SharedWalletCreationStep.CoSigners]: (prevState, action) => {
    if (action.type === SharedWalletCreationActionType.COSIGNERS_CHANGED) {
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

      return stateCoSigners({
        ...prevState,
        coSignerInputsDirty: coSignersDirty,
        coSignerInputsErrors: filteredCosignerErrors,
        coSigners: nextCoSigners,
      });
    }
    if (action.type === SharedWalletCreationActionType.BACK) {
      return stateSetup({
        ...prevState,
        coSignerInputsDirty: undefined,
        coSignerInputsErrors: undefined,
        coSigners: undefined,
        step: SharedWalletCreationStep.Setup,
      });
    }
    if (action.type === SharedWalletCreationActionType.NEXT) {
      if (prevState.coSigners.length === 0) return prevState;

      return stateCoSignersImportantInfo({
        ...prevState,
        step: SharedWalletCreationStep.CoSignersImportantInfo,
      });
    }
    return prevState;
  },
  [SharedWalletCreationStep.CoSignersImportantInfo]: (prevState, action) => {
    if (action.type === SharedWalletCreationActionType.BACK) {
      return stateCoSigners({
        ...prevState,
        step: SharedWalletCreationStep.CoSigners,
      });
    }
    if (action.type === SharedWalletCreationActionType.NEXT) {
      // Having two cosigner fields fixed we need to filter out the empty cosigner
      const coSigners = prevState.coSigners.filter((c) => c.keys && c.name);
      if (coSigners.length === 0) return prevState;

      return stateQuorum({
        ...prevState,
        coSigners,
        quorumRules: {
          option: QuorumRadioOption.AllAddresses,
        },
        step: SharedWalletCreationStep.Quorum,
      });
    }
    return prevState;
  },
  [SharedWalletCreationStep.Quorum]: (prevState, action) => {
    if (action.type === SharedWalletCreationActionType.BACK) {
      // Having two cosigner fields fixed we need to fall back to two entries if user specified
      // just one because the empty one was filtere out in brevious step.
      const coSigners = [
        prevState.coSigners[0] || createEmptyCosignerObject(),
        prevState.coSigners[1] || createEmptyCosignerObject(),
      ];
      return stateCoSigners({
        ...prevState,
        coSigners,
        quorumRules: undefined,
        step: SharedWalletCreationStep.CoSigners,
      });
    }
    if (action.type === SharedWalletCreationActionType.NEXT) {
      return stateShareDetails({
        ...prevState,
        step: SharedWalletCreationStep.ShareDetails,
      });
    }
    if (action.type === SharedWalletCreationActionType.QUORUM_RULES_CHANGED) {
      return stateQuorum({
        ...prevState,
        quorumRules: action.quorumRules,
      });
    }
    return prevState;
  },
  [SharedWalletCreationStep.ShareDetails]: (prevState, action) => {
    if (action.type === SharedWalletCreationActionType.NEXT) {
      navigateToAppHome();
      return prevState;
    }
    return prevState;
  },
});

export type SharedWalletCreationStoreSharedProps = {
  activeWalletName: string;
  exitTheFlow: () => void;
  initialWalletName: string;
  navigateToAppHome: () => void;
};

export type SharedWalletCreationStoreProps = SharedWalletCreationStoreSharedProps & {
  children: (value: ContextValue) => ReactNode;
};

export const SharedWalletCreationStore = ({
  activeWalletName,
  children,
  exitTheFlow,
  initialWalletName,
  navigateToAppHome,
}: SharedWalletCreationStoreProps): ReactElement => {
  const initialState = useInitialState(makeInitialState(activeWalletName));
  const [state, dispatch] = useReducer(
    (prevState: CreationFlowState, action: SharedWalletCreationAction): CreationFlowState => {
      const stateMachine = makeStateMachine({
        exitTheFlow,
        navigateToAppHome,
      });
      const handler = stateMachine[prevState.step] as Handler<CreationFlowState>;
      return handler(prevState, action);
    },
    initialState,
  );

  useEffect(() => {
    if (state.walletName !== undefined || initialWalletName === undefined) return;
    dispatch({ type: SharedWalletCreationActionType.CHANGE_WALLET_NAME, walletName: initialWalletName });
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
