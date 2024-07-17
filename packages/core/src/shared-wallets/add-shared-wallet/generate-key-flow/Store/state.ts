import { StateType, defineStateShape } from '../../../state-utils';

export enum GenerateSharedWalletKeyStep {
  CopyKey = 'CopyKey',
  EnterPassword = 'EnterPassword',
}

const makeState = defineStateShape<{
  mainPart: {
    step: GenerateSharedWalletKeyStep;
  };
  variableDataPart: {
    loading: boolean;
    passwordErrorMessage: string;
    sharedWalletKey: string;
    sharedWalletKeyCollapsed: boolean;
  };
}>();

export const stateEnterPassword = makeState<{
  loading: boolean;
  passwordErrorMessage: string | undefined;
  sharedWalletKey: undefined;
  sharedWalletKeyCollapsed: undefined;
  step: GenerateSharedWalletKeyStep.EnterPassword;
}>();
export type StateEnterPassword = StateType<typeof stateEnterPassword>;

export const stateCopyKey = makeState<{
  loading: undefined;
  passwordErrorMessage: undefined;
  sharedWalletKey: string;
  sharedWalletKeyCollapsed: boolean;
  step: GenerateSharedWalletKeyStep.CopyKey;
}>();
export type StateCopyKey = StateType<typeof stateCopyKey>;

export type GenerateSharedWalletKeyState = StateEnterPassword | StateCopyKey;
