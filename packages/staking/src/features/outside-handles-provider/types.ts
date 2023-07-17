import { TxBuilder } from '@cardano-sdk/tx-construction';
import { Wallet } from '@lace/cardano';

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

export interface SubmittingState {
  isRestaking: boolean;
  setIsRestaking: (param: boolean) => void;
  setSubmitingTxState: (args: { isSubmitingTx?: boolean; isPasswordValid?: boolean }) => void;
  isSubmitingTx?: boolean;
  isPasswordValid?: boolean;
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
  delegationStoreSetSelectedStakePool: (pool: Wallet.Cardano.StakePool & { logo: string }) => void;
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
  passwordSetPassword: (password: string) => void;
  passwordRemovePassword: () => void;
  submittingState: SubmittingState;
  walletStoreGetKeyAgentType: () => string;
  walletStoreInMemoryWallet: Wallet.ObservableWallet;
  walletStoreWalletUICardanoCoin: Wallet.CoinId;
  currencyStoreFiatCurrency: CurrencyInfo;
  executeWithPassword: <T>(password: string, promiseFn: () => Promise<T>, cleanPassword?: boolean) => Promise<T>;
};
