/* eslint-disable camelcase */
import { CardanoTxOut, TxMinimumCoinQuantity } from '../../../../types';
import { Wallet } from '@lace/cardano';
import { Handle, HandleResolution } from '@cardano-sdk/core';

export enum Sections {
  FORM = 'form',
  SUMMARY = 'summary',
  CONFIRMATION = 'confirmation',
  SUCCESS_TX = 'success_tx',
  FAIL_TX = 'fail_tx',
  ADDRESS_LIST = 'address_list',
  ADDRESS_FORM = 'address_form',
  ASSET_PICKER = 'asset_picker',
  ADDRESS_CHANGE = 'address_change'
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
  handleResolution?: HandleResolution;
  handleStatus?: {
    hasHandleOwnershipChanged?: boolean;
    isVerified?: boolean;
  };
  assets: Array<AssetInfo>;
};

export type OutputList = Record<string, OutputRow>;

export enum TemporaryTransactionDataKeys {
  TEMP_ADDRESS = 'tempAddress',
  TEMP_OUTPUTS = 'tempOutputs',
  TEMP_SOURCE = 'tempSource'
}

export interface TemporaryTransactionData {
  [TemporaryTransactionDataKeys.TEMP_ADDRESS]: string;
  [TemporaryTransactionDataKeys.TEMP_OUTPUTS]: AssetInfo[];
  [TemporaryTransactionDataKeys.TEMP_SOURCE]: 'popup' | 'hardware-wallet';
}

export enum SendFlowTriggerPoints {
  NFTS = 'nfts page',
  SEND_BUTTON = 'send button',
  TOKENS = 'tokens page'
}

export type SendFlowAnalyticsProperties = {
  trigger_point: SendFlowTriggerPoints;
  // TODO: add rest of the porpeties (LW-7711)
};

export interface TokenAnalyticsProperties {
  id: string;
  name?: string;
  ticker?: string;
  amount: string;
}
