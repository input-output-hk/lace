import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { HttpClientError } from '@lace-lib/util-provider';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MempoolFeeMarketProvider } from '../src/mempool';

import type { MempoolSpaceFeeEstimateResponse } from '../src/mempool';
import type { HttpRequestResponse } from '@lace-lib/util-provider';

const mockClient = {
  request: vi.fn(),
};

const queueResponse = <T>(value: T) => {
  mockClient.request.mockResolvedValueOnce(value);
};
const queueError = (error: unknown) => {
  mockClient.request.mockRejectedValueOnce(error);
};

describe('MaestroBitcoinProvider', () => {
  let provider: MempoolFeeMarketProvider;

  beforeEach(() => {
    vi.resetAllMocks();
    provider = new MempoolFeeMarketProvider(mockClient as never, dummyLogger);
  });

  it('fetches fee market', async () => {
    queueResponse<HttpRequestResponse<MempoolSpaceFeeEstimateResponse>>({
      data: {
        fastestFee: 5,
        halfHourFee: 4,
        hourFee: 3,
        economyFee: 2,
        minimumFee: 1,
      },
      status: 200,
    });

    const result = await provider.getFeeMarket(BitcoinNetwork.Mainnet);

    expect(result).toEqual({
      fast: {
        feeRate: 0.00005,
        targetConfirmationTime: 600,
      },
      slow: {
        feeRate: 0.00003,
        targetConfirmationTime: 3600,
      },
      standard: {
        feeRate: 0.00004,
        targetConfirmationTime: 1800,
      },
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      '/api/v1/fees/recommended',
      undefined,
    );
  });

  it('fetches default fee market for testnet', async () => {
    const result = await provider.getFeeMarket(BitcoinNetwork.Testnet);

    expect(result).toEqual({
      fast: {
        feeRate: 0.000025,
        targetConfirmationTime: 1,
      },
      slow: {
        feeRate: 0.000011,
        targetConfirmationTime: 6,
      },
      standard: {
        feeRate: 0.000015,
        targetConfirmationTime: 3,
      },
    });

    expect(mockClient.request).toBeCalledTimes(0);
  });

  it('returns an default fee market on error', async () => {
    queueError(new HttpClientError(404, 'Not found'));

    const result = await provider.getFeeMarket(BitcoinNetwork.Mainnet);

    expect(result).toEqual({
      fast: {
        feeRate: 0.000025,
        targetConfirmationTime: 1,
      },
      slow: {
        feeRate: 0.000011,
        targetConfirmationTime: 6,
      },
      standard: {
        feeRate: 0.000015,
        targetConfirmationTime: 3,
      },
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      '/api/v1/fees/recommended',
      undefined,
    );
  });
});
