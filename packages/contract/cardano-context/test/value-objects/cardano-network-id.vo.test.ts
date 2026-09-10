import { Cardano } from '@cardano-sdk/core';
import { BlockchainNetworkId } from '@lace-contract/network';
import { describe, expect, it } from 'vitest';

import { CardanoNetworkId } from '../../src';

describe('value-objects/cardano-network-id', () => {
  describe('CardanoNetworkId.getChainId', () => {
    it('should return Mainnet ChainId for mainnet network ID', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Mainnet);
      const chainId = CardanoNetworkId.getChainId(networkId);
      expect(chainId).toEqual(Cardano.ChainIds.Mainnet);
    });

    it('should return Preprod ChainId for preprod network ID', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Preprod);
      const chainId = CardanoNetworkId.getChainId(networkId);
      expect(chainId).toEqual(Cardano.ChainIds.Preprod);
    });

    it('should return Preview ChainId for preview network ID', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Preview);
      const chainId = CardanoNetworkId.getChainId(networkId);
      expect(chainId).toEqual(Cardano.ChainIds.Preview);
    });

    it('should return Sanchonet ChainId for sanchonet network ID', () => {
      const networkId = CardanoNetworkId(Cardano.NetworkMagics.Sanchonet);
      const chainId = CardanoNetworkId.getChainId(networkId);
      expect(chainId).toEqual(Cardano.ChainIds.Sanchonet);
    });

    it('should return undefined for non-Cardano network ID', () => {
      const bitcoinNetworkId = BlockchainNetworkId('bitcoin-mainnet');
      const chainId = CardanoNetworkId.getChainId(bitcoinNetworkId);
      expect(chainId).toBeUndefined();
    });

    it('should return undefined for network ID with invalid magic number', () => {
      const networkId = BlockchainNetworkId('cardano-invalid');
      const chainId = CardanoNetworkId.getChainId(networkId);
      expect(chainId).toBeUndefined();
    });

    it('should return undefined for network ID with unknown magic number', () => {
      const networkId = BlockchainNetworkId('cardano-999999');
      const chainId = CardanoNetworkId.getChainId(networkId);
      expect(chainId).toBeUndefined();
    });

    it('should return undefined for malformed network ID', () => {
      const networkId = BlockchainNetworkId('cardano-');
      const chainId = CardanoNetworkId.getChainId(networkId);
      expect(chainId).toBeUndefined();
    });
  });

  describe('CardanoNetworkId.getName', () => {
    it.each([
      [Cardano.NetworkMagics.Mainnet, 'Mainnet'],
      [Cardano.NetworkMagics.Preprod, 'Preprod'],
      [Cardano.NetworkMagics.Preview, 'Preview'],
      [Cardano.NetworkMagics.Sanchonet, 'Sanchonet'],
    ])('should name the network for magic %i', (networkMagic, name) => {
      expect(CardanoNetworkId.getName(CardanoNetworkId(networkMagic))).toBe(
        name,
      );
    });

    it('should return undefined for a magic number it has no name for', () => {
      expect(
        CardanoNetworkId.getName(BlockchainNetworkId('cardano-999999')),
      ).toBeUndefined();
    });

    it('should return undefined for a non-Cardano network ID', () => {
      expect(
        CardanoNetworkId.getName(BlockchainNetworkId('bitcoin-mainnet')),
      ).toBeUndefined();
    });
  });
});
