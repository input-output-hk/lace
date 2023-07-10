import { CardanoTxOut, TxMinimumCoinQuantity } from '../../../../types';
import { Wallet } from '@lace/cardano';
import { Handle } from '@cardano-sdk/core';

export enum Sections {
  FORM = 'form',
  SUMMARY = 'summary',
  CONFIRMATION = 'confirmation',
  SUCCESS_TX = 'success_tx',
  FAIL_TX = 'fail_tx',
  ADDRESS_LIST = 'address_list',
  ADDRESS_FORM = 'address_form',
  ASSET_PICKER = 'asset_picker'
}

export enum FormOptions {
  SIMPLE = 'simple',
  ADVANCED = 'advanced'
}

export type CardanoOutput = {
  address?: CardanoTxOut['address'];
  value?: { coins: string; assets?: Map<Wallet.Cardano.AssetId, string> };
  datum?: CardanoTxOut['datum'];
};

export type OutputsMap = Map<string, CardanoOutput>;

export interface BuiltTxData {
  totalMinimumCoins?: TxMinimumCoinQuantity;
  tx?: Wallet.UnsignedTx;
  uiTx?: {
    hash: Wallet.Cardano.TransactionId;
    outputs: Set<Wallet.Cardano.TxOut & { handle?: Handle }>;
    fee: Wallet.Cardano.Lovelace;
  };
  error?: string;
  reachedMaxAmountList?: (string | Wallet.Cardano.AssetId)[];
}

export type SpentBalances = Record<string, string>;

export interface AssetInfo {
  id: string;
  value?: string;
  compactValue?: string;
  displayValue?: string;
}

export type OutputRow = {
  address: string;
  handle?: string;
  assets: Array<AssetInfo>;
};

export type OutputList = Record<string, OutputRow>;
