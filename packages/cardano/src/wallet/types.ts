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

export type Cip30SignTxAssetItem = {
  name: string;
  amount: string;
  ticker?: string;
};

export type ChainName = keyof typeof Cardano.ChainIds;
