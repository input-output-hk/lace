import { PasswordVerificationProps } from '@lace/common';

export type ValidationErrorKeys = 'nameMaxLength';
export type BarStates = PasswordVerificationProps['complexityBarList'];
export interface WalletSetupNamePasswordSubmitParams {
  password: string;
  walletName: string;
}
