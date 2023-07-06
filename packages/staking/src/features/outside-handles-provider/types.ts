import { TxBuilder } from '@cardano-sdk/tx-construction';
import { Wallet } from '@lace/cardano';

export type SelectedStakePoolDetails = {
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

type Balance = {
  total: WalletBalance;
  available: WalletBalance;
};

export type OutsideHandlesContextValue = {
  backgroundServiceAPIContextSetWalletPassword: (password?: Uint8Array) => void;
  balancesBalance: Balance;
  stakingRewards: {
    totalRewards: BigInt | number;
    lastReward: BigInt | number;
  };
  delegationDetails: Wallet.Cardano.StakePool;
  delegationStoreSelectedStakePoolDetails?: SelectedStakePoolDetails;
  delegationStoreSetDelegationTxBuilder: (txBuilder?: TxBuilder) => void;
  delegationStoreSetSelectedStakePool: (pool: Wallet.Cardano.StakePool & { logo: string }) => void;
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
};
