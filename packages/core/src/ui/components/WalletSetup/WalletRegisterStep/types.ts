import { PasswordVerificationProps } from '@lace/common';

export type validationErrorKeys = 'nameMaxLength';
export type BarStates = PasswordVerificationProps['complexityBarList'];
export interface WalletSetupNamePasswordSubmitParams {
  password: string;
  walletName: string;
}
