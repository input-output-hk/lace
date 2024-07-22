import { TransitionHandler } from '../../../state-utils';
import { PasswordErrorType } from '../EnterPassword';
import {
  GenerateSharedWalletKeyState,
  GenerateSharedWalletKeyStep,
  StateCopyKey,
  StateEnterPassword,
  stateCopyKey,
  stateEnterPassword,
} from './state';

export enum ActionType {
  Back = 'Back',
  CloseFlow = 'CLoseFlow',
  KeysGenerationCompleted = 'KeysGenerationCompleted',
  KeysGenerationFailed = 'KeysGenerationFailed',
  KeysGenerationTriggered = 'KeysGenerationTriggered',
}

export type Action =
  | { type: ActionType.Back }
  | { password: string; type: ActionType.KeysGenerationTriggered }
  | { sharedWalletKey: string; type: ActionType.KeysGenerationCompleted }
  | { errorType: PasswordErrorType; type: ActionType.KeysGenerationFailed }
  | { type: ActionType.CloseFlow };

export type Handler<S extends GenerateSharedWalletKeyState> = TransitionHandler<
  S,
  GenerateSharedWalletKeyState,
  Action
>;

type StateMachine = {
  [GenerateSharedWalletKeyStep.EnterPassword]: Handler<StateEnterPassword>;
  [GenerateSharedWalletKeyStep.CopyKey]: Handler<StateCopyKey>;
};

type MakeStateMachineParams = {
  navigateToParentFlow: () => void;
  triggerKeysGeneration: (password: string) => void;
};

export const makeStateMachine = ({
  navigateToParentFlow,
  triggerKeysGeneration,
}: MakeStateMachineParams): StateMachine => ({
  [GenerateSharedWalletKeyStep.EnterPassword]: (prevState, action) => {
    if (action.type === ActionType.Back) {
      navigateToParentFlow();
      return prevState;
    }

    if (action.type === ActionType.KeysGenerationTriggered) {
      triggerKeysGeneration(action.password);
      return stateEnterPassword({
        ...prevState,
        loading: true,
      });
    }

    if (action.type === ActionType.KeysGenerationFailed) {
      return stateEnterPassword({
        ...prevState,
        loading: false,
        passwordErrorType: action.errorType,
      });
    }

    if (action.type === ActionType.KeysGenerationCompleted) {
      return stateCopyKey({
        loading: undefined,
        passwordErrorType: undefined,
        sharedWalletKey: action.sharedWalletKey,
        step: GenerateSharedWalletKeyStep.CopyKey,
      });
    }

    return prevState;
  },
  [GenerateSharedWalletKeyStep.CopyKey]: (prevState, action) => {
    if (action.type === ActionType.CloseFlow) {
      navigateToParentFlow();
      return prevState;
    }

    return prevState;
  },
});
