import { AccountId } from '@lace-contract/wallet-repo';
import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import {
  makeRPoints,
  makeRPointsQueuedRefresh,
} from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';

import type {
  RealFiProviderError,
  RealFiRPoints,
} from '../../src/provider-types';
import type { RealFiFlowState } from '../../src/store/types';
import type { RealFiStakeId } from '../../src/value-objects';
import type { BlockchainNetworkId } from '@lace-contract/network';

const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

// The season is PostHog-only (no bundled default), so the payload must carry
// an open window for the read to run. Bounds are far enough out that the
// wall clock cannot close the window under a future test run.
const OPEN_SEASON = {
  activeFrom: '2020-01-01T00:00:00Z',
  activeTo: '2999-12-31T23:59:59Z',
};

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: { launchSeason: OPEN_SEASON } },
};

const accountId = AccountId('acc-1');
const userAddress = 'addr_test1qz...';

const rPoints: RealFiRPoints = { totalPoints: 4120 };

const actions = realfiStakingActions;

const runRPoints = (
  getRPoints: ReturnType<typeof vi.fn>,
  assert: (emissions: unknown[]) => void,
  {
    featureFlags = [realfiFlag],
    addresses = [{ address: userAddress }],
  }: {
    featureFlags?: object[];
    addresses?: { address: string }[];
  } = {},
) => {
  const provider = { getRPoints } as never;
  testSideEffect(makeRPoints, ({ hot, flush }) => ({
    actionObservables: {
      realfiPosition: {
        rPointsRequested$: hot('-a', {
          a: actions.realfiPosition.rPointsRequested({ accountId }),
        }),
      },
    },
    stateObservables: {
      addresses: {
        selectByAccountId$: of(() => addresses as never),
      },
      network: {
        selectActiveNetworkId$: of(() => previewNetworkId),
      },
      features: {
        selectLoadedFeatures$: of({ featureFlags, modules: [] }) as never,
      },
    },
    dependencies: { actions, realfiProviders: [provider] },
    assertion: sideEffect$ => {
      const emissions: unknown[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      assert(emissions);
    },
  }));
};

describe('makeRPoints', () => {
  it('reads the R-Points snapshot and stores it under the requested account', () => {
    const read = vi.fn(() => of(Ok(rPoints)));
    runRPoints(read, emissions => {
      expect(read).toHaveBeenCalledTimes(1);
      const request = (read.mock.calls[0] as unknown[])[0] as {
        config: { realfiNetwork: string };
        accountId: string;
        userAddress: string;
      };
      expect(request.config.realfiNetwork).toBe('preview');
      expect(request.accountId).toBe(accountId);
      expect(request.userAddress).toBe(userAddress);
      expect(emissions).toEqual([
        actions.realfiPosition.rPointsReceived({ accountId, rPoints }),
      ]);
    });
  });

  it('keeps the previous snapshot but records the failure when the provider reports an error result', () => {
    const read = vi.fn(() =>
      of(
        Err<RealFiProviderError>({
          code: 'PROVIDER_UNAVAILABLE',
          message: 'nope',
        }),
      ),
    );
    runRPoints(read, emissions => {
      expect(emissions).toEqual([
        actions.realfiPosition.rPointsFetchFailed({ accountId }),
      ]);
    });
  });

  it('keeps the previous snapshot but records the failure when the provider pipeline throws', () => {
    const read = vi.fn(() => throwError(() => new Error('boom')));
    runRPoints(read, emissions => {
      expect(emissions).toEqual([
        actions.realfiPosition.rPointsFetchFailed({ accountId }),
      ]);
    });
  });

  it('does nothing when the payload carries no launchSeason entry (season kill switch)', () => {
    const read = vi.fn(() => of(Ok(rPoints)));
    runRPoints(
      read,
      emissions => {
        expect(read).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      {
        featureFlags: [{ key: FEATURE_FLAG_REALFI, payload: { preview: {} } }],
      },
    );
  });

  it('does nothing once the launchSeason window has closed', () => {
    const read = vi.fn(() => of(Ok(rPoints)));
    runRPoints(
      read,
      emissions => {
        expect(read).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      {
        featureFlags: [
          {
            key: FEATURE_FLAG_REALFI,
            payload: {
              preview: {
                launchSeason: {
                  activeFrom: '2020-01-01T00:00:00Z',
                  activeTo: '2020-12-31T23:59:59Z',
                },
              },
            },
          },
        ],
      },
    );
  });

  it('does nothing before the launchSeason window opens', () => {
    const read = vi.fn(() => of(Ok(rPoints)));
    runRPoints(
      read,
      emissions => {
        expect(read).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      {
        featureFlags: [
          {
            key: FEATURE_FLAG_REALFI,
            payload: {
              preview: {
                launchSeason: {
                  activeFrom: '2999-01-01T00:00:00Z',
                  activeTo: '2999-12-31T23:59:59Z',
                },
              },
            },
          },
        ],
      },
    );
  });

  it('does nothing when the account has no known address', () => {
    const read = vi.fn(() => of(Ok(rPoints)));
    runRPoints(
      read,
      emissions => {
        expect(read).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      { addresses: [] },
    );
  });

  it('does nothing when no RealFi config resolves for the active network', () => {
    const read = vi.fn(() => of(Ok(rPoints)));
    runRPoints(
      read,
      emissions => {
        expect(read).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      { featureFlags: [] },
    );
  });
});

describe('makeRPointsQueuedRefresh', () => {
  // Every stake on an account queues under the SAME synthetic stakeId
  // (`stake-${accountId}`, built in makeFinalize), so txId is the only field
  // that distinguishes one confirmation from the next.
  const STAKE_ID = `stake-${accountId}` as RealFiStakeId;
  const queued = (txId: string): RealFiFlowState => ({
    status: 'Queued',
    kind: 'stake',
    accountId,
    txId,
    inputTokenId: 'lovelace',
    stakeId: STAKE_ID,
  });
  const idle: RealFiFlowState = { status: 'Idle' };

  it('requests a points refresh once per queued transaction', () => {
    testSideEffect(makeRPointsQueuedRefresh, ({ hot, flush }) => ({
      actionObservables: {},
      stateObservables: {
        realfiFlow: {
          // Queued re-emits (b, b) while the confirmation sheet is open; a
          // second stake (c) queues after a round-trip through Idle, sharing
          // b's stakeId — deduping on stakeId dropped it.
          selectFlowState$: hot('a-b-b-a-c', {
            a: idle,
            b: queued('tx-1'),
            c: queued('tx-2'),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();
        expect(emissions).toEqual([
          actions.realfiPosition.rPointsRequested({ accountId }),
          actions.realfiPosition.rPointsRequested({ accountId }),
        ]);
      },
    }));
  });

  it('emits nothing while the flow never reaches Queued', () => {
    testSideEffect(makeRPointsQueuedRefresh, ({ hot, flush }) => ({
      actionObservables: {},
      stateObservables: {
        realfiFlow: { selectFlowState$: hot('a-a', { a: idle }) },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();
        expect(emissions).toEqual([]);
      },
    }));
  });
});
