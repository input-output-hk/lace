/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import { inputOutputTransformer } from '../transformers';
import { mockAsset, mockPrices } from '../../utils/mocks/test-helpers';
import { Wallet } from '@lace/cardano';
import { defaultCurrency } from '@providers/currency/constants';

const output = {
  address: Wallet.Cardano.PaymentAddress(
    'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
  ),
  value: { assets: new Map(), coins: BigInt(1_000_000) }
};

const input = {
  txId: Wallet.Cardano.TransactionId('724a0a88b9470a714fc5bf84daf5851fa259a9b89e1a5453f6f5cd6595ad9827'),
  address: Wallet.Cardano.PaymentAddress(
    'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
  ),
  index: 0,
  value: { assets: new Map(), coins: BigInt(3_000_000) }
};

describe('Testing inputOutputTransformer function', () => {
  test('should format transaction output with no asset list', () => {
    const result = inputOutputTransformer(
      output,
      new Map([[mockAsset.assetId, mockAsset]]),
      mockPrices,
      defaultCurrency
    );
    expect(result.addr).toEqual(
      'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
    );
    expect(result.amount).toBe('1');
    expect(result.assetList.length).toEqual(0);
  });

  test('should format transaction input with no asset list', () => {
    const result = inputOutputTransformer(
      input,
      new Map([[mockAsset.assetId, mockAsset]]),
      mockPrices,
      defaultCurrency
    );
    expect(result.addr).toEqual(
      'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
    );
    expect(result.amount).toBe('3');
    expect(result.assetList.length).toEqual(0);
  });

  test('should format transaction input with assets list', () => {
    const result = inputOutputTransformer(
      {
        ...input,
        value: {
          ...input.value,
          assets: new Map([[mockAsset.assetId, BigInt('3000000')]])
        }
      },
      new Map([[mockAsset.assetId, mockAsset]]),
      mockPrices,
      defaultCurrency
    );
    expect(result.addr).toEqual(
      'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
    );
    expect(result.amount).toBe('3');
    expect(result.assetList.length).toEqual(1);
  });
});
