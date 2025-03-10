import { Wallet } from '@lace/cardano';
import { StateType, defineStateShape } from '../../../state-utils';
import { PasswordErrorType } from '../EnterPassword';

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
    passwordErrorType: PasswordErrorType;
    sharedWalletKey: string;
  };
}>();

export const stateEnterPassword = makeState<{
  loading: boolean;
  passwordErrorType: PasswordErrorType | undefined;
  sharedWalletKey: undefined;
  step: GenerateSharedWalletKeyStep.EnterPassword;
}>();
export type StateEnterPassword = StateType<typeof stateEnterPassword>;

export const stateCopyKey = makeState<{
  loading: undefined;
  passwordErrorType: undefined;
  sharedWalletKey: Wallet.Cardano.Cip1854ExtendedAccountPublicKey;
  step: GenerateSharedWalletKeyStep.CopyKey;
}>();
export type StateCopyKey = StateType<typeof stateCopyKey>;

export type GenerateSharedWalletKeyState = StateEnterPassword | StateCopyKey;
