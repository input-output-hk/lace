/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import { isNFT } from '../is-nft';
import { Wallet } from '@lace/cardano';

describe('Testing isNFT function', () => {
  test('should return true', async () => {
    expect(isNFT({ supply: BigInt(1) } as Wallet.Asset.AssetInfo)).toBe(true);
  });

  test('should return false', async () => {
    expect(isNFT({ supply: BigInt(2) } as Wallet.Asset.AssetInfo)).toBe(false);
    expect(isNFT({} as Wallet.Asset.AssetInfo)).toBe(false);
    expect(isNFT(undefined as Wallet.Asset.AssetInfo)).toBe(false);
  });
});
