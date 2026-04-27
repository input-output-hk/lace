import { Cardano } from '@cardano-sdk/core';
import { BlockchainNetworkId, networkActions } from '@lace-contract/network';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { CardanoNetworkId } from '../../../src';
import { createRegisterCardanoBlockchainNetworks } from '../../../src/store/side-effects';

import type { BlockchainNetworkConfig } from '@lace-contract/network';
import type { BlockchainName } from '@lace-lib/util-store';

const actions = {
  ...networkActions,
};

describe('cardano-context side effects', () => {
  describe('createRegisterCardanoBlockchainNetworks', () => {
    const defaultTestnetChainId = Cardano.ChainIds.Preprod;

    it('dispatches setBlockchainNetworks when Cardano not registered', () => {
      testSideEffect(
        createRegisterCardanoBlockchainNetworks(defaultTestnetChainId),
        ({ cold, expectObservable }) => {
          const selectBlockchainNetworks$ = cold<
            Partial<Record<BlockchainName, BlockchainNetworkConfig>>
          >('a', { a: {} });

          return {
            actionObservables: {},
            stateObservables: {
              network: { selectBlockchainNetworks$ },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('(a|)', {
                a: actions.network.setBlockchainNetworks({
                  blockchain: 'Cardano',
                  mainnet: CardanoNetworkId(
                    Cardano.ChainIds.Mainnet.networkMagic,
                  ),
                  testnet: CardanoNetworkId(defaultTestnetChainId.networkMagic),
                }),
              });
            },
          };
        },
      );
    });

    it('does nothing when Cardano already registered', () => {
      testSideEffect(
        createRegisterCardanoBlockchainNetworks(defaultTestnetChainId),
        ({ cold, expectObservable }) => {
          const selectBlockchainNetworks$ = cold<
            Partial<Record<BlockchainName, BlockchainNetworkConfig>>
          >('a', {
            a: {
              Cardano: {
                mainnet: BlockchainNetworkId('cardano-764824073'),
                testnet: BlockchainNetworkId('cardano-1'),
              },
            },
          });

          return {
            actionObservables: {},
            stateObservables: {
              network: { selectBlockchainNetworks$ },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('|');
            },
          };
        },
      );
    });
  });
});
