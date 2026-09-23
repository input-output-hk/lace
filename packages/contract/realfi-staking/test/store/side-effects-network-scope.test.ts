import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it } from 'vitest';

import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import { makeNetworkScopeReset } from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';

import type { BlockchainNetworkId } from '@lace-contract/network';

const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;
const preprodNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preprod}` as BlockchainNetworkId;

const actions = realfiStakingActions;

describe('makeNetworkScopeReset', () => {
  it('clears the transient per-account reads on a network switch, not on boot', () => {
    testSideEffect(makeNetworkScopeReset, ({ hot, flush }) => ({
      actionObservables: {},
      stateObservables: {
        network: {
          // Boot network (a), a same-network re-emission (a), then a switch (b).
          selectActiveNetworkId$: hot('a-ab', {
            a: () => previewNetworkId,
            b: () => preprodNetworkId,
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();
        expect(emissions).toEqual([
          actions.realfiPosition.transientAccountStateCleared(),
        ]);
      },
    }));
  });
});
