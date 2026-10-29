import { networkActions } from '@lace-contract/network';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { MidnightSDKNetworkIds } from '../src/const';
import { registerMidnightBlockchainNetworks } from '../src/register-midnight-blockchain-networks';
import * as stubData from '../src/stub-data';
import { MidnightNetworkId } from '../src/value-objects';

const { midnightWallet } = stubData;
const actions = networkActions;

describe('registerMidnightBlockchainNetworks', () => {
  it('registers Midnight with the default testnet when no account exists', () => {
    testSideEffect(
      registerMidnightBlockchainNetworks,
      ({ expectObservable, cold }) => {
        const defaultTestNetNetworkId = MidnightSDKNetworkIds.Preview;

        return {
          actionObservables: {},
          stateObservables: {
            network: {
              selectBlockchainNetworks$: cold('a', { a: {} }),
            },
            midnightContext: {
              selectDefaultTestNetNetworkId$: cold('a', {
                a: defaultTestNetNetworkId,
              }),
            },
            wallets: {
              selectAll$: cold('a', { a: [] }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.network.registerBlockchainNetworks({
                blockchain: 'Midnight',
                mainnet: MidnightNetworkId('mainnet'),
                testnet: MidnightNetworkId(defaultTestNetNetworkId),
              }),
            });
          },
        };
      },
    );
  });

  it('selects the network of an existing Midnight account as the testnet', () => {
    testSideEffect(
      registerMidnightBlockchainNetworks,
      ({ expectObservable, cold }) => {
        const existingAccountNetworkId = MidnightSDKNetworkIds.PreProd;
        const existingMidnightAccount = {
          ...stubData.midnightAccount,
          blockchainSpecific: {
            ...stubData.midnightAccount.blockchainSpecific,
            networkId: existingAccountNetworkId,
          },
        };

        return {
          actionObservables: {},
          stateObservables: {
            network: {
              selectBlockchainNetworks$: cold('a', { a: {} }),
            },
            midnightContext: {
              selectDefaultTestNetNetworkId$: cold('a', {
                a: MidnightSDKNetworkIds.Preview,
              }),
            },
            wallets: {
              selectAll$: cold('a', {
                a: [{ ...midnightWallet, accounts: [existingMidnightAccount] }],
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.network.registerBlockchainNetworks({
                blockchain: 'Midnight',
                mainnet: MidnightNetworkId('mainnet'),
                testnet: MidnightNetworkId(existingAccountNetworkId),
              }),
            });
          },
        };
      },
    );
  });

  it('does not emit when Midnight is already registered', () => {
    testSideEffect(
      registerMidnightBlockchainNetworks,
      ({ expectObservable, cold }) => ({
        actionObservables: {},
        stateObservables: {
          network: {
            selectBlockchainNetworks$: cold('a', {
              a: {
                Midnight: {
                  mainnet: MidnightNetworkId('mainnet'),
                  testnet: MidnightNetworkId('preview'),
                },
              },
            }),
          },
          midnightContext: {
            selectDefaultTestNetNetworkId$: cold('a', {
              a: MidnightSDKNetworkIds.Preview,
            }),
          },
          wallets: {
            selectAll$: cold('a', { a: [] }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('');
        },
      }),
    );
  });
});
