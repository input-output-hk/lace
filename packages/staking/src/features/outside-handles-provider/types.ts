import { TxBuilder } from '@cardano-sdk/tx-construction';
import { Wallet } from '@lace/cardano';
import { AssetActivityListProps } from '@lace/core';
import { BrowsePoolsView, StakePoolSortOptions } from 'features/BrowsePools/types';
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
  password?: string;
  setPassword: (pass: string) => void;
  removePassword: () => void;
}

export enum StateStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
}

export interface StakingBrowserPreferences {
  sortOptions: StakePoolSortOptions;
  searchQuery?: string;
  poolsView: BrowsePoolsView;
  selectedPoolsIds: string[];
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
  walletStoreNetworkInfo?: {
    nextEpochIn: Date;
    currentEpochIn: Date;
    currentEpoch: string;
    stakePoolsAmount: string;
    totalStakedPercentage: string | number;
    totalStaked: { number: string; unit?: string };
  };
  walletStoreFetchNetworkInfo: () => Promise<void>;
  walletStoreBlockchainProvider: IBlockchainProvider;
  currencyStoreFiatCurrency: CurrencyInfo;
  compactNumber: (value: number | string, decimal?: number) => string;
  multidelegationFirstVisit: boolean;
  triggerMultidelegationFirstVisit: () => void;
  multidelegationFirstVisitSincePortfolioPersistence: boolean;
  triggerMultidelegationFirstVisitSincePortfolioPersistence: () => void;
  walletAddress: string;
  currentChain: Wallet.Cardano.ChainId;
  isMultidelegationSupportedByDevice: (walletType: string) => Promise<boolean>;
};
