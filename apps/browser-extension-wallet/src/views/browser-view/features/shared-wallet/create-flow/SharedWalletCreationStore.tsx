import { useWalletManager } from '@hooks';
import { CoSigner, CoSignerError, QuorumOptionValue, QuorumRadioOption } from '@lace/core';
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
import { SharedWalletCreationStep } from './types';
import { firstValueFrom } from 'rxjs';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { useHistory } from 'react-router';
import { v1 as uuid } from 'uuid';
import { validateCoSigners } from './validateCoSigners';

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

type StateCoSignersCommon = {
  coSigners: CoSigner[];
  coSignersErrors: CoSignerError[];
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
  coSigners: CoSigner[];
  coSignersErrors: CoSignerError[];
  quorumRules: QuorumOptionValue;
  step: SharedWalletCreationStep.Quorum;
  walletName: string;
}>;

export type StateShareDetails = MakeState<
  Omit<StateQuorum, 'step'> & {
    step: SharedWalletCreationStep.ShareDetails;
  }
>;

type State = StateSetup | StateCoSigners | StateCoSignersImportantInfo | StateQuorum | StateShareDetails;

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
  [SharedWalletCreationStep.CoSignersImportantInfo]: Handler<StateCoSignersImportantInfo>;
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
  coSigners: undefined,
  coSignersErrors: undefined,
  quorumRules: undefined,
  step: SharedWalletCreationStep.Setup,
  walletName: undefined
});

const getInitialCoSignerValue = (): CoSigner => ({ id: uuid(), keys: '', name: '' });

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
        coSigners: [getInitialCoSignerValue(), getInitialCoSignerValue()],
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
      const coSignersErrors = validateCoSigners(nextCoSigners);
      // Validation function raises errors for every cosigner entry. Our current implementation
      // have fixed 2 fields for cosigners so if user decided to specify only 1 then the second
      // fields should stay empty and should not show errors.
      // This filter should be removed once we enable the "add cosigner" button
      const filteredCosignerErrors = coSignersErrors.filter(
        ({ id }) => !nextCoSigners.some((c) => c.id === id && !c.keys && !c.name)
      );

      return {
        ...prevState,
        coSigners: nextCoSigners,
        coSignersErrors: filteredCosignerErrors
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
      if (prevState.coSigners.length === 0) return prevState;

      return {
        ...prevState,
        step: SharedWalletCreationStep.CoSignersImportantInfo
      };
    }
    return prevState;
  },
  [SharedWalletCreationStep.CoSignersImportantInfo]: (prevState, action) => {
    if (action.type === SharedWalletActionType.BACK) {
      return {
        ...prevState,
        step: SharedWalletCreationStep.CoSigners
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
          option: QuorumRadioOption.AllAddresses
        },
        step: SharedWalletCreationStep.Quorum
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
        step: SharedWalletCreationStep.ShareDetails
      } as StateShareDetails;
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
