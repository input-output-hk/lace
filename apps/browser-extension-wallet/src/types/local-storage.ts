import { Wallet } from '@lace/cardano';
import { EnhancedAnalyticsOptInStatus, TxCreationType } from '../providers/AnalyticsProvider/analyticsTracker/types';
import { StakingBrowserPreferences } from '@lace/staking';
import { currencyCode } from '@providers/currency/constants';
import { ADASymbols } from '@src/utils/constants';

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
  code: currencyCode | ADASymbols;
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

export interface UnconfirmedTransaction {
  id: string;
  creationType: TxCreationType;
  date: string;
}

export type UnconfirmedTransactions = UnconfirmedTransaction[];

export interface ILocalStorage {
  currency?: CurrencyInfo;
  appSettings?: AppSettings;
  wallet?: WalletStorage;
  keyAgentData?: Wallet.KeyManagement.SerializableKeyAgentData;
  userInfo?: UserInfo;
  lock?: WalletLocked;
  lastStaking?: LastStakingInfo;
  mode?: 'light' | 'dark';
  hideBalance?: boolean;
  analyticsStatus?: EnhancedAnalyticsOptInStatus;
  isForgotPasswordFlow?: boolean;
  multidelegationFirstVisit?: boolean;
  multidelegationFirstVisitSincePortfolioPersistence?: boolean;
  unconfirmedTransactions: UnconfirmedTransaction[];
  stakingBrowserPreferences: StakingBrowserPreferences;
  showPinExtension?: boolean;
  showMultiAddressModal?: boolean;
}
