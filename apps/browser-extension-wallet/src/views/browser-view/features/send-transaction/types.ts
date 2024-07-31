/* eslint-disable camelcase */
import { CardanoTxOut, TxMinimumCoinQuantity } from '../../../../types';
import { Wallet } from '@lace/cardano';
import { HandleResolution, Serialization } from '@cardano-sdk/core';

export enum Sections {
  FORM = 'FORM',
  IMPORT_SHARED_WALLET_TRANSACTION_JSON = 'IMPORT_SHARED_WALLET_TRANSACTION_JSON',
  SUMMARY = 'SUMMARY',
  CONFIRMATION = 'CONFIRMATION',
  SUCCESS_TX = 'SUCCESS_TX',
  COSIGNED_TX = 'COSIGNED_TX',
  FAIL_TX = 'FAIL_TX',
  UNAUTHORIZED_TX = 'UNAUTHORIZED_TX',
  ADDRESS_LIST = 'ADDRESS_LIST',
  ADDRESS_FORM = 'ADDRESS_FORM',
  ASSET_PICKER = 'ASSET_PICKER',
  ADDRESS_CHANGE = 'ADDRESS_CHANGE'
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
  tx?: Wallet.UnwitnessedTx;
  uiTx?: {
    hash: Wallet.Cardano.TransactionId;
    outputs: Set<Wallet.Cardano.TxOut & { handleResolution?: HandleResolution }>;
    fee: Wallet.Cardano.Lovelace;
    handleResolutions?: HandleResolution[];
    validityInterval?: Wallet.Cardano.ValidityInterval;
  };
  importedSharedWalletTx?: Serialization.Transaction;
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
