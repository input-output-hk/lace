import { BlockfrostProvider } from '../blockfrost-provider';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { Cardano } from '@cardano-sdk/core';

/**
 * Fetches transaction details by id via Blockfrost `txs/{hash}`.
 *
 * Throws `ProviderError` on failure. A 404 (transaction not seen by the node /
 * dropped from mempool) surfaces as `ProviderError` with
 * `reason === ProviderFailure.NotFound`; consumers can detect it via
 * `isNotFoundError` from `@lace-lib/util-provider`.
 */
export class BlockfrostTxProvider extends BlockfrostProvider {
  public async getTransaction(
    txId: Cardano.TransactionId,
  ): Promise<Responses['tx_content']> {
    return this.request<Responses['tx_content']>(`txs/${txId}`);
  }
}
