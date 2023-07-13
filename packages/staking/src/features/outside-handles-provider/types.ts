import { TxBuilder } from '@cardano-sdk/tx-construction';
import { StakePoolSortOptions, Wallet } from '@lace/cardano';

export type LegacySelectedStakePoolDetails = {
  delegators: number | string;
  description: string;
  hexId: string;
  id: string;
  logo?: string;
  margin: number | string;
  name: string;
  owners: string[];
  saturation: number | string;
  stake: { number: string; unit?: string };
  ticker: string;
  apy: number | string;
  status: Wallet.Cardano.StakePool['status'];
  fee: number | string;
  contact: Wallet.Cardano.PoolContactData;
};

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
  backgroundServiceAPIContextSetWalletPassword: (password?: Uint8Array) => void;
  balancesBalance: Balance;
  stakingRewards: {
    totalRewards: BigInt | number;
    lastReward: BigInt | number;
  };
  delegationDetails: Wallet.Cardano.StakePool;
  delegationStoreSelectedStakePoolDetails?: LegacySelectedStakePoolDetails;
  delegationStoreSelectedStakePool?: Wallet.Cardano.StakePool;
  delegationStoreSetDelegationTxBuilder: (txBuilder?: TxBuilder) => void;
  delegationStoreSetSelectedStakePool: (pool: Wallet.Cardano.StakePool & { logo?: string }) => void;
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
  password?: string;
  passwordRemovePassword: () => void;
  submittingStateSetIsRestaking: (param: boolean) => void;
  walletStoreGetKeyAgentType: () => string;
  walletStoreInMemoryWallet: Wallet.ObservableWallet;
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
};
