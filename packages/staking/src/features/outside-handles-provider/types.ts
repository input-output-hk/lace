import { TxBuilder } from '@cardano-sdk/tx-construction';
import { Password } from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';
import { AssetActivityListProps, SignPolicy } from '@lace/core';
import { StakePoolSortOptions, StakingBrowserPreferences } from 'features/BrowsePools';
import type { IAnalyticsTracker } from '@lace/common';

type WalletBalance = {
  coinBalance: string;
  fiatBalance: string | undefined;
};

export type Balance = {
  total: WalletBalance;
  available: WalletBalance;
};

export interface CurrencyInfo {
  code: string;
  symbol: string;
}

export interface SubmittingState {
  isRestaking: boolean;
  setIsRestaking: (param: boolean) => void;
  setSubmitingTxState: (args: { isSubmitingTx?: boolean; isPasswordValid?: boolean }) => void;
  isSubmitingTx?: boolean;
  isPasswordValid?: boolean;
}

export interface PasswordHook {
  password?: Partial<Password>;
  setPassword: (pass: Partial<Password>) => void;
  clearSecrets: () => void;
}

export enum StateStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
}

export interface IBlockchainProvider {
  stakePoolProvider: Wallet.StakePoolProvider;
  assetProvider: Wallet.AssetProvider;
  txSubmitProvider: Wallet.TxSubmitProvider;
  networkInfoProvider: Wallet.NetworkInfoProvider;
  utxoProvider: Wallet.UtxoProvider;
  chainHistoryProvider: Wallet.ChainHistoryProvider;
  rewardsProvider: Wallet.RewardsProvider;
}

export type OutsideHandlesContextValue = {
  analytics: IAnalyticsTracker;
  stakingBrowserPreferencesPersistence: StakingBrowserPreferences;
  setStakingBrowserPreferencesPersistence: (preferences: StakingBrowserPreferences) => void;
  walletManagerExecuteWithPassword: <T>(action: () => Promise<T>, password?: string) => Promise<T>;
  expandStakingView?: (urlSearchParams?: string) => void;
  balancesBalance?: Balance;
  delegationStoreSetDelegationTxBuilder: (txBuilder?: TxBuilder) => void;
  delegationStoreSetDelegationTxFee: (fee?: string) => void;
  delegationStoreDelegationTxFee?: string;
  delegationStoreDelegationTxBuilder?: TxBuilder;
  fetchCoinPricePriceResult: {
    cardano: {
      price: number;
      priceVariationPercentage24h: number;
    };
  };
  openExternalLink: (href: string) => void;
  password: PasswordHook;
  submittingState: SubmittingState;
  walletStoreWalletType: string;
  walletStoreInMemoryWallet: Wallet.ObservableWallet;
  walletStoreWalletActivities: AssetActivityListProps[];
  walletStoreWalletActivitiesStatus: StateStatus;
  walletStoreWalletUICardanoCoin: Wallet.CoinId;
  walletStoreStakePoolSearchResults: Wallet.StakePoolSearchResults & {
    skip?: number;
    limit?: number;
    searchQuery?: string;
    searchFilters?: StakePoolSortOptions;
  };
  walletStoreStakePoolSearchResultsStatus: StateStatus;
  walletStoreFetchStakePools: (props: {
    searchString: string;
    skip?: number;
    limit?: number;
    sort?: StakePoolSortOptions;
  }) => Promise<void>;
  walletStoreResetStakePools?: () => void;
  walletStoreBlockchainProvider: IBlockchainProvider;
  currencyStoreFiatCurrency: CurrencyInfo;
  compactNumber: (value: number | string, decimal?: number) => string;
  multidelegationFirstVisit: boolean;
  triggerMultidelegationFirstVisit: () => void;
  multidelegationDAppCompatibility: boolean;
  triggerMultidelegationDAppCompatibility: () => void;
  multidelegationFirstVisitSincePortfolioPersistence: boolean;
  triggerMultidelegationFirstVisitSincePortfolioPersistence: () => void;
  walletAddress: string;
  walletName: string;
  currentChain: Wallet.Cardano.ChainId;
  isMultidelegationSupportedByDevice: (walletType: string) => Promise<boolean>;
  isCustomSubmitApiEnabled: boolean;
  isSharedWallet: boolean;
  signPolicy: SignPolicy;
  sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex | undefined;
  coSigners: { sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex; name: string }[];
  setIsRegisterAsDRepModalVisible: (isVisible: boolean) => void;
  useRewardAccountsData: () => {
    areAllRegisteredStakeKeysWithoutVotingDelegation: boolean;
    poolIdToRewardAccountMap: Map<string, Wallet.Cardano.RewardAccountInfo>;
  };
};
