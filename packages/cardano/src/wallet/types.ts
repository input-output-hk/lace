import { Cardano, Paginated } from '@cardano-sdk/core';
import { LedgerKeyAgent } from '@cardano-sdk/hardware-ledger';
import * as KeyManagement from '../../../../node_modules/@cardano-sdk/key-management/dist/cjs';

export type DeviceConnection = LedgerKeyAgent['deviceConnection'] | boolean;

export type HardwareWallets = Exclude<KeyManagement.KeyAgentType, KeyManagement.KeyAgentType.InMemory>;

export type StakePoolSearchResults = Paginated<Cardano.StakePool>;

export type DappInfo = {
  name: string;
  logo: string;
  url: string;
};

export enum TransactionStatus {
  SUCCESS = 'success',
  PENDING = 'sending',
  ERROR = 'error',
  SPENDABLE = 'spendable'
}

export type Cip30SignTxSummary = {
  fee: string;
  outputs: {
    coins: string;
    recipient: string;
    assets?: Cip30SignTxAssetItem[];
  }[];
  type: 'Send' | 'Mint' | 'Burn';
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

export interface CreateHardwareWalletArgs {
  deviceConnection: DeviceConnection;
  name: string;
  accountIndex: number;
  activeChainId: Cardano.ChainId;
}
