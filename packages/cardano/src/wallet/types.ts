import { Cardano, Paginated } from '@cardano-sdk/core';
import type { LedgerKeyAgent } from '@cardano-sdk/hardware-ledger';
import { WalletType } from '@cardano-sdk/web-extension';

export type LedgerConnection = LedgerKeyAgent['deviceConnection'];

export type DeviceConnection = LedgerConnection | boolean;

export type HardwareWallets = WalletType.Trezor | WalletType.Ledger;

export type HardwareWalletConnection =
  | {
      type: WalletType.Trezor;
    }
  | {
      type: WalletType.Ledger;
      value: LedgerConnection;
    };

export type StakePoolSearchResults = Paginated<Cardano.StakePool>;

export type DappInfo = {
  name: string;
  logo: string;
  url: string;
};

export type CoinId = {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
};

export enum TransactionStatus {
  SUCCESS = 'success',
  PENDING = 'sending',
  ERROR = 'error',
  SPENDABLE = 'spendable',
  AWAITING_COSIGNATURES = 'awaiting_cosignatures'
}

export enum Cip30TxType {
  Send = 'Send',
  Mint = 'Mint',
  Burn = 'Burn',
  DRepRegistration = 'DRepRegistration',
  DRepRetirement = 'DRepRetirement',
  DRepUpdate = 'DRepUpdate',
  VoteDelegation = 'VoteDelegation',
  VotingProcedures = 'VotingProcedures',
  VoteRegistrationDelegation = 'VoteRegistrationDelegation',
  StakeRegistrationDelegation = 'StakeRegistrationDelegation',
  StakeVoteDelegationRegistration = 'StakeVoteDelegationRegistration',
  StakeVoteDelegation = 'StakeVoteDelegation',
  ProposalProcedures = 'ProposalProcedures'
}

export type Cip30SignTxOutput = {
  coins: string;
  recipient: string;
  assets?: Cip30SignTxAssetItem[];
};

export type Cip30SignTxSummary = {
  fee: string;
  outputs: Cip30SignTxOutput[];
  type: Cip30TxType;
  mintedAssets?: Cip30SignTxAssetItem[];
  burnedAssets?: Cip30SignTxAssetItem[];
  collateral?: string;
};

export type Cip30SignTxAssetItem = {
  name: string;
  amount: string;
  ticker?: string;
};
export enum WalletManagerProviderTypes {
  CARDANO_SERVICES_PROVIDER = 'cardano-services-provider'
}

export type ChainName = keyof typeof Cardano.ChainIds;
