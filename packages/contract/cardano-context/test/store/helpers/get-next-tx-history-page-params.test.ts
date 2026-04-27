import { Cardano } from '@cardano-sdk/core';
import { Timestamp } from '@lace-sdk/util';
import { describe, expect, test } from 'vitest';

import {
  buildEndAtParamsFromTx,
  buildStartAtParamsFromTx,
} from '../../../src/store/helpers/get-next-tx-history-page-params';

import type { CardanoTransactionHistoryItem } from '../../../src';
import type { GetNextTxHistoryPageParams } from '../../../src/types';

const mockTxId =
  '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2';

describe('buildStartAtParamsFromTx', () => {
  test('returns next older block without index when txIndex is 0', () => {
    const txHistoryItem: CardanoTransactionHistoryItem = {
      txId: Cardano.TransactionId(mockTxId),
      txIndex: Cardano.TxIndex(0),
      blockNumber: Cardano.BlockNo(100),
      blockTime: Timestamp(123456789),
    };

    const result: GetNextTxHistoryPageParams =
      buildStartAtParamsFromTx(txHistoryItem);

    expect(result).toEqual({
      startAtBlock: Cardano.BlockNo(99),
    });
    expect(result.startAtIndex).toBeUndefined();
  });

  test('returns same block with smaller index when txIndex is greater than 0', () => {
    const txHistoryItem: CardanoTransactionHistoryItem = {
      txId: Cardano.TransactionId(mockTxId),
      txIndex: Cardano.TxIndex(5),
      blockNumber: Cardano.BlockNo(100),
      blockTime: Timestamp(123456789),
    };

    const result: GetNextTxHistoryPageParams =
      buildStartAtParamsFromTx(txHistoryItem);

    expect(result).toEqual({
      startAtBlock: Cardano.BlockNo(100),
      startAtIndex: Cardano.TxIndex(4),
    });
  });
});

describe('buildEndAtParamsFromTx', () => {
  test('returns next newer block without index when txIndex is 0', () => {
    const txHistoryItem: CardanoTransactionHistoryItem = {
      txId: Cardano.TransactionId(mockTxId),
      txIndex: Cardano.TxIndex(0),
      blockNumber: Cardano.BlockNo(100),
      blockTime: Timestamp(123456789),
    };

    const result: GetNextTxHistoryPageParams =
      buildEndAtParamsFromTx(txHistoryItem);

    expect(result).toEqual({
      endAtBlock: Cardano.BlockNo(100),
      endAtIndex: Cardano.TxIndex(1),
      order: 'asc',
    });
  });
});
