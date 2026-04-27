import { BlockchainNetworkId } from '@lace-contract/network';
import { describe, expect, it } from 'vitest';

import { BitcoinNetwork, BitcoinNetworkId } from '../../src';

describe('value-objects/bitcoin-network-id', () => {
  describe('BitcoinNetworkId.getChainId', () => {
    it('should return "mainnet" network name', () => {
      const networkId = BitcoinNetworkId('mainnet');
      const bitcoinNetwork = BitcoinNetworkId.getBitcoinNetwork(networkId);
      expect(bitcoinNetwork).toEqual(BitcoinNetwork.Mainnet);
    });

    it('should return "testnet4" network name', () => {
      const networkId = BitcoinNetworkId('testnet4');
      const bitcoinNetwork = BitcoinNetworkId.getBitcoinNetwork(networkId);
      expect(bitcoinNetwork).toEqual(BitcoinNetwork.Testnet);
    });

    it('should return undefined for non-bitcoin network id', () => {
      const networkId = BlockchainNetworkId('other');
      const bitcoinNetwork = BitcoinNetworkId.getBitcoinNetwork(networkId);
      expect(bitcoinNetwork).toBeUndefined();
    });
  });
});
