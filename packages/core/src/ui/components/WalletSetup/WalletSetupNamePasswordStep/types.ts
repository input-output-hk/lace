import { PasswordVerificationProps } from '@ui/components/PasswordVerification';

export type ValidationErrorKeys = 'nameMaxLength';
export type BarStates = PasswordVerificationProps['complexityBarList'];
export interface WalletSetupNamePasswordSubmitParams {
  walletName: string;
}
