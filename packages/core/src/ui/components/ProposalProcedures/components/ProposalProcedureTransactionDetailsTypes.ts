export interface TxDetails {
  deposit?: string;
  rewardAccount?: string;
}

export interface Translations {
  title: string;
  txType: string;
  deposit?: string;
  rewardAccount?: string;
}

export interface TranslationsWithDepositAndRewardAccount extends Translations {
  deposit: string;
  rewardAccount: string;
}
