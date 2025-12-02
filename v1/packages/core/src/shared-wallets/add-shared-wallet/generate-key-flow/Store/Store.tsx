import { Dispatch, FC, ReactElement, useMemo, useReducer } from 'react';
import { makeInitialStateProvider } from '../../../initial-state-provider';
import { Action, Handler, makeStateMachine } from './machine';
import { GenerateSharedWalletKeyState, GenerateSharedWalletKeyStep, stateEnterPassword } from './state';

const { InitialStateProvider, useInitialState } = makeInitialStateProvider<GenerateSharedWalletKeyState>();

export const GenerateSharedWalletKeyInitialStateProvider = InitialStateProvider;

type GenerateSharedWalletKeyStoreValue = {
  dispatch: Dispatch<Action>;
  state: GenerateSharedWalletKeyState;
};

export type StoreSharedProps = {
  navigateToParentFlow: () => void;
};

type StoreProps = StoreSharedProps & {
  children: (store: GenerateSharedWalletKeyStoreValue) => ReactElement;
};

const getReducer = (navigateToParentFlow: () => void) => (prevState: GenerateSharedWalletKeyState, action: Action) => {
  const stateMachine = makeStateMachine({
    navigateToParentFlow,
  });
  const handler = stateMachine[prevState.step] as Handler<GenerateSharedWalletKeyState>;
  return handler(prevState, action);
};

export const makeInitialState = () =>
  stateEnterPassword({
    loading: false,
    passwordErrorType: undefined,
    sharedWalletKey: undefined,
    step: GenerateSharedWalletKeyStep.EnterPassword,
  });

export const Store: FC<StoreProps> = ({ children, navigateToParentFlow }) => {
  const initialState = useInitialState(makeInitialState());
  const reducer = useMemo(() => getReducer(navigateToParentFlow), [navigateToParentFlow]);
  const [state, dispatch] = useReducer(reducer, initialState);

  return children({ dispatch, state });
};
