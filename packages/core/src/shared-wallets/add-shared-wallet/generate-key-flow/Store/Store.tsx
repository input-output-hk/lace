import { Dispatch, FC, ReactElement, useReducer } from 'react';
import { makeInitialStateProvider } from '../../../initial-state-provider';
import { PasswordErrorType } from '../EnterPassword';
import { GenerateSharedWalletKeyFn, SharedWalletKeyGenerationAuthError } from '../generate-shared-wallet-key';
import { Action, ActionType, Handler, makeStateMachine } from './machine';
import { GenerateSharedWalletKeyState, GenerateSharedWalletKeyStep, stateEnterPassword } from './state';

const { InitialStateProvider, useInitialState } = makeInitialStateProvider<GenerateSharedWalletKeyState>();

export const GenerateSharedWalletKeyInitialStateProvider = InitialStateProvider;

type GenerateSharedWalletKeyStoreValue = {
  dispatch: Dispatch<Action>;
  state: GenerateSharedWalletKeyState;
};

export type StoreSharedProps = {
  generateKey: GenerateSharedWalletKeyFn;
  navigateToParentFlow: () => void;
};

type StoreProps = StoreSharedProps & {
  children: (store: GenerateSharedWalletKeyStoreValue) => ReactElement;
};

export const makeInitialState = () =>
  stateEnterPassword({
    loading: false,
    passwordErrorType: undefined,
    sharedWalletKey: undefined,
    step: GenerateSharedWalletKeyStep.EnterPassword,
  });

export const Store: FC<StoreProps> = ({ children, generateKey, navigateToParentFlow }) => {
  const initialState = useInitialState(makeInitialState());
  const [state, dispatch] = useReducer((prevState: GenerateSharedWalletKeyState, action: Action) => {
    const stateMachine = makeStateMachine({
      navigateToParentFlow,
      triggerKeysGeneration: (password) => {
        generateKey(password)
          .then((sharedWalletKey) => dispatch({ sharedWalletKey, type: ActionType.KeysGenerationCompleted }))
          .catch((error) => {
            const errorType: PasswordErrorType =
              error instanceof SharedWalletKeyGenerationAuthError ? 'invalid-password' : 'generic';
            dispatch({ errorType, type: ActionType.KeysGenerationFailed });
          });
      },
    });
    const handler = stateMachine[prevState.step] as Handler<GenerateSharedWalletKeyState>;
    return handler(prevState, action);
  }, initialState);

  return children({ dispatch, state });
};
