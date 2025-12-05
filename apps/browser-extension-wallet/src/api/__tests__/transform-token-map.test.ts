/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import { transformTokenMap } from '../transformers';
import { mockAsset, mockPrices } from '../../utils/mocks/test-helpers';
import { Wallet } from '@lace/cardano';
import { defaultCurrency } from '@providers/currency/constants';

const token1Id = mockAsset.assetId;
const token1 = {
  balance: [token1Id, BigInt('3000000')] as [Wallet.Cardano.AssetId, bigint],

  info: mockAsset
};
const token2Id = Wallet.Cardano.AssetId('6ac8ef33b510ec004fe11585f7c5a9f0c07f0c23428ab4f29c1d7d104d454c44');
const token2 = {
  balance: [token2Id, BigInt('4000000')] as [Wallet.Cardano.AssetId, bigint],
  info: { ...mockAsset, assetId: token2Id }
};

const tokenMap = new Map([token1.balance, token2.balance]);

describe('Testing transformTokenMap function', () => {
  test('given that receive a list of 2 tokens with metadata, should return an array with an array with length 2', () => {
    const result = transformTokenMap(
      tokenMap,
      new Map([
        [token2Id, token2.info],
        [token1Id, token1.info]
      ]),
      mockPrices,
      defaultCurrency
    );
    expect(result.length).toEqual(2);
  });

  test('given that receive a list of 2 tokens, one with metadata and the other without, should omit the token without metadata', () => {
    const result = transformTokenMap(tokenMap, new Map([[token1Id, token1.info]]), mockPrices, defaultCurrency);
    expect(result.length).toEqual(1);
  });
});
