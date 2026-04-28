import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { createStubObservable } from '@cardano-sdk/util-dev';
import { addressesActions } from '@lace-contract/addresses';
import { tokensActions } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { Err, Milliseconds, Ok } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, it, vi } from 'vitest';

import { CardanoNetworkId } from '../../../src';
import { cardanoContextActions } from '../../../src/store';
import { trackTip } from '../../../src/store/side-effects';
import { tip1, tip2 } from '../../mocks';

import type { CardanoProviderDependencies } from '../../../src/types';
import type { Result } from '@lace-sdk/util';

const actions = {
  ...cardanoContextActions,
  ...addressesActions,
  ...tokensActions,
};

describe('cardano-context side effects', () => {
  describe('trackTip', () => {
    const chainId = Cardano.ChainIds.Preprod;

    it('polls provider at provided interval and disptaches either setTip or getTipFailed action', () => {
      const tipPollFrequency = Milliseconds(2);
      testSideEffect(
        trackTip(tipPollFrequency),
        ({ cold, expectObservable }) => {
          const chainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const error = new ProviderError(ProviderFailure.ConnectionFailure);
          const getTipResults$ = createStubObservable<
            Result<Cardano.Tip, ProviderError>
          >(of(Ok(tip1)), of(Err(error)), of(Ok(tip2)));
          const getTip = vi.fn().mockReturnValue(getTipResults$);
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$: chainId$ },
            },
            dependencies: {
              cardanoProvider: {
                getTip,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^----!').toBe('a-b-c', {
                a: actions.cardanoContext.setTip({
                  tip: tip1,
                  network: CardanoNetworkId(chainId.networkMagic),
                }),
                b: actions.cardanoContext.getTipFailed({
                  chainId,
                  failure: error.reason,
                }),
                c: actions.cardanoContext.setTip({
                  tip: tip2,
                  network: CardanoNetworkId(chainId.networkMagic),
                }),
              });
            },
          };
        },
      );
    });
  });
});
