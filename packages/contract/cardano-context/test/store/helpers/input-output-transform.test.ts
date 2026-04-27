import { Cardano } from '@cardano-sdk/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { inputOutputTransformer } from '../../../src/store/helpers/input-output-transform';
import { transformTokenMap } from '../../../src/store/helpers/transformers';

import type { TxInput } from '../../../src/types';
import type { AssetMetadataMap } from '../../../src/types';

vi.mock('../../../src/store/helpers/transformers', () => ({
  transformTokenMap: vi.fn(),
}));

const mockTransformTokenMap = vi.mocked(transformTokenMap);

describe('inputOutputTransformer', () => {
  const testAssetId = Cardano.AssetId(
    '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  );
  const testAddress = Cardano.PaymentAddress(
    'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
  );
  const testAssets = new Map() as AssetMetadataMap;
  const testAssetList = [
    {
      id: 'test-id',
      amount: '100',
      name: 'Test Token',
      symbol: 'TEST',
      logo: '',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransformTokenMap.mockReturnValue(testAssetList);
  });

  it('should handle undefined values correctly', () => {
    const txInOut: TxInput = {
      index: 0,
      txId: Cardano.TransactionId(
        '7f812e6da32276e76e7e73e7f15248c15ae24e7bb4e2aca1d985e20aaabc6d68',
      ),
      value: undefined,
      address: undefined,
    };

    const result = inputOutputTransformer(txInOut, testAssets);

    expect(result.amount).toBe(BigInt(0));
    expect(mockTransformTokenMap).toHaveBeenCalledWith(
      new Map<Cardano.AssetId, bigint>(),
      testAssets,
    );
    expect(result.addr).toBe('-');
  });

  it('should handle defined values correctly', () => {
    const testCoins = BigInt(5000);
    const testAssetsMap = new Map([[testAssetId, BigInt(200)]]);

    const txInOut: TxInput = {
      index: 0,
      txId: Cardano.TransactionId(
        '7f812e6da32276e76e7e73e7f15248c15ae24e7bb4e2aca1d985e20aaabc6d68',
      ),
      value: {
        coins: testCoins,
        assets: testAssetsMap,
      },
      address: testAddress,
    };

    const result = inputOutputTransformer(txInOut, testAssets);

    expect(result.amount).toBe(testCoins);
    expect(mockTransformTokenMap).toHaveBeenCalledWith(
      testAssetsMap,
      testAssets,
    );
    expect(result.assetList).toBe(testAssetList);
    expect(result.addr).toBe(testAddress.toString());
  });
});
