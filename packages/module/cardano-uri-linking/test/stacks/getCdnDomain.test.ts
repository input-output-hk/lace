import { Cardano } from '@cardano-sdk/core';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { BlockchainNetworkId } from '@lace-contract/network';
import { describe, expect, it } from 'vitest';

/**
 * Tests for CDN domain resolution logic used in fetchTokenMetadataSideEffect.
 * The CDN domain is derived from the account's blockchainNetworkId using ChainId:
 * - Mainnet (764824073) -> 'lace'
 * - Preprod (1) -> 'preprod'
 * - Preview (2) -> 'preview'
 * - Sanchonet (4) -> 'sanchonet'
 */
describe('CDN domain resolution', () => {
  // Replicates the getCdnDomain logic from side-effects.ts for testing
  const getCdnDomain = (
    blockchainNetworkId: ReturnType<typeof BlockchainNetworkId> | undefined,
  ): string => {
    if (!blockchainNetworkId) return 'preprod';
    const chainId = CardanoNetworkId.getChainId(blockchainNetworkId);
    if (!chainId) return 'preprod';
    const magic = Number(chainId.networkMagic);
    if (magic === Number(Cardano.NetworkMagics.Mainnet)) return 'lace';
    if (magic === Number(Cardano.NetworkMagics.Preprod)) return 'preprod';
    if (magic === Number(Cardano.NetworkMagics.Preview)) return 'preview';
    if (magic === Number(Cardano.NetworkMagics.Sanchonet)) return 'sanchonet';
    return 'preprod';
  };

  describe('CardanoNetworkId.getChainId', () => {
    it('should return Mainnet ChainId for mainnet network magic', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Mainnet);
      const chainId = CardanoNetworkId.getChainId(networkId);
      expect(chainId).toEqual(Cardano.ChainIds.Mainnet);
    });

    it('should return Preprod ChainId for preprod network magic', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Preprod);
      const chainId = CardanoNetworkId.getChainId(networkId);
      expect(chainId).toEqual(Cardano.ChainIds.Preprod);
    });

    it('should return Preview ChainId for preview network magic', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Preview);
      const chainId = CardanoNetworkId.getChainId(networkId);
      expect(chainId).toEqual(Cardano.ChainIds.Preview);
    });

    it('should return Sanchonet ChainId for sanchonet network magic', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Sanchonet);
      const chainId = CardanoNetworkId.getChainId(networkId);
      expect(chainId).toEqual(Cardano.ChainIds.Sanchonet);
    });

    it('should return undefined for non-cardano network ids', () => {
      const networkId = BlockchainNetworkId('bitcoin-mainnet');
      expect(CardanoNetworkId.getChainId(networkId)).toBeUndefined();
    });
  });

  describe('getCdnDomain', () => {
    it('should return lace for mainnet', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Mainnet);
      expect(getCdnDomain(networkId)).toBe('lace');
    });

    it('should return preprod for preprod network', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Preprod);
      expect(getCdnDomain(networkId)).toBe('preprod');
    });

    it('should return preview for preview network', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Preview);
      expect(getCdnDomain(networkId)).toBe('preview');
    });

    it('should return sanchonet for sanchonet network', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Sanchonet);
      expect(getCdnDomain(networkId)).toBe('sanchonet');
    });

    it('should fallback to preprod for undefined network id', () => {
      expect(getCdnDomain(undefined)).toBe('preprod');
    });

    it('should fallback to preprod for non-cardano network id', () => {
      const networkId = BlockchainNetworkId('bitcoin-testnet4');
      expect(getCdnDomain(networkId)).toBe('preprod');
    });
  });
});
