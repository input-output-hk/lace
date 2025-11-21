export interface BlockfrostRequestOptions {
  headers?: Record<string, string>;
  body?: string;
  signal?: Readonly<AbortSignal>;
}

export interface BlockfrostResponse {
  status_code?: number;
  error?: object;
  message?: string;
}

export interface Transaction {
  txHash: string;
  txIndex: number;
  blockHeight: number;
}

export interface TransactionResponse {
  tx_hash: string;
  tx_index: string;
  block_height: string;
  block_time: number;
}

export interface History {
  confirmed: string[];
  details: Record<string, TransactionDetail>;
}

export interface TransactionDetail {
  block: BlockDetailResponse;
  info: TransactionInfo;
  metadata: {
    json_metadata: unknown[] | string;
    label: string;
  }[];
  utxos: UtxosResponse;
}

export type BlockDetailResponse = BlockfrostResponse & {
  block_vrf: string;
  confirmations: number;
  epoch: number;
  epoch_slot: number;
  fees: string;
  hash: string;
  height: number;
  next_block: string;
  op_cert: string;
  op_cert_counter: string;
  output: string;
  previous_block: string;
  size: number;
  slot: number;
  slot_leader: string;
  time: number;
  tx_count: number;
};

export type TransactionInfoResponse = BlockfrostResponse & {
  hash: string;
  block: string;
  block_height: number;
  block_time: number;
  slot: number;
  index: number;
  output_amount: OutputAmount[];
  fees: string;
  deposit: string;
  size: number;
  invalid_before: number | null;
  invalid_hereafter: number | string | null;
  utxo_count: number;
  withdrawal_count: number;
  mir_cert_count: number;
  delegation_count: number;
  stake_cert_count: number;
  pool_update_count: number;
  pool_retire_count: number;
  asset_mint_or_burn_count: number;
  redeemer_count: number;
  valid_contract: boolean;
};

export interface TransactionInfo {
  asset_mint_or_burn_count: number;
  block: string;
  block_height: number;
  block_time: number;
  delegation_count: number;
  deposit: string;
  fees: string;
  hash: string;
  index: number;
  invalid_before?: string;
  invalid_hereafter?: string;
  mir_cert_count: number;
  output_amount: OutputAmount[];
  pool_retire_count: number;
  pool_update_count: number;
  redeemer_count: number;
  size: number;
  slot: number;
  stake_cert_count: number;
  utxo_count: number;
  valid_contract: boolean;
  withdrawal_count: number;
}

interface OutputAmount {
  quantity: string;
  unit: string;
}

export type MetadataResponse = BlockfrostResponse & {
  json_metadata: {
    msg: string[];
  };
  label: string;
};

export interface Utxo {
  hash: string;
  inputs: UtxoInput[];
  outputs: UtxoOutput[];
}

export type UtxosResponse = BlockfrostResponse & {
  inputs: UtxoInput[];
  outputs: UtxoOutput[];
};

export interface UtxoInput {
  address: string;
  amount: Amount[];
  collateral: boolean;
  data_hash?: string | null;
  inline_datum?: string | null;
  output_index: number;
  reference: boolean;
  reference_script_hash?: string | null;
  tx_hash: string;
}

export interface UtxoOutput {
  address: string;
  amount: Amount[];
  collateral: boolean;
  data_hash?: string | null;
  inline_datum?: string | null;
  output_index: number;
  reference_script_hash?: string | null;
}

export interface Amount {
  quantity: bigint;
  unit: string;
}

export interface Network {
  id: NetworkTypeMap;
  name: NetworkType;
  node: string;
  mainnetSubmit?: string;
  testnetSubmit?: string;
}

export enum NetworkType {
  MAINNET = 'mainnet',
  PREPROD = 'preprod',
  PREVIEW = 'preview',
  TESTNET = 'testnet',
}

export type NetworkTypeMap = Record<NetworkType, string>;

export interface Paginate {
  page: number;
  limit: number;
}

export type StakeAddressResponse = BlockfrostResponse & {
  stake_address: string; // Bech32 stake address
  active: boolean; // Registration state of an account
  active_epoch?: number | null; // Epoch of the most recent action - registration or deregistration
  controlled_amount: string; // Balance of the account in Lovelaces
  rewards_sum: string; // Sum of all rewards for the account in Lovelaces
  withdrawals_sum: string; // Sum of all the withdrawals for the account in Lovelaces
  reserves_sum: string; // Sum of all funds from reserves for the account in Lovelaces
  treasury_sum: string; // Sum of all funds from treasury for the account in Lovelaces
  withdrawable_amount: string; // Sum of available rewards that haven't been withdrawn yet for the account in Lovelaces
  pool_id?: string | null; // Bech32 pool ID that owns the account
};

export type StakeRewardAddressResponse = BlockfrostResponse & {
  active: boolean;
  active_epoch: number;
  controlled_amount: string;
  pool_id: string | null;
  reserves_sum: string;
  rewards_sum: string;
  stake_address: string;
  treasury_sum: string;
  withdrawable_amount: string;
  withdrawals_sum: string;
};

export type StakePoolMetadataResponse = BlockfrostResponse & {
  pool_id: string;
  hex: string;
  url: string;
  hash: string;
  ticker: string;
  name: string;
  description: string;
  homepage: string;
};

export interface StakePoolMetadata {
  active: boolean;
  rewards: string;
  homepage: string;
  poolId: string;
  ticker: string;
  description: string;
  name: string;
}

export enum SupportedCurrencies {
  USD = 'usd',
  ADA = 'ada',
  EUR = 'eur',
}
