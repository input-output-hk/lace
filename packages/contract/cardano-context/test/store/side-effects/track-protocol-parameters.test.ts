import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { failuresActions } from '@lace-contract/failures';
import { Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { defer, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CardanoNetworkId } from '../../../src';
import { cardanoContextActions } from '../../../src/store';
import { trackProtocolParameters } from '../../../src/store/side-effects';
import { CardanoProtocolParametersFailureId } from '../../../src/value-objects';
import { chainId } from '../../mocks';

import type {
  CardanoProviderDependencies,
  RequiredProtocolParameters,
} from '../../../src/types';
import type { Failure, FailureId } from '@lace-contract/failures';
import type { TranslationKey } from '@lace-contract/i18n';

const actions = {
  ...cardanoContextActions,
  ...failuresActions,
};

const noFailureSelector = (_id: FailureId): Failure | undefined => undefined;

const retriableError = new ProviderError(ProviderFailure.Unhealthy);

const mockProtocolParameters = {
  mock: 'parameter',
} as unknown as RequiredProtocolParameters;

const network = CardanoNetworkId(chainId.networkMagic);
const failureId = CardanoProtocolParametersFailureId(network);

describe('cardano-context side effects', () => {
  describe('trackProtocolParameters', () => {
    it('dispatches setProtocolParameters on successful retrieval', () => {
      testSideEffect(trackProtocolParameters, ({ cold, expectObservable }) => {
        const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
        const selectProtocolParameters$ = cold<
          RequiredProtocolParameters | undefined
        >('a', { a: undefined });
        const getProtocolParameters = vi
          .fn()
          .mockReturnValue(of(Ok(mockProtocolParameters)));
        return {
          actionObservables: {},
          stateObservables: {
            cardanoContext: { selectChainId$, selectProtocolParameters$ },
            failures: {
              selectFailureById$: cold('a', { a: noFailureSelector }),
            },
          },
          dependencies: {
            cardanoProvider: {
              getProtocolParameters,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.cardanoContext.setProtocolParameters({
                protocolParameters: mockProtocolParameters,
                network,
              }),
            });
          },
        };
      });
    });

    it('retries transient errors with exponential backoff and emits addFailure when no cached parameters exist', () => {
      testSideEffect(
        trackProtocolParameters,
        ({ cold, expectObservable, flush }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const selectProtocolParameters$ = cold<
            RequiredProtocolParameters | undefined
          >('a', { a: undefined });
          let subscriptions = 0;
          const getProtocolParameters = vi.fn().mockImplementation(() =>
            defer(() => {
              subscriptions += 1;
              return cold('-#', {}, retriableError);
            }),
          );
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$, selectProtocolParameters$ },
              failures: {
                selectFailureById$: cold('a', { a: noFailureSelector }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getProtocolParameters,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              // retryBackoff: 300ms + 600ms + 1200ms = 2100ms; final error → addFailure at frame 2104.
              expectObservable(sideEffect$, '^ 2200ms !').toBe('2104ms a', {
                a: actions.failures.addFailure({
                  failureId,
                  message:
                    'sync.error.cardano-protocol-parameters-failed' as TranslationKey,
                }),
              });
              flush();
              expect(subscriptions).toBe(4);
            },
          };
        },
      );
    });

    it('recovers missing parameters after the provider becomes healthy without a chain change', () => {
      testSideEffect(
        trackProtocolParameters,
        ({ cold, expectObservable, flush }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const selectProtocolParameters$ = cold<
            RequiredProtocolParameters | undefined
          >('a', { a: undefined });
          let subscriptions = 0;
          const getProtocolParameters = vi.fn().mockImplementation(() =>
            defer(() => {
              subscriptions += 1;
              return subscriptions <= 4
                ? cold('-#', {}, retriableError)
                : cold('-a|', { a: Ok(mockProtocolParameters) });
            }),
          );
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$, selectProtocolParameters$ },
              failures: {
                selectFailureById$: cold('a', { a: noFailureSelector }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getProtocolParameters,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^ 32300ms !').toBe(
                '2104ms a 30000ms b',
                {
                  a: actions.failures.addFailure({
                    failureId,
                    message:
                      'sync.error.cardano-protocol-parameters-failed' as TranslationKey,
                  }),
                  b: actions.cardanoContext.setProtocolParameters({
                    protocolParameters: mockProtocolParameters,
                    network,
                  }),
                },
              );
              flush();
              expect(subscriptions).toBe(5);
              expect(getProtocolParameters).toHaveBeenCalledTimes(2);
            },
          };
        },
      );
    });

    it('recovers after thousands of exhausted attempts without growing the subscription stack', () => {
      testSideEffect(
        trackProtocolParameters,
        ({ cold, expectObservable, flush }) => {
          const failedAttempts = 5_100;
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const selectProtocolParameters$ = cold<
            RequiredProtocolParameters | undefined
          >('a', { a: undefined });
          let subscriptions = 0;
          const getProtocolParameters = vi.fn().mockImplementation(() =>
            defer(() => {
              subscriptions += 1;
              return subscriptions <= failedAttempts * 4
                ? cold('-#', {}, retriableError)
                : cold('-a|', { a: Ok(mockProtocolParameters) });
            }),
          );
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$, selectProtocolParameters$ },
              failures: {
                selectFailureById$: cold('a', { a: noFailureSelector }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getProtocolParameters,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe(
                `2104ms a ${failedAttempts * 32_104 - 2104}ms b`,
                {
                  a: actions.failures.addFailure({
                    failureId,
                    message:
                      'sync.error.cardano-protocol-parameters-failed' as TranslationKey,
                  }),
                  b: actions.cardanoContext.setProtocolParameters({
                    protocolParameters: mockProtocolParameters,
                    network,
                  }),
                },
              );
              flush();
              expect(subscriptions).toBe(failedAttempts * 4 + 1);
            },
          };
        },
      );
    });

    it('cancels a pending recovery when the active chain changes', () => {
      testSideEffect(
        trackProtocolParameters,
        ({ cold, expectObservable, flush }) => {
          const mainnetChainId = Cardano.ChainIds.Mainnet;
          const mainnetNetwork = CardanoNetworkId(mainnetChainId.networkMagic);
          const selectChainId$ = cold<Cardano.ChainId>('a 2500ms b', {
            a: chainId,
            b: mainnetChainId,
          });
          const selectProtocolParameters$ = cold<
            RequiredProtocolParameters | undefined
          >('a', { a: undefined });
          const requestedChains: Cardano.ChainId[] = [];
          const getProtocolParameters = vi
            .fn()
            .mockImplementation(
              ({ chainId: requested }: { chainId: Cardano.ChainId }) => {
                requestedChains.push(requested);
                return requested === mainnetChainId
                  ? cold('-a|', { a: Ok(mockProtocolParameters) })
                  : cold('-#', {}, retriableError);
              },
            );
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$, selectProtocolParameters$ },
              failures: {
                selectFailureById$: cold('a', { a: noFailureSelector }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getProtocolParameters,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^ 35000ms !').toBe(
                '2104ms a 397ms b',
                {
                  a: actions.failures.addFailure({
                    failureId,
                    message:
                      'sync.error.cardano-protocol-parameters-failed' as TranslationKey,
                  }),
                  b: actions.cardanoContext.setProtocolParameters({
                    protocolParameters: mockProtocolParameters,
                    network: mainnetNetwork,
                  }),
                },
              );
              flush();
              expect(requestedChains).toEqual([chainId, mainnetChainId]);
            },
          };
        },
      );
    });

    it('silently swallows failure when cached parameters already exist for the active network', () => {
      testSideEffect(
        trackProtocolParameters,
        ({ cold, expectObservable, flush }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const selectProtocolParameters$ = cold<
            RequiredProtocolParameters | undefined
          >('a', { a: mockProtocolParameters });
          let subscriptions = 0;
          const getProtocolParameters = vi.fn().mockImplementation(() =>
            defer(() => {
              subscriptions += 1;
              return cold('-#', {}, retriableError);
            }),
          );
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$, selectProtocolParameters$ },
              failures: {
                selectFailureById$: cold('a', { a: noFailureSelector }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getProtocolParameters,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^ 2200ms !').toBe('-');
              flush();
              expect(subscriptions).toBe(4);
            },
          };
        },
      );
    });

    it('auto-dismisses an existing failure on successful fetch', () => {
      testSideEffect(trackProtocolParameters, ({ cold, expectObservable }) => {
        const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
        const selectProtocolParameters$ = cold<
          RequiredProtocolParameters | undefined
        >('a', { a: undefined });
        const existingFailure: Failure = {
          failureId,
          message:
            'sync.error.cardano-protocol-parameters-failed' as TranslationKey,
        };
        const selectFailureById$ = of((id: FailureId): Failure | undefined =>
          id === failureId ? existingFailure : undefined,
        );
        const getProtocolParameters = vi
          .fn()
          .mockReturnValue(of(Ok(mockProtocolParameters)));
        return {
          actionObservables: {},
          stateObservables: {
            cardanoContext: { selectChainId$, selectProtocolParameters$ },
            failures: { selectFailureById$ },
          },
          dependencies: {
            cardanoProvider: {
              getProtocolParameters,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.cardanoContext.setProtocolParameters({
                protocolParameters: mockProtocolParameters,
                network,
              }),
              b: actions.failures.dismissFailure(failureId),
            });
          },
        };
      });
    });

    it('updates protocol parameters when chainId changes', () => {
      testSideEffect(trackProtocolParameters, ({ cold, expectObservable }) => {
        const preprodChainId = Cardano.ChainIds.Preprod;
        const mainnetChainId = Cardano.ChainIds.Mainnet;
        const selectChainId$ = cold<Cardano.ChainId>('ab', {
          a: preprodChainId,
          b: mainnetChainId,
        });
        const selectProtocolParameters$ = cold<
          RequiredProtocolParameters | undefined
        >('a', { a: undefined });

        const preprodProtocolParams = {
          mock: 'parameter',
        } as unknown as Cardano.ProtocolParameters;
        const mainnetProtocolParams = {
          ...preprodProtocolParams,
          minFeeCoefficient: 55,
        } as Cardano.ProtocolParameters;

        const getProtocolParameters = vi.fn<
          CardanoProviderDependencies['cardanoProvider']['getProtocolParameters']
        >(({ chainId: requested }) =>
          of(
            Ok(
              requested === Cardano.ChainIds.Mainnet
                ? mainnetProtocolParams
                : preprodProtocolParams,
            ),
          ),
        );

        return {
          actionObservables: {},
          stateObservables: {
            cardanoContext: { selectChainId$, selectProtocolParameters$ },
            failures: {
              selectFailureById$: cold('a', { a: noFailureSelector }),
            },
          },
          dependencies: {
            cardanoProvider: {
              getProtocolParameters,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('ab', {
              a: actions.cardanoContext.setProtocolParameters({
                protocolParameters: preprodProtocolParams,
                network: CardanoNetworkId(preprodChainId.networkMagic),
              }),
              b: actions.cardanoContext.setProtocolParameters({
                protocolParameters: mainnetProtocolParams,
                network: CardanoNetworkId(mainnetChainId.networkMagic),
              }),
            });
          },
        };
      });
    });
  });
});
