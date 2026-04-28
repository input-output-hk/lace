import { Cardano } from '@cardano-sdk/core';

import type {
  CardanoTransactionHistoryItem,
  GetNextTxHistoryPageParams,
} from '../../types';

/**
 * Takes a transaction and returns parameters needed to fetch transactions
 * older than it (excluding it) as the upper bound. The returned parameters define
 * a range where this transaction is the newest boundary.
 * @param txHistoryItem The transaction to use as the upper bound
 */
export const buildStartAtParamsFromTx = (
  txHistoryItem: CardanoTransactionHistoryItem,
): GetNextTxHistoryPageParams => {
  // Edge case: oldest tx of its block -> we need to pick next older block
  if (txHistoryItem.txIndex === 0) {
    return {
      startAtBlock: Cardano.BlockNo(txHistoryItem.blockNumber - 1),
    };
  }
  // Default case: start searching from the next older index within same block
  return {
    startAtBlock: txHistoryItem.blockNumber,
    startAtIndex: Cardano.TxIndex(Math.max(0, txHistoryItem.txIndex - 1)),
  };
};

/**
 * Takes a transaction and returns parameters needed to fetch transactions
 * newer than it (excluding it) as the lower bound.
 * @param txHistoryItem The transaction to use as the lower bound
 */
export const buildEndAtParamsFromTx = (
  txHistoryItem: CardanoTransactionHistoryItem,
): GetNextTxHistoryPageParams => {
  return {
    // return oldest transactions first so there are no gaps in the history
    order: 'asc',
    endAtBlock: txHistoryItem.blockNumber,
    endAtIndex: Cardano.TxIndex(txHistoryItem.txIndex + 1),
  };
};
