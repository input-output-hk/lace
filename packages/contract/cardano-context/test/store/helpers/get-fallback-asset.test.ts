import { Cardano } from '@cardano-sdk/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assetProvider,
  getFallbackAsset,
} from '../../../src/store/helpers/get-fallback-asset';

import type * as Core from '@cardano-sdk/core';

// Mock the Cardano SDK functions
vi.mock('@cardano-sdk/core', async importActual => {
  const module = await importActual<typeof Core>();

  return {
    Cardano: {
      ...module.Cardano,
      AssetId: {
        getPolicyId: vi.fn(),
        getAssetName: vi.fn(),
      },
      AssetFingerprint: {
        fromParts: vi.fn(),
      },
    },
  };
});

describe('getFallbackAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create fallback asset with correct properties', () => {
    const mockAssetId = 'asset123' as unknown as Cardano.AssetId;
    const mockPolicyId = 'policy123';
    const mockAssetName = 'assetName';
    const mockFingerprint = 'fingerprint123';

    (
      Cardano.AssetId.getPolicyId as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockPolicyId);
    (
      Cardano.AssetId.getAssetName as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockAssetName);
    (
      Cardano.AssetFingerprint.fromParts as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockFingerprint);

    const fallbackAsset = getFallbackAsset(mockAssetId);

    expect(fallbackAsset).toEqual({
      assetId: mockAssetId,
      fingerprint: mockFingerprint,
      name: mockAssetName,
      policyId: mockPolicyId,
      quantity: BigInt(0),
      supply: BigInt(0),
    });
  });
});

describe('assetProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return fallback asset with correct properties', async () => {
    const mockAssetId = 'asset123' as unknown as Cardano.AssetId;
    const fallbackAsset = await assetProvider.getAsset({
      assetId: mockAssetId,
    });
    expect(fallbackAsset).toEqual(getFallbackAsset(mockAssetId));
  });

  it('should return fallback assets with correct properties', async () => {
    const mockAssetIds = [
      'asset123',
      'asset456',
    ] as unknown as Cardano.AssetId[];
    const fallbackAssets = await assetProvider.getAssets({
      assetIds: [mockAssetIds[0], mockAssetIds[1]],
    });
    expect(fallbackAssets).toEqual([
      getFallbackAsset(mockAssetIds[0]),
      getFallbackAsset(mockAssetIds[1]),
    ]);
  });

  it('should return health check result', async () => {
    const healthCheckResult = await assetProvider.healthCheck();
    expect(healthCheckResult).toEqual({ ok: true });
  });
});
