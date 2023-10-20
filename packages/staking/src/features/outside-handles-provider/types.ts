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

export enum PostHogAction {
  StakingClick = 'staking | staking | click',
  StakingStakePoolClick = 'staking | staking | stake pool | click',
  StakingStakePoolDetailStakeOnThisPoolClick = 'staking | stake pool detail | stake on this pool | click',
  StakingSwitchingPoolFineByMeClick = 'staking | switching pool? | fine by me | click',
  StakingManageDelegationStakePoolConfirmationNextClick = 'staking | manage delegation | stake pool confirmation | next | click',
  StakingManageDelegationPasswordConfirmationConfirmClick = 'staking | manage delegation | password confirmation | confirm | click',
  StakingManageDelegationHurrayView = 'staking | manage delegation | hurray! | view',
  StakingManageDelegationHurrayCloseClick = 'staking | manage delegation | hurray! | close | click',
  StakingManageDelegationHurrayXClick = 'staking | manage delegation | hurray! | x | click',
  StakingManageDelegationSomethingWentWrongBackClick = 'staking | manage delegation | something went wrong | back | click',
  StakingManageDelegationSomethingWentWrongCancelClick = 'staking | manage delegation | something went wrong | cancel | click',
  StakingManageDelegationSomethingWentWrongXClick = 'staking | manage delegation | something went wrong | x | click',
  StakingAboutStakingFaqClick = 'staking | about staking | faq | click',
  StakingMultiDelegationDedicatedBlogClick = 'staking | multi-delegation | dedicated blog | click',
  StakingMultiDelegationGotItClick = 'staking | multi-delegation | got it | click',
  StakingOverviewClick = 'staking | overview | click',
  StakingOverviewCopyAddressClick = 'staking | overview | copy address | click',
  StakingOverviewManageClick = 'staking | overview | manage | click',
  StakingOverviewBrowseStakePoolsHereClick = 'staking | overview | browse stake pools | here | click',
  StakingOverviewSelectOneOrMorePoolsToStakeToHereClick = 'staking | overview | select one or more pools to stake to | here | click',
  StakingBrowsePoolsClick = 'staking | browse pools | click',
  StakingBrowsePoolsSearchClick = 'staking | browse pools | search | click',
  StakingBrowsePoolsPoolNameClick = 'staking | browse pools | pool name | click',
  StakingBrowsePoolsRosClick = 'staking | browse pools | ros | click',
  StakingBrowsePoolsSaturationClick = 'staking | browse pools | saturation | click',
  StakingBrowsePoolsStakePoolDetailClick = 'staking | browse pools | stake pool detail | click',
  StakingBrowsePoolsStakePoolDetailStakeAllOnThisPoolClick = 'staking | browse pools | stake pool detail | stake all on this pool | click',
  StakingBrowsePoolsStakePoolDetailAddStakingPoolClick = 'staking | browse pools | stake pool detail | add staking pool | click',
  StakingBrowsePoolsStakePoolDetailUnselectPoolClick = 'staking | browse pools | stake pool detail | unselect pool | click',
  StakingBrowsePoolsStakeClick = 'staking | browse pools | stake | click',
  StakingBrowsePoolsUnselectClick = 'staking | browse pools | unselect | click',
  StakingBrowsePoolsClearClick = 'staking | browse pools | clear | click',
  StakingBrowsePoolsNextClick = 'staking | browse pools | next | click',
  StakingBrowsePoolsManageDelegationAddStakePoolClick = 'staking | browse pools | manage delegation | add stake pool | click',
  StakingBrowsePoolsManageDelegationRemovePoolFromPortfolioClick = 'staking | browse pools | manage delegation | remove pool from portfolio | click',
  StakingBrowsePoolsManageDelegationConfirmClick = 'staking | browse pools | manage delegation | confirm | click',
  StakingChangingStakingPreferencesFineByMeClick = 'staking | changing staking preferences? | fine by me | click',
  StakingChangingStakingPreferencesCancelClick = 'staking | changing staking preferences? | cancel | click',
  StakingManageDelegationDelegationRatioSliderMinusClick = 'staking | manage delegation | delegation ratio slider | - | click',
  StakingManageDelegationDelegationRatioSliderPlusClick = 'staking | manage delegation | delegation ratio slider | + | click',
  StakingManageDelegationDelegationRatioSliderVolumePinDrag = 'staking | manage delegation | delegation ratio slider | volume pin | drag',
  StakingManageDelegationDelegationRatioSliderRatioNumberClick = 'staking | manage delegation | delegation ratio slider | ratio number | click',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostHogProperty = string | boolean | Record<string, any> | Array<Record<string, any>>;
export type PostHogProperties = Record<string, PostHogProperty>;
export type AnalyticsTracker = {
  sendEventToPostHog: (action: PostHogAction, properties?: PostHogProperties) => Promise<void>;
};

export type OutsideHandlesContextValue = {
  analytics: AnalyticsTracker;
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
