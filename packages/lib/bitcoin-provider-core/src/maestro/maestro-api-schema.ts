/**
 * Individual soft‑fork entry in the `softforks` array
 */
export interface MaestroSoftfork {
  id: string;
  reject: { status: boolean };
  version: number;
}

/**
 * BIP‑9 soft‑fork deployment information
 */
export interface MaestroBip9SoftforkInfo {
  since: number;
  startTime: number;
  status: string;
  timeout: number;
}

/**
 * BIP‑9 soft‑fork deployments keyed by name
 */
export type MaestroBip9Softforks = Record<string, MaestroBip9SoftforkInfo>;

/**
 * Chain status data returned by the `/rpc/general/info` endpoint
 */
export interface MaestroChainStatusData {
  bestblockhash: string;
  bip9_softforks?: MaestroBip9Softforks;
  blocks: number;
  chain: string;
  chainwork: string;
  difficulty: number;
  headers: number;
  initialblockdownload: boolean;
  mediantime: number;
  pruned: boolean;
  size_on_disk: number;
  softforks: MaestroSoftfork[] | null;
  verificationprogress: number;
  warnings: string;
}

/**
 * Represents the scriptSig of a Bitcoin transaction input,
 * which contains the script assembly and hex representation.
 */
export interface MaestroScriptSig {
  asm: string;
  hex: string;
}

/**
 * Represents the scriptPubKey of a Bitcoin transaction output,
 * which contains information about the destination address,
 * script disassembly, and type.
 */
export interface MaestroScriptPubKey {
  address: string;
  asm: string;
  desc: string;
  hex: string;
  type: string;
}

/**
 * Base interface for Bitcoin transaction inputs (vin),
 * which can be either coinbase or regular inputs.
 */
export interface MaestroVinBase {
  address?: string;
  scriptSig: MaestroScriptSig;
  script_type: string;
  sequence: number;
  txinwitness?: string[];
}

/**
 * Represents a Bitcoin transaction input that is a coinbase input,
 * which is a special type of input that does not reference a previous transaction.
 */
export interface MaestroCoinbaseVin extends MaestroVinBase {
  coinbase: string;
  txid?: never;
  vout?: never;
  value?: never;
}

/**
 * Represents a Bitcoin transaction input that is a coinbase input,
 * which is a special type of input that does not reference a previous transaction.
 */
export interface MaestroRegularVin extends MaestroVinBase {
  coinbase?: string;
  txid: string;
  vout: number;
  value: number;
}

/**
 * Represents a Bitcoin transaction input, which can be either a
 * coinbase input (with no txid/value) or a regular input
 * (with txid/vout/value).
 */
export type MaestroVin = MaestroCoinbaseVin | MaestroRegularVin;

/**
 * Represents a Bitcoin transaction output with detailed information
 * including address, index, script, type, and value.
 */
export interface MaestroVout {
  address: string;
  n: number;
  scriptPubKey: MaestroScriptPubKey;
  script_type: string;
  value: number;
}

/**
 * Represents a Bitcoin transaction with detailed information
 * including inputs, outputs, and metadata.
 */
export interface MaestroTransactionData {
  blockhash: string;
  blockheight: number;
  blocktime: number;
  confirmations: number;
  hash: string;
  hex: string;
  input_addresses: string[] | null;
  locktime: number;
  output_addresses: string[];
  size: number;
  time: number;
  total_fees: number;
  total_input_volume: number;
  total_output_volume: number;
  txid: string;
  version: number;
  vin: MaestroVin[];
  vout: MaestroVout[];
  vsize: number;
  weight: number;
}

/**
 * Represents a transaction associated with a Bitcoin address,
 * including the transaction hash, height, and whether
 * the address was an input or output in the transaction.
 */
export interface MaestroAddressTransaction {
  tx_hash: string;
  height: number;
  input: boolean;
  output: boolean;
}

/**
 * Runes are a type of asset that can be held in Bitcoin transactions.
 * This interface represents a holding of a specific rune
 * identified by its rune ID and the amount held.
 */
export interface MaestroRuneHolding {
  rune_id: string;
  amount: string;
}

/**
 * Represents a reference to an inscription in a Bitcoin transaction output.
 */
export interface MaestroInscriptionRef {
  offset: number;
  inscription_id: string;
}

/**
 * Represents a UTXO (Unspent Transaction Output) associated with a Bitcoin address,
 * including its transaction ID, output index, script public key,
 * value in satoshis, height, and whether it is in the mempool.
 */
export interface MaestroMempoolUtxo {
  txid: string;
  vout: number;
  script_pubkey: string;
  satoshis: string;
  height: number;
  mempool: boolean;
  runes: MaestroRuneHolding[];
  inscriptions: MaestroInscriptionRef[];
  address: string;
}

/**
 * Represents a confirmed UTXO (Unspent Transaction Output) associated with a Bitcoin address.
 */
export interface MaestroConfirmedUtxo {
  txid: string;
  vout: number;
  script_pubkey: string;
  satoshis: string;
  confirmations: number;
  height: number;
  runes: MaestroRuneHolding[];
  inscriptions: MaestroInscriptionRef[];
  address: string;
}

/**
 * Represents a pointer to a specific block in the Bitcoin blockchain,
 * including the block hash and height.
 */
export interface MaestroBlockPointer {
  block_hash: string;
  block_height: number;
}

/**
 * Represents the estimated satoshis per virtual byte (sats/vB)
 * for a Bitcoin transaction, providing minimum, median,
 * and maximum values.
 */
export interface MaestroSatsPerVb {
  min: number;
  median: number;
  max: number;
}

/**
 * Represents an estimated block in the Bitcoin blockchain,
 * including the block height and the estimated
 * satoshis per virtual byte (sats/vB) required for transactions
 * to be included in that block.
 */
export interface MaestroEstimatedBlock {
  block_height: number;
  sats_per_vb: MaestroSatsPerVb;
}

/**
 * Represents the indexer information returned by the `/mempool/addresses/${address}/utxos` endpoint,
 * including the current chain tip, estimated blocks, and the timestamp of the mempool.
 */
export interface MaestroIndexerInfo {
  chain_tip: MaestroBlockPointer;
  estimated_blocks: MaestroEstimatedBlock[];
  mempool_timestamp: string;
}

/**
 * Represents the data structure for fee estimates returned by the `/rpc/fee-estimates` endpoint.
 */
export interface MaestroFeeEstimateData {
  blocks: number;
  feerate: number;
}

/**
 * Represents the response from the `/rpc/fee-estimates` endpoint,
 * which includes fee estimate data and the last updated block pointer.
 */
export interface MaestroFeeEstimateResponse {
  data: MaestroFeeEstimateData;
  last_updated: MaestroBlockPointer;
}

/**
 * Response from the `address/${address}/utxos` endpoint
 * that contains confirmed UTXOs (Unspent Transaction Outputs)
 * associated with a specific Bitcoin address.
 */
export interface MaestroAddressUtxosResponse {
  data: MaestroConfirmedUtxo[];
  last_updated: MaestroBlockPointer;
  next_cursor?: string | null;
}

/**
 * Response from the `/rpc/address/${address}/utxos` endpoint
 * that contains UTXOs (Unspent Transaction Outputs)
 * associated with a specific Bitcoin address.
 */
export interface MaestroAddressMempoolUtxoResponse {
  data: MaestroMempoolUtxo[];
  indexer_info: MaestroIndexerInfo;
  next_cursor?: string | null;
}

/**
 * Response from the `/rpc/address/${address}/txs` endpoint
 */
export interface MaestroAddressTransactionsResponse {
  data: MaestroAddressTransaction[];
  last_updated: MaestroBlockPointer;
  next_cursor?: string | null;
}

/**
 * Response from the `/rpc/general/info` endpoint
 */
export interface MaestroInfoResponse {
  data: MaestroChainStatusData;
  last_updated: MaestroBlockPointer;
}

/**
 * Response from the `/rpc/transaction/${txHash}?verbose=true` endpoint
 */
export interface MaestroTransactionResponse {
  data: MaestroTransactionData;
  last_updated: MaestroBlockPointer;
}

/**
 * Common pagination and block‑height filters.
 *
 * @property {number} count   Max results per page (provider default when omitted).
 * @property {'asc' | 'desc'} order Sort order by block height.
 * @property {number} from    Include results from this height (inclusive).
 * @property {number} to      Include results up to this height (inclusive).
 * @property {string} cursor  Cursor returned by a previous call; start from
 *                            the top when empty or undefined.
 */
interface MaestroPaginationParams {
  count?: number;
  order?: 'asc' | 'desc';
  from?: number;
  to?: number;
  cursor?: string;
}

/**
 * Optional filters.
 *
 * @property {boolean} filter_dust          Ignore UTxOs under the filter_dust_threshold.
 * @property {number}  filter_dust_threshold Ignore UTxOs below this custom threshold (defaults to 100 if left undefined).
 * @property {boolean} exclude_metaprotocols Exclude UTxOs involved in metaprotocols (runes, inscriptions, etc.).
 */
interface MaestroFilterParams {
  filter_dust?: boolean;
  filter_dust_threshold?: number;
  exclude_metaprotocols?: boolean;
}

/**
 * Parameters for fetching confirmed transactions.
 *
 * @template BitcoinGetTransactionsParams
 * @augments MaestroPaginationParams
 * @property {number} confirmations Minimum number of confirmations.
 */
export type MaestroGetTransactionsQueryParams = MaestroPaginationParams & {
  confirmations?: number;
};

/**
 * Parameters for fetching UTxOs
 *
 * @template BitcoinGetUTxOsParams
 * @augments MaestroPaginationParams
 * @augments MaestroFilterParams
 */
export type MaestroGetUTxOsQueryParams = MaestroFilterParams &
  MaestroPaginationParams;

/**
 * Parameters for fetching mempool transactions
 * (`/address/.../mempool`).
 *
 * @template BitcoinGetMempoolTransactionsParams
 * @augments MaestroFilterParams
 * @augments MaestroPaginationParams
 * @property {number} mempool_blocks_limit Cap on pseudo‑block depth inspected in the mempool (provider‑specific).
 */
export type MaestroGetMempoolTransactionsQueryParams = MaestroFilterParams &
  MaestroPaginationParams & {
    mempool_blocks_limit?: number;
  };
