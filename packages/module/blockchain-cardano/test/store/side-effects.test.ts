import { Cardano } from '@cardano-sdk/core';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { networkActions } from '@lace-contract/network';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it } from 'vitest';

import {
  deriveCardanoTestnetOptions,
  registerCardanoTestnetOptions,
} from '../../src/store/side-effects';

import type { NetworkSliceState, TestnetOption } from '@lace-contract/network';

const actions = {
  ...networkActions,
};

describe('blockchain-cardano side-effects', () => {
  describe('deriveCardanoTestnetOptions', () => {
    it('derives testnet options from configured network magics, filtering mainnet', () => {
      const config = {
        cardanoProvider: {
          blockfrostConfigs: {
            [Cardano.ChainIds.Mainnet.networkMagic]: {},
            [Cardano.ChainIds.Preprod.networkMagic]: {},
            [Cardano.ChainIds.Preview.networkMagic]: {},
          },
        },
      };

      const result = deriveCardanoTestnetOptions(config as never);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        id: CardanoNetworkId(Cardano.ChainIds.Preprod.networkMagic),
        label: 'v2.network-status.preprod',
      });
      expect(result).toContainEqual({
        id: CardanoNetworkId(Cardano.ChainIds.Preview.networkMagic),
        label: 'v2.network-status.preview',
      });
    });

    it('returns empty array when blockfrostConfigs is undefined', () => {
      const config = { cardanoProvider: {} };

      const result = deriveCardanoTestnetOptions(config as never);

      expect(result).toEqual([]);
    });
  });

  describe('registerCardanoTestnetOptions', () => {
    const testnetOptions: TestnetOption[] = [
      {
        id: CardanoNetworkId(Cardano.ChainIds.Preprod.networkMagic),
        label: 'v2.network-status.preprod',
      },
    ];

    it('dispatches setTestnetOptions when Cardano not registered', () => {
      const sideEffect = registerCardanoTestnetOptions(testnetOptions);

      testSideEffect(sideEffect, ({ cold, expectObservable }) => {
        const selectTestnetOptions$ = cold<NetworkSliceState['testnetOptions']>(
          '(a|)',
          { a: {} },
        );

        return {
          stateObservables: {
            network: { selectTestnetOptions$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(a|)', {
              a: actions.network.setTestnetOptions({
                blockchainName: 'Cardano',
                options: testnetOptions,
              }),
            });
          },
        };
      });
    });

    it('does nothing when Cardano already registered', () => {
      const sideEffect = registerCardanoTestnetOptions(testnetOptions);

      testSideEffect(sideEffect, ({ cold, expectObservable }) => {
        const selectTestnetOptions$ = cold<NetworkSliceState['testnetOptions']>(
          '(a|)',
          { a: { Cardano: testnetOptions } },
        );

        return {
          stateObservables: {
            network: { selectTestnetOptions$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('|');
          },
        };
      });
    });
  });
});
