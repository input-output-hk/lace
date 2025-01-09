/* eslint-disable no-magic-numbers, camelcase */
import { BlockfrostInputResolver } from '../blockfrost-input-resolver';
import { Cardano } from '@cardano-sdk/core';
import { BlockfrostClient, BlockfrostError, BlockfrostToCore } from '@cardano-sdk/cardano-services-client';
import { Logger } from 'ts-log';

jest.mock('@cardano-sdk/cardano-services-client');

describe('BlockfrostInputResolver', () => {
  let clientMock: jest.Mocked<BlockfrostClient>;
  let loggerMock: jest.Mocked<Logger>;
  let resolver: BlockfrostInputResolver;

  beforeEach(() => {
    clientMock = {
      request: jest.fn()
    } as unknown as jest.Mocked<BlockfrostClient>;

    loggerMock = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    resolver = new BlockfrostInputResolver(clientMock, loggerMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve input using hints if available', async () => {
    const txIn: Cardano.TxIn = { txId: 'txId1' as Cardano.TransactionId, index: 0 };
    const hint = {
      id: 'txId1' as Cardano.TransactionId,
      body: {
        outputs: [{ address: 'addr1' as Cardano.PaymentAddress, value: { coins: BigInt(1000) } }]
      }
    } as Cardano.Tx;

    const result = await resolver.resolveInput(txIn, { hints: [hint] });

    expect(result).toEqual(hint.body.outputs[0]);
  });

  it('should fetch transaction output on first resolve and use cache on second resolve', async () => {
    const txIn: Cardano.TxIn = { txId: 'txId2' as Cardano.TransactionId, index: 1 };
    const responseMock = {
      outputs: [{ output_index: 1, address: 'addr2', amount: [{ unit: 'lovelace', quantity: '2000' }] }]
    };

    clientMock.request.mockResolvedValue(responseMock);

    jest.spyOn(BlockfrostToCore, 'txOut').mockReturnValue({
      address: 'addr2' as Cardano.PaymentAddress,
      value: { coins: BigInt(2000) }
    } as Cardano.TxOut);

    const result1 = await resolver.resolveInput(txIn);

    expect(result1).toEqual({ address: 'addr2', value: { coins: BigInt(2000) } });
    expect(clientMock.request).toHaveBeenCalledWith('txs/txId2/utxos');
    expect(clientMock.request).toHaveBeenCalledTimes(1);

    const result2 = await resolver.resolveInput(txIn);

    expect(result2).toEqual(result1);
    expect(clientMock.request).toHaveBeenCalledTimes(1);
  });

  it('should return null if transaction output is not found', async () => {
    const txIn: Cardano.TxIn = { txId: 'txId3' as Cardano.TransactionId, index: 2 };
    const responseMock = { outputs: [] };
    clientMock.request.mockResolvedValue(responseMock);

    const result = await resolver.resolveInput(txIn);

    expect(result).toBeNull();
  });

  it('should return null for 404 errors from Blockfrost', async () => {
    const txIn: Cardano.TxIn = { txId: 'txId4' as Cardano.TransactionId, index: 0 };

    const error = new BlockfrostError(404, 'Not Found');
    error.status = 404;

    clientMock.request.mockRejectedValue(error);

    const result = await resolver.resolveInput(txIn);

    expect(result).toBeNull();
  });

  it('should throw errors for non-404 Blockfrost errors', async () => {
    const txIn: Cardano.TxIn = { txId: 'txId5' as Cardano.TransactionId, index: 0 };
    const error = new BlockfrostError(500, 'Invalid Request');
    error.status = 500;

    clientMock.request.mockRejectedValue(error);

    try {
      await resolver.resolveInput(txIn);
    } catch (error_) {
      expect(error_).toBeInstanceOf(BlockfrostError);
      expect(error_.status).toEqual(500);
    }
  });
});
