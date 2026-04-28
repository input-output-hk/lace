import { describe, expect, it } from 'vitest';

import { BlockchainNetworkId } from '../../src';
import {
  networkActions as actions,
  networkReducers as reducers,
  networkSelectors as selectors,
} from '../../src/store/slice';

import type { TestnetOption } from '../../src/store/types';

describe('network slice', () => {
  describe('networkType', () => {
    it('sets network type', () => {
      const state = reducers.network(
        undefined,
        actions.network.setNetworkType('mainnet'),
      );

      expect(state.networkType).toBe('mainnet');
    });

    it('selects network type', () => {
      const state = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'testnet' as const,
          blockchainNetworks: {},
          testnetOptions: {},
        },
      };

      expect(selectors.network.selectNetworkType(state)).toBe('testnet');
    });
  });

  describe('initialNetworkType', () => {
    it('sets initial network type', () => {
      const state = reducers.network(
        undefined,
        actions.network.setInitialNetworkType('mainnet'),
      );

      expect(state.initialNetworkType).toBe('mainnet');
    });

    it('selects initial network type', () => {
      const state = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'mainnet' as const,
          blockchainNetworks: {},
          testnetOptions: {},
        },
      };

      expect(selectors.network.selectInitialNetworkType(state)).toBe('mainnet');
    });

    it('does not affect networkType when updated independently', () => {
      const state = reducers.network(
        undefined,
        actions.network.setInitialNetworkType('mainnet'),
      );

      expect(state.networkType).toBe('testnet');
      expect(state.initialNetworkType).toBe('mainnet');
    });
  });

  describe('blockchainNetworks', () => {
    it('sets blockchain networks for a blockchain', () => {
      const state = reducers.network(
        undefined,
        actions.network.setBlockchainNetworks({
          blockchain: 'Cardano',
          mainnet: BlockchainNetworkId('cardano-764824073'),
          testnet: BlockchainNetworkId('cardano-2'),
        }),
      );

      expect(state.blockchainNetworks.Cardano).toEqual({
        mainnet: BlockchainNetworkId('cardano-764824073'),
        testnet: BlockchainNetworkId('cardano-2'),
      });
    });

    it('selects blockchain networks', () => {
      const state = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'testnet' as const,
          blockchainNetworks: {
            Cardano: {
              mainnet: BlockchainNetworkId('cardano-764824073'),
              testnet: BlockchainNetworkId('cardano-1'),
            },
          },
          testnetOptions: {},
        },
      };

      expect(selectors.network.selectBlockchainNetworks(state)).toEqual({
        Cardano: {
          mainnet: BlockchainNetworkId('cardano-764824073'),
          testnet: BlockchainNetworkId('cardano-1'),
        },
      });
    });

    it('selects active network id for a blockchain based on networkType', () => {
      const state = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'testnet' as const,
          blockchainNetworks: {
            Cardano: {
              mainnet: BlockchainNetworkId('cardano-764824073'),
              testnet: BlockchainNetworkId('cardano-1'),
            },
          },
          testnetOptions: {},
        },
      };

      expect(selectors.network.selectActiveNetworkId(state, 'Cardano')).toBe(
        BlockchainNetworkId('cardano-1'),
      );
    });

    it('returns mainnet network id when networkType is mainnet', () => {
      const state = {
        network: {
          networkType: 'mainnet' as const,
          initialNetworkType: 'mainnet' as const,
          blockchainNetworks: {
            Cardano: {
              mainnet: BlockchainNetworkId('cardano-764824073'),
              testnet: BlockchainNetworkId('cardano-1'),
            },
          },
          testnetOptions: {},
        },
      };

      expect(selectors.network.selectActiveNetworkId(state, 'Cardano')).toBe(
        BlockchainNetworkId('cardano-764824073'),
      );
    });

    it('returns undefined for unregistered blockchain', () => {
      const state = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'testnet' as const,
          blockchainNetworks: {},
          testnetOptions: {},
        },
      };

      expect(
        selectors.network.selectActiveNetworkId(state, 'Cardano'),
      ).toBeUndefined();
    });

    it('selects all active network ids based on networkType', () => {
      const state = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'testnet' as const,
          blockchainNetworks: {
            Cardano: {
              mainnet: BlockchainNetworkId('cardano-mainnet'),
              testnet: BlockchainNetworkId('cardano-preview'),
            },
            Bitcoin: {
              mainnet: BlockchainNetworkId('bitcoin-mainnet'),
              testnet: BlockchainNetworkId('bitcoin-testnet'),
            },
          },
          testnetOptions: {},
        },
      };

      expect(selectors.network.selectAllActiveNetworkIds(state)).toEqual([
        BlockchainNetworkId('cardano-preview'),
        BlockchainNetworkId('bitcoin-testnet'),
      ]);
    });
  });

  describe('testnetOptions', () => {
    it('sets testnet options for a blockchain', () => {
      const options: TestnetOption[] = [
        {
          id: BlockchainNetworkId('cardano-1'),
          label: 'v2.network-status.preview',
        },
        {
          id: BlockchainNetworkId('cardano-2'),
          label: 'v2.network-status.preprod',
        },
      ];

      const state = reducers.network(
        undefined,
        actions.network.setTestnetOptions({
          blockchainName: 'Cardano',
          options,
        }),
      );

      expect(state.testnetOptions.Cardano).toEqual(options);
    });

    it('selects testnet options', () => {
      const options: TestnetOption[] = [
        {
          id: BlockchainNetworkId('cardano-1'),
          label: 'v2.network-status.preview',
        },
      ];

      const state = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'testnet' as const,
          blockchainNetworks: {},
          testnetOptions: {
            Cardano: options,
          },
        },
      };

      expect(selectors.network.selectTestnetOptions(state)).toEqual({
        Cardano: options,
      });
    });

    it('selects all testnet options as array', () => {
      const cardanoOptions: TestnetOption[] = [
        {
          id: BlockchainNetworkId('cardano-1'),
          label: 'v2.network-status.preview',
        },
      ];
      const bitcoinOptions: TestnetOption[] = [
        {
          id: BlockchainNetworkId('bitcoin-testnet'),
          label: 'v2.network-status.testnet',
        },
      ];

      const state = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'testnet' as const,
          blockchainNetworks: {},
          testnetOptions: {
            Cardano: cardanoOptions,
            Bitcoin: bitcoinOptions,
          },
        },
      };

      const result = selectors.network.selectAllTestnetOptions(state);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        blockchainName: 'Cardano',
        options: cardanoOptions,
      });
      expect(result).toContainEqual({
        blockchainName: 'Bitcoin',
        options: bitcoinOptions,
      });
    });

    it('returns empty array when no testnet options', () => {
      const state = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'testnet' as const,
          blockchainNetworks: {},
          testnetOptions: {},
        },
      };

      expect(selectors.network.selectAllTestnetOptions(state)).toEqual([]);
    });
  });

  describe('selectNetworkKey', () => {
    it('returns string combining networkType and blockchainNetworks', () => {
      const state = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'testnet' as const,
          blockchainNetworks: {
            Cardano: {
              mainnet: BlockchainNetworkId('cardano-764824073'),
              testnet: BlockchainNetworkId('cardano-1'),
            },
          },
          testnetOptions: {},
        },
      };

      const key = selectors.network.selectNetworkKey(state);

      expect(key).toBe(
        `testnet:${JSON.stringify(state.network.blockchainNetworks)}`,
      );
    });

    it('changes when networkType changes', () => {
      const baseState = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'testnet' as const,
          blockchainNetworks: {
            Cardano: {
              mainnet: BlockchainNetworkId('cardano-764824073'),
              testnet: BlockchainNetworkId('cardano-1'),
            },
          },
          testnetOptions: {},
        },
      };

      const keyTestnet = selectors.network.selectNetworkKey(baseState);
      const keyMainnet = selectors.network.selectNetworkKey({
        network: {
          ...baseState.network,
          networkType: 'mainnet',
          initialNetworkType: 'mainnet',
        },
      });

      expect(keyTestnet).not.toBe(keyMainnet);
      expect(keyTestnet).toContain('testnet');
      expect(keyMainnet).toContain('mainnet');
    });

    it('changes when blockchainNetworks changes', () => {
      const baseState = {
        network: {
          networkType: 'testnet' as const,
          initialNetworkType: 'testnet' as const,
          blockchainNetworks: {
            Cardano: {
              mainnet: BlockchainNetworkId('cardano-764824073'),
              testnet: BlockchainNetworkId('cardano-1'),
            },
          },
          testnetOptions: {},
        },
      };

      const keyBefore = selectors.network.selectNetworkKey(baseState);
      const keyAfter = selectors.network.selectNetworkKey({
        network: {
          ...baseState.network,
          blockchainNetworks: {
            ...baseState.network.blockchainNetworks,
            Bitcoin: {
              mainnet: BlockchainNetworkId('bitcoin-mainnet'),
              testnet: BlockchainNetworkId('bitcoin-testnet'),
            },
          },
        },
      });

      expect(keyBefore).not.toBe(keyAfter);
    });
  });
});
