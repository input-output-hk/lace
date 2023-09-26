import { TxBuilder } from '@cardano-sdk/tx-construction';
import { StakePoolSortOptions, Wallet } from '@lace/cardano';
import { AssetActivityListProps } from '@lace/core';

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

export interface IBlockchainProvider {
  stakePoolProvider: Wallet.StakePoolProvider;
  assetProvider: Wallet.AssetProvider;
  txSubmitProvider: Wallet.TxSubmitProvider;
  networkInfoProvider: Wallet.NetworkInfoProvider;
  utxoProvider: Wallet.UtxoProvider;
  chainHistoryProvider: Wallet.ChainHistoryProvider;
  rewardsProvider: Wallet.RewardsProvider;
}

export type StakingRewards = {
  totalRewards: BigInt | number;
  lastReward: BigInt | number;
};

export type OutsideHandlesContextValue = {
  backgroundServiceAPIContextSetWalletPassword: (password?: Uint8Array) => void;
  expandStakingView?: () => void;
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
  walletStoreGetKeyAgentType: () => string;
  walletStoreInMemoryWallet: Wallet.ObservableWallet;
  walletStoreWalletActivities: AssetActivityListProps[];
  walletStoreWalletUICardanoCoin: Wallet.CoinId;
  walletManagerExecuteWithPassword: <T>(
    password: string,
    promiseFn: () => Promise<T>,
    cleanPassword?: boolean
  ) => Promise<T>;
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
  walletAddress: string;
  currentChain: Wallet.Cardano.ChainId;
};
