import { SetState, State, GetState, StoreApi } from 'zustand';
import { Wallet, StakePoolSortOptions } from '@lace/cardano';
import { AssetActivityListProps, TransactionType } from '@lace/core';
import { PriceResult } from '../hooks';
import {
  NetworkInformation,
  WalletInfo,
  WalletLocked,
  TxDirection,
  TransactionDetail,
  WalletUI,
  NetworkConnectionStates,
  CurrencyInfo
} from '../types';
import { FetchWalletActivitiesProps, FetchWalletActivitiesReturn, IBlockchainProvider } from './slices';
import { IAssetDetails } from '@src/views/browser-view/features/assets/types';
import { TokenInfo } from '@src/utils/get-assets-information';
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { Reward } from '@cardano-sdk/core';
import { EpochNo } from '@cardano-sdk/core/dist/cjs/Cardano';

export enum StateStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

export interface ZustandHandlers<T extends State, CustomSetState = SetState<T>> {
  set?: CustomSetState;
  get?: GetState<T>;
  api?: StoreApi<T>;
}

/**
 * A function to create a slice of the store's state.
 *
 * @template StoreState - Type of the state managed by the slice.
 * @template ReturnSlice - Type of the slice that the creator function returns.
 * @template Params - _Optional._ Type of additional parameters required by the slice creator.
 * @template CustomSetState - _Optional._ Type of the state that the slice can set.
 *
 * @param handlers - Zustand handlers to interact with the store's state.
 * @param params - _Optional._ Additional parameters required by the slice creator.
 *
 * @returns The created slice
 */
export type SliceCreator<
  StoreState extends State,
  ReturnSlice,
  Params = void,
  CustomSetState extends State = StoreState
> = (handlers: ZustandHandlers<StoreState, SetState<CustomSetState>>, params: Params) => ReturnSlice;

// ======= STORE SLICES ========

export interface WalletActivitiesSlice {
  walletActivities?: AssetActivityListProps[];
  firstDelegationTxId?: string;
  activitiesCount: number;
  walletActivitiesStatus: StateStatus;
  getWalletActivitiesObservable: (payload: FetchWalletActivitiesProps) => Promise<FetchWalletActivitiesReturn>;
}

export interface NetworkSlice {
  networkInfo?: NetworkInformation;
  networkStateStatus: StateStatus;
  fetchNetworkInfo: () => Promise<void>;
}

export interface StakePoolSearchSlice {
  stakePoolSearchResults: Wallet.StakePoolSearchResults & {
    skip?: number;
    limit?: number;
    searchQuery?: string;
    searchFilters?: StakePoolSortOptions;
  };
  stakePoolSearchResultsStatus: StateStatus;
  selectedStakePool: Wallet.Cardano.StakePool;
  fetchStakePools: (props: {
    searchString: string;
    skip?: number;
    limit?: number;
    sort?: StakePoolSortOptions;
  }) => Promise<void>;
  resetStakePools: () => void;
  setSelectedStakePool: (pool: Wallet.Cardano.StakePool) => void;
}

// TODO: add support for custom nodes/environments [LW-3727]
export type EnvironmentTypes = Wallet.ChainName;

export interface WalletInfoSlice {
  walletInfo?: WalletInfo | undefined;
  setWalletInfo: (info?: WalletInfo) => void;
  keyAgentData?: Wallet.KeyManagement.SerializableKeyAgentData | undefined;
  setKeyAgentData: (keyAgentData?: Wallet.KeyManagement.SerializableKeyAgentData) => void;
  inMemoryWallet: Wallet.ObservableWallet | undefined;
  cardanoWallet: Wallet.CardanoWallet | undefined;
  walletManagerUi: WalletManagerUi | undefined;
  addressesDiscoveryCompleted: boolean;
  setAddressesDiscoveryCompleted: (addressesDiscoveryCompleted: boolean) => void;
  setCardanoWallet: (wallet?: Wallet.CardanoWallet) => void;
  setWalletManagerUi: (walletManager: WalletManagerUi) => void;
  currentChain?: Wallet.Cardano.ChainId;
  setCurrentChain: (chain: Wallet.ChainName) => void;
  environmentName?: EnvironmentTypes;
  getKeyAgentType: () => string;
}

export interface LockSlice {
  isWalletLocked: () => boolean;
  walletLock: WalletLocked | undefined;
  setWalletLock: (lock: WalletLocked) => void;
  resetWalletLock: () => void;
}

export interface UISlice {
  walletUI: WalletUI | undefined;
  setCardanoCoin: (chainId: Wallet.Cardano.ChainId) => void;
  setNetworkConnection: (networkConnection: NetworkConnectionStates) => void;
  setBalancesVisibility: (visible: boolean) => void;
}

export interface TransactionDetailSlice {
  transactionDetail?: {
    type: TransactionType;
    status: Wallet.TransactionStatus;
    direction: TxDirection;
    tx?: Wallet.Cardano.HydratedTx | Wallet.Cardano.Tx;
    epochRewards?: { spendableEpoch: EpochNo; spendableDate: Date; rewards: Reward[] };
  } & (
    | {
        type: 'rewards';
        epochRewards: NonNullable<unknown>;
      }
    | {
        tx: NonNullable<unknown>;
      }
  );
  fetchingTransactionInfo: boolean;
  setTransactionDetail: (params: {
    tx?: Wallet.Cardano.HydratedTx | Wallet.Cardano.Tx;
    epochRewards?: { spendableEpoch: EpochNo; spendableDate: Date; rewards: Reward[] };
    direction: TxDirection;
    status?: Wallet.TransactionStatus;
    type?: TransactionType;
  }) => void;
  getTransactionDetails: (params: {
    coinPrices: PriceResult;
    fiatCurrency: CurrencyInfo;
  }) => Promise<TransactionDetail>;
  resetTransactionState: () => void;
}

export interface AssetDetailsSlice {
  assetDetails?: IAssetDetails;
  setAssetDetails: (asset?: IAssetDetails) => void;
  getAssets: (assetIds: Wallet.Cardano.AssetId[]) => Promise<TokenInfo>;
}

export interface BlockchainProviderSlice {
  blockchainProvider: IBlockchainProvider;
  setBlockchainProvider: (chain: Wallet.ChainName) => void;
}

// ===== WALLET STORE =====

export type WalletStore = WalletActivitiesSlice &
  NetworkSlice &
  StakePoolSearchSlice &
  LockSlice &
  WalletInfoSlice &
  TransactionDetailSlice &
  AssetDetailsSlice &
  UISlice &
  BlockchainProviderSlice;
