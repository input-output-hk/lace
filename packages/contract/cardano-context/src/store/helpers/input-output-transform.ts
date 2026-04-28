import { transformTokenMap } from './transformers';

import type { AssetMetadataMap, TxInput, TxOutputInput } from '../../types';
import type { Cardano } from '@cardano-sdk/core';

/**
 * Transforms transaction input/output into TxOutputInput format
 *
 * TxOutputInput is a data structure used to store complete information about
 * transaction inputs and outputs (UTXOs) along with their associated assets metadata.
 * It contains the address, amount, and a list of assets with their metadata for
 * efficient storage and retrieval of transaction details.
 *
 * @param txInOut - Transaction input or output (UTXO) to transform
 * @param assets - Map of asset IDs to their metadata
 * @returns TxOutputInput object with address, amount, and asset list
 */
export const inputOutputTransformer = (
  txInOut: Pick<TxInput, 'address' | 'value'>,
  assets: AssetMetadataMap,
): TxOutputInput => ({
  amount: txInOut.value?.coins ?? BigInt(0),
  assetList: transformTokenMap(
    txInOut.value?.assets ?? new Map<Cardano.AssetId, bigint>(),
    assets,
  ),
  addr: txInOut.address?.toString() ?? '-',
});
