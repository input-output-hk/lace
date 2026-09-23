import { AccountId } from '@lace-contract/wallet-repo';
import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import { makeStakeActivities } from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';

import type {
  RealFiProviderError,
  RealFiStakeActivity,
} from '../../src/provider-types';
import type { BlockchainNetworkId } from '@lace-contract/network';

const accountId = AccountId('acct-1');
const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: {} },
};

const activity: RealFiStakeActivity = {
  id: 'tx-1',
  kind: 'stake',
  label: 'Stake',
  subtitle: '+100 sUSDrf',
  completed: true,
  requestDate: 1_700_000_000_000,
  steps: [{ key: 'stake', status: 'completed' }],
};

const actions = realfiStakingActions;

const stateObservables = (address: string | null) => ({
  addresses: {
    selectByAccountId$: of(() => (address ? [{ address }] : []) as never),
  },
  network: {
    selectActiveNetworkId$: of(() => previewNetworkId),
  },
  features: {
    selectLoadedFeatures$: of({ featureFlags: [realfiFlag], modules: [] }),
  },
});

const runStakeActivities = (
  getStakeActivities: ReturnType<typeof vi.fn>,
  assert: (emissions: unknown[]) => void,
  address: string | null = 'addr_test1xyz',
) => {
  const provider = { getStakeActivities } as never;
  testSideEffect(makeStakeActivities, ({ hot, flush }) => ({
    actionObservables: {
      realfiPosition: {
        stakeActivitiesRequested$: hot('-a', {
          a: actions.realfiPosition.stakeActivitiesRequested({ accountId }),
        }),
      },
    },
    stateObservables: stateObservables(address),
    dependencies: { actions, realfiProviders: [provider] },
    assertion: sideEffect$ => {
      const emissions: unknown[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      assert(emissions);
    },
  }));
};

describe('makeStakeActivities', () => {
  it('emits stakeActivitiesReceived with the fetched activities', () => {
    const getStakeActivities = vi.fn().mockReturnValue(of(Ok([activity])));

    runStakeActivities(getStakeActivities, emissions => {
      expect(getStakeActivities).toHaveBeenCalledWith(
        expect.objectContaining({ accountId, userAddress: 'addr_test1xyz' }),
      );
      expect(emissions).toEqual([
        actions.realfiPosition.stakeActivitiesReceived({
          accountId,
          activities: [activity],
        }),
      ]);
    });
  });

  it('keeps the previous data when the provider returns an error result', () => {
    const getStakeActivities = vi
      .fn()
      .mockReturnValue(
        of(Err<RealFiProviderError>({ code: 'VALIDATION', message: 'nope' })),
      );

    runStakeActivities(getStakeActivities, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('keeps the previous data when the read pipeline throws', () => {
    const getStakeActivities = vi
      .fn()
      .mockReturnValue(throwError(() => new Error('boom')));

    runStakeActivities(getStakeActivities, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('does not call the provider when the account has no address', () => {
    const getStakeActivities = vi.fn().mockReturnValue(of(Ok([activity])));

    runStakeActivities(
      getStakeActivities,
      emissions => {
        expect(getStakeActivities).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      null,
    );
  });
});
