import {
  type Cardano,
  Milliseconds,
  ProviderError,
  ProviderFailure,
} from '@cardano-sdk/core';
import { failuresActions } from '@lace-contract/failures';
import { testSideEffect } from '@lace-lib/util-dev';
import { Ok } from '@lace-sdk/util';
import { defer, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CardanoNetworkId, cardanoContextActions } from '../../../src/';
import { trackEraSummaries } from '../../../src/store/side-effects';
import { CardanoEraSummariesFailureId } from '../../../src/value-objects';
import { chainId } from '../../mocks';

import type { CardanoProviderDependencies } from '../../../src';
import type { EraSummary } from '@cardano-sdk/core';
import type { Failure, FailureId } from '@lace-contract/failures';
import type { TranslationKey } from '@lace-contract/i18n';

const actions = {
  ...cardanoContextActions,
  ...failuresActions,
};

const noFailureSelector = (_id: FailureId): Failure | undefined => undefined;

const retriableError = new ProviderError(ProviderFailure.Unhealthy);

const mockEraSummaries: EraSummary[] = [
  {
    parameters: { epochLength: 21_600, slotLength: Milliseconds(20_000) },
    start: { slot: 0, time: new Date('2022-06-01T00:00:00.000Z') },
  },
];

const network = CardanoNetworkId(chainId.networkMagic);
const failureId = CardanoEraSummariesFailureId(network);

describe('trackEraSummaries', () => {
  it('fetches and dispatches era summaries on chainId change', () => {
    const getEraSummaries = vi.fn().mockReturnValue(of(Ok(mockEraSummaries)));
    testSideEffect(trackEraSummaries, ({ cold, expectObservable }) => ({
      stateObservables: {
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          selectEraSummaries$: cold<EraSummary[] | undefined>('a', {
            a: undefined,
          }),
        },
        failures: { selectFailureById$: cold('a', { a: noFailureSelector }) },
      },
      dependencies: {
        cardanoProvider: {
          getEraSummaries,
        } as unknown as CardanoProviderDependencies['cardanoProvider'],
        actions,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.cardanoContext.setEraSummaries({
            network,
            eraSummaries: mockEraSummaries,
          }),
        });
      },
    }));
  });

  it('retries transient errors with exponential backoff and emits addFailure when no cached summaries exist', () => {
    let subscriptions = 0;
    const getEraSummaries = vi.fn().mockImplementation(() =>
      defer(() => {
        subscriptions += 1;
        return defer(() => {
          throw retriableError;
        });
      }),
    );
    testSideEffect(trackEraSummaries, ({ cold, expectObservable, flush }) => ({
      stateObservables: {
        cardanoContext: {
          selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
          selectEraSummaries$: cold<EraSummary[] | undefined>('a', {
            a: undefined,
          }),
        },
        failures: { selectFailureById$: cold('a', { a: noFailureSelector }) },
      },
      dependencies: {
        cardanoProvider: {
          getEraSummaries,
        } as unknown as CardanoProviderDependencies['cardanoProvider'],
        actions,
      },
      assertion: sideEffect$ => {
        // retryBackoff: 300ms + 600ms + 1200ms = 2100ms; failure synchronous after exhaustion.
        expectObservable(sideEffect$).toBe('2100ms a', {
          a: actions.failures.addFailure({
            failureId,
            message:
              'sync.error.cardano-era-summaries-failed' as TranslationKey,
          }),
        });
        flush();
        expect(subscriptions).toBe(4);
      },
    }));
  });

  it('silently swallows failure when cached era summaries already exist for the active network', () => {
    let subscriptions = 0;
    const getEraSummaries = vi.fn().mockImplementation(() =>
      defer(() => {
        subscriptions += 1;
        return defer(() => {
          throw retriableError;
        });
      }),
    );
    testSideEffect(trackEraSummaries, ({ cold, expectObservable, flush }) => ({
      stateObservables: {
        cardanoContext: {
          selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
          selectEraSummaries$: cold<EraSummary[] | undefined>('a', {
            a: mockEraSummaries,
          }),
        },
        failures: { selectFailureById$: cold('a', { a: noFailureSelector }) },
      },
      dependencies: {
        cardanoProvider: {
          getEraSummaries,
        } as unknown as CardanoProviderDependencies['cardanoProvider'],
        actions,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$, '^ 2200ms !').toBe('-');
        flush();
        expect(subscriptions).toBe(4);
      },
    }));
  });

  it('auto-dismisses an existing failure on successful fetch', () => {
    const existingFailure: Failure = {
      failureId,
      message: 'sync.error.cardano-era-summaries-failed' as TranslationKey,
    };
    const selectFailureById$ = of((id: FailureId): Failure | undefined =>
      id === failureId ? existingFailure : undefined,
    );
    const getEraSummaries = vi.fn().mockReturnValue(of(Ok(mockEraSummaries)));
    testSideEffect(trackEraSummaries, ({ cold, expectObservable }) => ({
      stateObservables: {
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          selectEraSummaries$: cold<EraSummary[] | undefined>('a', {
            a: undefined,
          }),
        },
        failures: { selectFailureById$ },
      },
      dependencies: {
        cardanoProvider: {
          getEraSummaries,
        } as unknown as CardanoProviderDependencies['cardanoProvider'],
        actions,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('(ab)', {
          a: actions.cardanoContext.setEraSummaries({
            network,
            eraSummaries: mockEraSummaries,
          }),
          b: actions.failures.dismissFailure(failureId),
        });
      },
    }));
  });
});
