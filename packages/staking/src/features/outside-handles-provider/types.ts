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

export type OutsideHandlesContextValue = {
  backgroundServiceAPIContextSetWalletPassword: (password?: Uint8Array) => void;
  delegationDetails: Wallet.Cardano.StakePool;
  delegationStoreSelectedStakePoolDetails?: SelectedStakePoolDetails;
  delegationStoreSetDelegationTxBuilder: (txBuilder?: TxBuilder) => void;
  delegationStoreSetSelectedStakePool: (pool: Wallet.Cardano.StakePool & { logo: string }) => void;
  openExternalLink: (href: string) => void;
  password?: string;
  passwordRemovePassword: () => void;
  submittingStateSetIsRestaking: (param: boolean) => void;
  walletStoreGetKeyAgentType: () => string;
  walletStoreInMemoryWallet: Wallet.ObservableWallet;
  walletStoreWalletUICardanoCoin: Wallet.CoinId;
};
