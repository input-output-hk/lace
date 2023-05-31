import { Wallet } from '@lace/cardano';
import { AnalyticsConsentStatus } from '../providers/AnalyticsProvider/analyticsTracker/types';

export interface WalletStorage {
  name: string;
}

export type WalletLocked = Uint8Array;

export interface AppSettings {
  mnemonicVerificationFrequency?: string;
  lastMnemonicVerification?: string;
  chainName?: Wallet.ChainName;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
}

interface UserInfo {
  firstName: string;
  lastName: string;
}

export interface LastStakingInfo {
  epoch?: string;
  poolId?: string;
}

export interface ILocalStorage {
  currency?: CurrencyInfo;
  appSettings?: AppSettings;
  wallet?: WalletStorage;
  keyAgentData?: Wallet.KeyManagement.SerializableKeyAgentData;
  userInfo?: UserInfo;
  lock?: WalletLocked;
  lastStaking?: LastStakingInfo;
  mode?: 'light' | 'dark';
  showDappBetaModal?: boolean;
  analyticsAccepted?: AnalyticsConsentStatus;
  isForgotPasswordFlow?: boolean;
  analyticsUserId?: string;
}
