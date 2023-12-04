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
  SPENDABLE = 'spendable'
}

export type Cip30SignTxSummary = {
  fee: string;
  outputs: {
    coins: string;
    recipient: string;
    assets?: Cip30SignTxAssetItem[];
  }[];
  type: 'Send' | 'Mint';
  mintedAssets?: Cip30SignTxAssetItem[];
  burnedAssets?: Cip30SignTxAssetItem[];
};

export type Cip30SignTxAssetItem = {
  name: string;
  amount: string;
  ticker?: string;
};
export enum WalletManagerProviderTypes {
  CARDANO_SERVICES_PROVIDER = 'cardano-services-provider'
}
// Exclude Sanchonet until in main branch
export type ChainName = keyof Omit<typeof Cardano.ChainIds, 'Sanchonet'>;

export interface CreateHardwareWalletArgs {
  deviceConnection: DeviceConnection;
  name: string;
  accountIndex: number;
  activeChainId: Cardano.ChainId;
}
