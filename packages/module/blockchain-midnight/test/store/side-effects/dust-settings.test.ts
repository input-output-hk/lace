import {
  UnreadableDustSnapshotError,
  MidnightNetworkId,
  DEFAULT_NETWORKS_CONFIG,
  EMPTY_PARTIAL_NETWORKS_CONFIG,
  midnightContextActions,
} from '@lace-contract/midnight-context';
import { networkActions } from '@lace-contract/network';
import { testSideEffect } from '@lace-lib/util-dev';
import { EMPTY, NEVER, of, throwError } from 'rxjs';
import { describe, it, vi } from 'vitest';

import { handleMidnightSettingsChange } from '../../../src/store/side-effects';
import { midnightActions } from '../../../src/store/slice';

import type { MidnightSettingsDrawerState } from '../../../src/store/slice';
import type { AccountId } from '@lace-contract/wallet-repo';
const actions = {
  ...midnightActions,
  ...midnightContextActions,
  ...networkActions,
};
const base = DEFAULT_NETWORKS_CONFIG.preview;
const requested = { ...base, filteredDustSyncIndexer: undefined };
const networks = {
  ...DEFAULT_NETWORKS_CONFIG,
  preview: { ...base, filteredDustSyncIndexer: base.indexerAddress },
};

describe('saving the return to full Dust sync', () => {
  it.each([
    'clear',
    'pending',
    'mismatched-indexer',
    'confirmed',
    'new-spend',
    'error',
    'unreadable',
    'silent',
    'closed',
    'config-changed',
  ] as const)('%s', scenario => {
    testSideEffect(
      handleMidnightSettingsChange,
      ({ cold, expectObservable }) => {
        const pending: Record<string, string[]> =
          scenario === 'clear'
            ? {}
            : { wallet: scenario === 'new-spend' ? ['1', '2'] : ['1'] };
        const authorized = ['confirmed', 'new-spend'].includes(scenario)
          ? { wallet: ['1'] }
          : undefined;
        return {
          stateObservables: {
            midnight: {
              selectSettingsDrawerState$: cold(
                scenario === 'closed' ? 'a-b' : 'a',
                {
                  a: {
                    status: 'Saving',
                    config:
                      scenario === 'mismatched-indexer'
                        ? {
                            ...requested,
                            filteredDustSyncIndexer:
                              'https://old-indexer.example',
                          }
                        : requested,
                    networkId: 'preview',
                    authorizedPendingDustNullifiers: authorized,
                  } as MidnightSettingsDrawerState,
                  b: { status: 'Closed' } as MidnightSettingsDrawerState,
                },
              ),
            },
            midnightContext: {
              selectNetworksConfig$:
                scenario === 'config-changed'
                  ? cold('a-b', {
                      a: networks,
                      b: {
                        ...networks,
                        preview: {
                          ...networks.preview,
                          indexerAddress: 'https://changed.example',
                        },
                      },
                    })
                  : of(networks),
              selectNetworksConfigFeatureFlagsOverrides$: of(
                EMPTY_PARTIAL_NETWORKS_CONFIG,
              ),
            },
            wallets: { selectActiveNetworkAccounts$: of([]) },
          },
          dependencies: {
            actions,
            logger: { error: vi.fn() } as never,
            createCollectionStorage: vi.fn(() => ({
              getAll: () => EMPTY,
            })) as never,
            inspectDustSyncReset: () =>
              scenario === 'unreadable'
                ? throwError(
                    () =>
                      new UnreadableDustSnapshotError(
                        'affected' as AccountId,
                        new Error('bad snapshot'),
                      ),
                  )
                : scenario === 'error'
                ? throwError(() => new Error('unknown'))
                : scenario === 'silent'
                ? NEVER
                : ['closed', 'config-changed'].includes(scenario)
                ? cold('----a', { a: pending })
                : of(pending),
          },
          assertion: effect$ => {
            if (scenario === 'closed') expectObservable(effect$).toBe('');
            else if (scenario === 'config-changed')
              expectObservable(effect$).toBe('----a', {
                a: actions.midnight.savingFailed(),
              });
            else if (scenario === 'silent')
              expectObservable(effect$).toBe('15000ms a', {
                a: actions.midnight.savingFailed(),
              });
            else if (scenario === 'unreadable')
              expectObservable(effect$).toBe('a', {
                a: actions.midnight.snapshotUnreadable('affected' as AccountId),
              });
            else if (scenario === 'error')
              expectObservable(effect$).toBe('a', {
                a: actions.midnight.savingFailed(),
              });
            else if (
              ['pending', 'new-spend', 'mismatched-indexer'].includes(scenario)
            )
              expectObservable(effect$).toBe('a', {
                a: actions.midnight.dustResetConfirmationRequired(pending),
              });
            else
              expectObservable(effect$).toBe('(abcd)', {
                a: actions.network.setNetworkType('testnet'),
                b: actions.network.setBlockchainNetworks({
                  blockchain: 'Midnight',
                  mainnet: MidnightNetworkId('mainnet'),
                  testnet: MidnightNetworkId('preview'),
                }),
                c: actions.midnightContext.setUserNetworkConfigOverride({
                  networkId: 'preview',
                  config: {
                    ...requested,
                    dustSyncResetAuthorizations: pending,
                  },
                  featureFlagsOverrides: {},
                }),
                d: actions.midnight.savingCompleted(),
              });
          },
        };
      },
    );
  });
});
