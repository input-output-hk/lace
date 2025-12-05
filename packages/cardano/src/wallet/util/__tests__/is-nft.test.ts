/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import { isNFT, mayBeNFT } from '../is-nft';
import { Asset } from '@cardano-sdk/core';

describe('Testing isNFT function', () => {
  test('should return true', async () => {
    expect(isNFT({ supply: BigInt(1) } as Asset.AssetInfo)).toBe(true);
    expect(mayBeNFT({ supply: BigInt(1) } as Asset.AssetInfo)).toBe(true);
    expect(mayBeNFT(undefined as unknown as Asset.AssetInfo)).toBe(true);
  });

  test('should return false', async () => {
    expect(isNFT({ supply: BigInt(2) } as Asset.AssetInfo)).toBe(false);
    expect(isNFT({} as Asset.AssetInfo)).toBe(false);
    expect(isNFT(undefined as unknown as Asset.AssetInfo)).toBe(false);
    expect(mayBeNFT({ supply: BigInt(2) } as Asset.AssetInfo)).toBe(false);
  });
});
