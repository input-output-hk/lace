import { Dispatch, FC, ReactElement, useReducer } from 'react';
import { makeInitialStateProvider } from '../../../initial-state-provider';
import { Action, ActionType, Handler, makeStateMachine } from './machine';
import { GenerateSharedKeysState, GenerateSharedKeysStep, stateEnterPassword } from './state';

const { InitialStateProvider, useInitialState } = makeInitialStateProvider<GenerateSharedKeysState>();

export const GenerateSharedKeysInitialStateProvider = InitialStateProvider;

type GenerateSharedKeysStoreValue = {
  dispatch: Dispatch<Action>;
  state: GenerateSharedKeysState;
};

export type StoreSharedProps = {
  generateKeys: (password: string) => Promise<string>;
  navigateToParentFlow: () => void;
};

type StoreProps = StoreSharedProps & {
  children: (store: GenerateSharedKeysStoreValue) => ReactElement;
};

export const makeInitialState = () =>
  stateEnterPassword({
    loading: false,
    passwordErrorMessage: undefined,
    sharedKeys: undefined,
    sharedKeysCollapsed: undefined,
    step: GenerateSharedKeysStep.EnterPassword,
  });

export const Store: FC<StoreProps> = ({ children, generateKeys, navigateToParentFlow }) => {
  const initialState = useInitialState(makeInitialState());
  const [state, dispatch] = useReducer((prevState: GenerateSharedKeysState, action: Action) => {
    const stateMachine = makeStateMachine({
      navigateToParentFlow,
      triggerKeysGeneration: (password) => {
        generateKeys(password)
          .then((sharedKeys) => dispatch({ sharedKeys, type: ActionType.KeysGenerationCompleted }))
          .catch((error) => dispatch({ errorMessage: error.message, type: ActionType.KeysGenerationFailed }));
      },
    });
    const handler = stateMachine[prevState.step] as Handler<GenerateSharedKeysState>;
    return handler(prevState, action);
  }, initialState);

  return children({ dispatch, state });
};
