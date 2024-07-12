import { StateType, defineStateShape } from '../../../state-utils';

export enum GenerateSharedKeysStep {
  CopyKeys = 'CopyKeys',
  EnterPassword = 'EnterPassword',
}

const makeState = defineStateShape<{
  mainPart: {
    step: GenerateSharedKeysStep;
  };
  variableDataPart: {
    loading: boolean;
    passwordErrorMessage: string;
    sharedKeys: string;
    sharedKeysCollapsed: boolean;
  };
}>();

export const stateEnterPassword = makeState<{
  loading: boolean;
  passwordErrorMessage: string | undefined;
  sharedKeys: undefined;
  sharedKeysCollapsed: undefined;
  step: GenerateSharedKeysStep.EnterPassword;
}>();
export type StateEnterPassword = StateType<typeof stateEnterPassword>;

export const stateCopyKeys = makeState<{
  loading: undefined;
  passwordErrorMessage: undefined;
  sharedKeys: string;
  sharedKeysCollapsed: boolean;
  step: GenerateSharedKeysStep.CopyKeys;
}>();
export type StateCopyKeys = StateType<typeof stateCopyKeys>;

export type GenerateSharedKeysState = StateEnterPassword | StateCopyKeys;
