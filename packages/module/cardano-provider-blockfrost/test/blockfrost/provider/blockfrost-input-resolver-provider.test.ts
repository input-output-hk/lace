// copied from Lace v1 and adjusted to vitest
// https://github.com/input-output-hk/lace/blob/27873f3b5dd8ec0e6926a5dd1653986a97ac81e8/packages/cardano/src/wallet/lib/__tests__/blockfrost-input-resolver.test.ts
import {
  HttpClientError,
  ProviderError,
  ProviderFailure,
} from '@lace-lib/util-provider';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockfrostToCardanoSDK } from '../../../src/blockfrost/blockfrost-to-cardano-sdk';
import { BlockfrostInputResolverProvider } from '../../../src/blockfrost/provider/blockfrost-input-resolver-provider';
import { mockResponses } from '../util';

import type { Cardano } from '@cardano-sdk/core';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';

vi.mock('@cardano-sdk/cardano-services-client');

describe('BlockfrostInputResolverProvider', () => {
  const clientMock = {
    request: vi.fn(),
  };
  const loggerMock = {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };
  let resolver: BlockfrostInputResolverProvider;

  beforeEach(() => {
    resolver = new BlockfrostInputResolverProvider(
      clientMock as unknown as HttpClient,
      loggerMock as unknown as Logger,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch transaction output', async () => {
    const txIn: Cardano.TxIn = {
      txId: 'txId2' as Cardano.TransactionId,
      index: 1,
    };
    const responseMock = {
      outputs: [
        {
          output_index: 1,
          address: 'addr2',
          amount: [{ unit: 'lovelace', quantity: '2000' }],
        },
      ],
    };

    mockResponses(clientMock.request, [
      [`txs/${txIn.txId}/utxos`, { data: responseMock }],
    ]);

    vi.spyOn(BlockfrostToCardanoSDK, 'txOut').mockReturnValue({
      address: 'addr2' as Cardano.PaymentAddress,
      value: { coins: BigInt(2000) },
    } as Cardano.TxOut);

    const result1 = await resolver.resolveInput(txIn);

    expect(result1).toEqual({
      address: 'addr2',
      value: { coins: BigInt(2000) },
    });
    expect(clientMock.request).toHaveBeenCalledTimes(1);
  });

  it('should return null if transaction output is not found', async () => {
    const txIn: Cardano.TxIn = {
      txId: 'txId3' as Cardano.TransactionId,
      index: 2,
    };
    const responseMock = { outputs: [] };
    mockResponses(clientMock.request, [
      [`txs/${txIn.txId}/utxos`, { data: responseMock }],
    ]);

    const result = await resolver.resolveInput(txIn);

    expect(result).toBeNull();
  });

  it('should return null for 404 errors from Blockfrost', async () => {
    const txIn: Cardano.TxIn = {
      txId: 'txId4' as Cardano.TransactionId,
      index: 0,
    };

    const error = new HttpClientError(404, 'Not Found');
    error.status = 404;

    mockResponses(clientMock.request, [[`txs/${txIn.txId}/utxos`, error]]);

    const result = await resolver.resolveInput(txIn);

    expect(result).toBeNull();
  });

  it('should throw errors for non-404 Blockfrost errors', async () => {
    const txIn: Cardano.TxIn = {
      txId: 'txId5' as Cardano.TransactionId,
      index: 0,
    };
    const error = new HttpClientError(500, 'Internal server error');
    error.status = 500;

    mockResponses(clientMock.request, [[`txs/${txIn.txId}/utxos`, error]]);

    try {
      await resolver.resolveInput(txIn);
    } catch (error_) {
      expect(error_).toEqual(
        new ProviderError(
          ProviderFailure.Unhealthy,
          error,
          'Internal server error',
        ),
      );
    }
  });
});
