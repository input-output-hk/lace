import {
  Milliseconds,
  ProviderError,
  ProviderFailure,
} from '@cardano-sdk/core';
import { testSideEffect } from '@lace-lib/util-dev';
import { Err, Ok } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, it, vi } from 'vitest';

import { CardanoNetworkId, cardanoContextActions } from '../../../src/';
import { trackEraSummaries } from '../../../src/store/side-effects';
import { chainId } from '../../mocks';

import type { CardanoProviderDependencies } from '../../../src';
import type { EraSummary } from '@cardano-sdk/core';

const actions = {
  ...cardanoContextActions,
};

describe('trackEraSummaries', () => {
  it('fetches and dispatches era summaries on chainId change', () => {
    const mockEraSummaries: EraSummary[] = [
      {
        parameters: { epochLength: 21_600, slotLength: Milliseconds(20_000) },
        start: { slot: 0, time: new Date('2022-06-01T00:00:00.000Z') },
      },
    ];
    const getEraSummaries = vi.fn().mockReturnValue(of(Ok(mockEraSummaries)));

    testSideEffect(trackEraSummaries, ({ cold, expectObservable }) => ({
      stateObservables: {
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
        },
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
            network: CardanoNetworkId(chainId.networkMagic),
            eraSummaries: mockEraSummaries,
          }),
        });
      },
    }));
  });

  it('dispatches getEraSummariesFailed on provider error', () => {
    const error = new ProviderError(ProviderFailure.ConnectionFailure);
    const getEraSummaries = vi.fn().mockReturnValue(of(Err(error)));

    testSideEffect(trackEraSummaries, ({ cold, expectObservable }) => ({
      stateObservables: {
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
        },
      },
      dependencies: {
        cardanoProvider: {
          getEraSummaries,
        } as unknown as CardanoProviderDependencies['cardanoProvider'],
        actions,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.cardanoContext.getEraSummariesFailed({
            chainId,
            failure: error.reason,
          }),
        });
      },
    }));
  });
});
