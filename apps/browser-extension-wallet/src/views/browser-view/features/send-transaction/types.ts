import { CardanoTxOut, TxMinimumCoinQuantity, CardanoTxBuild } from '../../../../types';
import { Wallet } from '@lace/cardano';

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
  tx?: CardanoTxBuild;
  auxiliaryData?: Wallet.Cardano.AuxiliaryData;
  error?: string;
  reachedMaxAmountList?: (string | Wallet.Cardano.AssetId)[];
}

// ====== Send sections types ======

export interface SectionConfig {
  currentSection: Sections;
  nextSection?: Sections;
  prevSection?: Sections;
}

export type SimpleSectionsConfig = Partial<Record<Sections, SectionConfig>>;

export type SpentBalances = Record<string, string>;

export interface AssetInfo {
  id: string;
  value?: string;
  compactValue?: string;
  displayValue?: string;
}

export type OutputRow = {
  address: string;
  assets: Array<AssetInfo>;
};

export type OutputList = Record<string, OutputRow>;
