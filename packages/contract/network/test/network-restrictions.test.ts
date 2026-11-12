import { FeatureFlagKey } from '@lace-contract/feature';
import { describe, expect, it } from 'vitest';

import {
  FEATURE_NETWORK_RESTRICTIONS,
  FeatureId,
  FeatureIds,
  isFeatureAvailableForNetwork,
} from '../src';

import type { FeatureFlag } from '@lace-contract/feature';

describe('network-restrictions', () => {
  describe('FEATURE_NETWORK_RESTRICTIONS', () => {
    it('requires BUY_FLOW on mainnet', () => {
      const restriction = FEATURE_NETWORK_RESTRICTIONS[FeatureIds.BUY_FLOW];
      expect(restriction).toEqual({
        allowedNetworks: ['mainnet'],
        featureFlagKey: FeatureFlagKey('BUY_FLOW'),
      });
    });

    it('should have dapp-explorer restricted to mainnet with feature flag', () => {
      const restriction =
        FEATURE_NETWORK_RESTRICTIONS[FeatureIds.DAPP_EXPLORER];
      expect(restriction).toEqual({
        allowedNetworks: ['mainnet'],
        featureFlagKey: FeatureFlagKey('DAPP_EXPLORER'),
      });
    });

    it('should have swap restricted to mainnet with feature flag', () => {
      const restriction = FEATURE_NETWORK_RESTRICTIONS[FeatureIds.SWAP_CENTER];
      expect(restriction).toEqual({
        allowedNetworks: ['mainnet'],
        featureFlagKey: FeatureFlagKey('SWAP_CENTER'),
      });
    });
  });

  describe('isFeatureAvailableForNetwork', () => {
    const createFeatureFlags = (keys: string[]): FeatureFlag[] =>
      keys.map(key => ({ key: FeatureFlagKey(key) }));

    describe('buy-flow', () => {
      it('is available on mainnet with BUY_FLOW', () => {
        const isAvailable = isFeatureAvailableForNetwork(
          FeatureIds.BUY_FLOW,
          'mainnet',
          createFeatureFlags(['BUY_FLOW']),
        );
        expect(isAvailable).toBe(true);
      });

      it('is unavailable on mainnet when BUY_FLOW is missing', () => {
        expect(
          isFeatureAvailableForNetwork(FeatureIds.BUY_FLOW, 'mainnet', []),
        ).toBe(false);
      });

      it('is unavailable on testnet even with BUY_FLOW', () => {
        const isAvailable = isFeatureAvailableForNetwork(
          FeatureIds.BUY_FLOW,
          'testnet',
          createFeatureFlags(['BUY_FLOW']),
        );
        expect(isAvailable).toBe(false);
      });
    });

    describe('dapp-explorer', () => {
      it('should be available on mainnet with DAPP_EXPLORER feature flag', () => {
        const featureFlags = createFeatureFlags(['DAPP_EXPLORER']);
        const isAvailable = isFeatureAvailableForNetwork(
          FeatureIds.DAPP_EXPLORER,
          'mainnet',
          featureFlags,
        );
        expect(isAvailable).toBe(true);
      });

      it('should be unavailable on mainnet without DAPP_EXPLORER feature flag', () => {
        const isAvailable = isFeatureAvailableForNetwork(
          FeatureIds.DAPP_EXPLORER,
          'mainnet',
          [],
        );
        expect(isAvailable).toBe(false);
      });

      it('should be unavailable on testnet even with DAPP_EXPLORER feature flag', () => {
        const featureFlags = createFeatureFlags(['DAPP_EXPLORER']);
        const isAvailable = isFeatureAvailableForNetwork(
          FeatureIds.DAPP_EXPLORER,
          'testnet',
          featureFlags,
        );
        expect(isAvailable).toBe(false);
      });
    });

    describe('swap', () => {
      it('should be available on mainnet with SWAP_CENTER feature flag', () => {
        const featureFlags = createFeatureFlags(['SWAP_CENTER']);
        const isAvailable = isFeatureAvailableForNetwork(
          FeatureIds.SWAP_CENTER,
          'mainnet',
          featureFlags,
        );
        expect(isAvailable).toBe(true);
      });

      it('should be unavailable on mainnet without SWAP_CENTER feature flag', () => {
        const isAvailable = isFeatureAvailableForNetwork(
          FeatureIds.SWAP_CENTER,
          'mainnet',
          [],
        );
        expect(isAvailable).toBe(false);
      });

      it('should be unavailable on testnet even with SWAP_CENTER feature flag', () => {
        const featureFlags = createFeatureFlags(['SWAP_CENTER']);
        const isAvailable = isFeatureAvailableForNetwork(
          FeatureIds.SWAP_CENTER,
          'testnet',
          featureFlags,
        );
        expect(isAvailable).toBe(false);
      });
    });

    describe('unknown features', () => {
      it('should be available by default on any network', () => {
        const unknownFeature = FeatureId('unknown-feature');
        const networks = ['mainnet', 'testnet'] as const;

        for (const network of networks) {
          const isAvailable = isFeatureAvailableForNetwork(
            unknownFeature,
            network,
            [],
          );
          expect(isAvailable).toBe(true);
        }
      });
    });
  });
});
