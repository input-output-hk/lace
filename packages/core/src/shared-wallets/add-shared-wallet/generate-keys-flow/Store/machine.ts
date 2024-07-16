import { TransitionHandler } from '../../../state-utils';
import {
  GenerateSharedKeysState,
  GenerateSharedKeysStep,
  StateCopyKeys,
  StateEnterPassword,
  stateCopyKeys,
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
  | { sharedKeys: string; type: ActionType.KeysGenerationCompleted }
  | { errorMessage: string; type: ActionType.KeysGenerationFailed }
  | { type: ActionType.CloseFlow };

export type Handler<S extends GenerateSharedKeysState> = TransitionHandler<S, GenerateSharedKeysState, Action>;

type StateMachine = {
  [GenerateSharedKeysStep.EnterPassword]: Handler<StateEnterPassword>;
  [GenerateSharedKeysStep.CopyKeys]: Handler<StateCopyKeys>;
};

type MakeStateMachineParams = {
  navigateToParentFlow: () => void;
  triggerKeysGeneration: (password: string) => void;
};

export const makeStateMachine = ({
  navigateToParentFlow,
  triggerKeysGeneration,
}: MakeStateMachineParams): StateMachine => ({
  [GenerateSharedKeysStep.EnterPassword]: (prevState, action) => {
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
        passwordErrorMessage: action.errorMessage,
      });
    }

    if (action.type === ActionType.KeysGenerationCompleted) {
      return stateCopyKeys({
        loading: undefined,
        passwordErrorMessage: undefined,
        sharedKeys: action.sharedKeys,
        sharedKeysCollapsed: true,
        step: GenerateSharedKeysStep.CopyKeys,
      });
    }

    return prevState;
  },
  [GenerateSharedKeysStep.CopyKeys]: (prevState, action) => {
    if (action.type === ActionType.CloseFlow) {
      navigateToParentFlow();
      return prevState;
    }

    return prevState;
  },
});
