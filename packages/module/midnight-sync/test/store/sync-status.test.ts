import { Percent } from '@cardano-sdk/util';
import { Subject } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { describe, expect, it } from 'vitest';

import { observeSyncStatus } from '../../src/store/sync-status';

import type { MidnightWallet } from '@lace-contract/midnight-context';
import type { ObservedValueOf } from 'rxjs';

type Progress = ObservedValueOf<MidnightWallet['syncProgress$']>;
type Status = ObservedValueOf<ReturnType<typeof observeSyncStatus>>;
const snapshot = (ratio = 0.48, complete = false): Progress => ({
  shielded: Percent(ratio),
  dust: Percent(ratio),
  unshielded: Percent(1),
  isStrictlyComplete: { shielded: complete, dust: complete, unshielded: true },
  isConnected: { shielded: true, dust: true, unshielded: true },
  indexerLiveness: 'InSync',
});

const trace = (
  events: Array<[number, Progress]>,
  flags: Array<[number, boolean]> = [[0, true]],
  stopAt = 2000,
) => {
  const result: Array<{ at: number; value: Status }> = [];
  const scheduler = new TestScheduler((a, b) => {
    expect(a).toEqual(b);
  });
  scheduler.run(() => {
    const progress$ = new Subject<Progress>();
    const enabled$ = new Subject<boolean>();
    const subscription = observeSyncStatus(progress$, enabled$).subscribe(
      value => {
        result.push({ at: scheduler.now(), value });
      },
    );
    for (const [at, isEnabled] of flags)
      scheduler.schedule(() => {
        enabled$.next(isEnabled);
      }, at);
    for (const [at, value] of events)
      scheduler.schedule(() => {
        progress$.next(value);
      }, at);
    scheduler.schedule(() => {
      subscription.unsubscribe();
    }, stopAt);
  });
  return result;
};

describe('observeSyncStatus', () => {
  it.each(['dust', 'shielded', 'unshielded'] as const)(
    'waits for the first %s update without declaring a disconnect or completion',
    component => {
      const waiting = {
        ...snapshot(1, true),
        isConnected: { ...snapshot().isConnected!, [component]: false },
      };
      const rows = trace([
        [0, { ...waiting, indexerLiveness: 'Unknown' }],
        [100, waiting],
        [200, snapshot(1, true)],
      ]);
      expect(
        rows.map(({ at, value }) => [
          at,
          value.statusDetail,
          value.isComplete,
          value.progress,
        ]),
      ).toEqual([
        [0, 'v2.sync-status.detail.checking-chain', false, undefined],
        [100, 'v2.sync-status.detail.waiting-for-data', false, undefined],
        [200, undefined, true, 1],
      ]);
    },
  );

  it('retains connection evidence while waiting for the feature flag', () => {
    const rows = trace(
      [
        [0, snapshot(1, true)],
        [
          100,
          {
            ...snapshot(),
            isConnected: { dust: false, shielded: true, unshielded: true },
          },
        ],
      ],
      [[200, true]],
    );
    expect(rows[0].value.statusDetail).toBe(
      'v2.sync-status.detail.disconnected',
    );
  });

  it('starts fresh connection history for each subscription', () => {
    const progress$ = new Subject<Progress>();
    const enabled$ = new Subject<boolean>();
    const status$ = observeSyncStatus(progress$, enabled$);
    const first = status$.subscribe();
    enabled$.next(true);
    progress$.next(snapshot(1, true));
    first.unsubscribe();
    const rows: Status[] = [];
    const second = status$.subscribe(value => rows.push(value));
    enabled$.next(true);
    progress$.next({
      ...snapshot(1, true),
      isConnected: { dust: false, shielded: false, unshielded: false },
    });
    expect(rows[0]).toMatchObject({
      statusDetail: 'v2.sync-status.detail.waiting-for-data',
      isComplete: false,
      progress: undefined,
    });
    second.unsubscribe();
  });

  it('resets only the component crossing a protocol boundary', () => {
    const v8 = {
      ...snapshot(1, true),
      protocolVersions: { dust: 8n, shielded: 8n, unshielded: 8n },
    };
    const v9Dust = {
      ...v8,
      protocolVersions: { ...v8.protocolVersions, dust: 9n },
      isConnected: { dust: false, shielded: true, unshielded: true },
    };
    const rows = trace([
      [0, v8],
      [100, v9Dust],
      [
        200,
        { ...v9Dust, isConnected: { ...v9Dust.isConnected, shielded: false } },
      ],
      [
        300,
        {
          ...v9Dust,
          isConnected: { dust: true, shielded: true, unshielded: true },
        },
      ],
      [400, v9Dust],
    ]);
    expect(rows.map(row => [row.at, row.value.statusDetail])).toEqual([
      [0, undefined],
      [100, 'v2.sync-status.detail.waiting-for-data'],
      [200, 'v2.sync-status.detail.disconnected'],
      [300, undefined],
      [400, 'v2.sync-status.detail.disconnected'],
    ]);
  });

  it('only reports waiting for enabled components and still prioritizes health failures', () => {
    const waiting = {
      ...snapshot(1, true),
      isConnected: { dust: true, shielded: true, unshielded: false },
    };
    const rows = trace(
      [
        [0, waiting],
        [200, { ...waiting, indexerLiveness: 'Unavailable' }],
      ],
      [
        [0, false],
        [100, true],
      ],
    );
    expect(
      rows.map(row => [row.at, row.value.statusDetail, row.value.isComplete]),
    ).toEqual([
      [0, undefined, true],
      [100, 'v2.sync-status.detail.waiting-for-data', false],
      [200, 'v2.sync-status.detail.check-failed', false],
    ]);
  });

  it.each([
    ['Behind', 'indexer-behind'],
    ['Ahead', 'indexer-ahead'],
    ['Unknown', 'checking-chain'],
    ['Unavailable', 'check-failed'],
    ['WrongNetwork', 'chain-mismatch'],
  ] as const)('provides a concise reason for %s', (indexerLiveness, detail) => {
    expect(
      trace([[0, { ...snapshot(), indexerLiveness }]])[0].value.statusDetail,
    ).toBe(`v2.sync-status.detail.${detail}`);
  });

  it('clears health details immediately on recovery at an unchanged percentage', () => {
    const rows = trace([
      [0, { ...snapshot(), indexerLiveness: 'Unavailable' }],
      [100, snapshot()],
    ]);
    expect(rows.map(row => [row.at, row.value.statusDetail])).toEqual([
      [0, 'v2.sync-status.detail.check-failed'],
      [100, undefined],
    ]);
  });

  it('does not publish thousands of changes within the displayed percent', () => {
    const events: Array<[number, Progress]> = Array.from(
      { length: 2000 },
      (_, index) => [index, snapshot(0.48 + index / 1000000)],
    );
    expect(trace(events)).toHaveLength(1);
  });

  it('bounds numeric updates and retains the last value', () => {
    const rows = trace([
      [0, snapshot()],
      [100, snapshot(0.49)],
      [200, snapshot(0.5)],
    ]);
    expect(rows.map(row => [row.at, row.value.progress])).toEqual([
      [0, 0.48],
      [500, 0.5],
    ]);
  });

  it('does not redispatch a percentage after a suppressed excursion', () => {
    expect(
      trace([
        [0, snapshot(0.48)],
        [100, snapshot(0.49)],
        [200, snapshot(0.482)],
      ]),
    ).toHaveLength(1);
  });

  it('does not repeat a visible error as numeric work changes', () => {
    expect(
      trace([
        [0, { ...snapshot(0.48), indexerLiveness: 'WrongNetwork' }],
        [100, { ...snapshot(0.49), indexerLiveness: 'WrongNetwork' }],
      ]),
    ).toHaveLength(1);
  });

  it('publishes completion immediately and cancels older trailing progress', () => {
    const rows = trace([
      [0, snapshot()],
      [100, snapshot(0.49)],
      [200, snapshot(1, true)],
    ]);
    expect(rows.map(row => [row.at, row.value.isComplete])).toEqual([
      [0, false],
      [200, true],
    ]);
  });

  it('publishes loss and recovery of health within a throttle window', () => {
    const complete = snapshot(1, true);
    const rows = trace([
      [0, complete],
      [100, { ...complete, indexerLiveness: 'Behind' }],
      [200, complete],
    ]);
    expect(rows.map(row => [row.at, row.value.isComplete])).toEqual([
      [0, true],
      [100, false],
      [200, true],
    ]);
  });

  it('does not replay old completion when the feature flag arrives late', () => {
    const rows = trace(
      [
        [0, snapshot(1, true)],
        [100, snapshot()],
      ],
      [[900, true]],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      at: 900,
      value: { isComplete: false, progress: 0.48 },
    });
  });

  it('recomputes on an enabled-components change without a wallet emission', () => {
    const progress = {
      ...snapshot(1, true),
      unshielded: Percent(0.2),
      isStrictlyComplete: { shielded: true, dust: true, unshielded: false },
    };
    const rows = trace(
      [[0, progress]],
      [
        [0, false],
        [100, true],
        [200, false],
      ],
    );
    expect(rows.map(row => [row.at, row.value.isComplete])).toEqual([
      [0, true],
      [100, false],
      [200, true],
    ]);
  });

  it.each([
    'Behind',
    'Ahead',
    'Unavailable',
    'Unknown',
    'WrongNetwork',
  ] as const)(
    'does not report completion for %s even if counters agree',
    indexerLiveness => {
      expect(
        trace([[0, { ...snapshot(1, true), indexerLiveness }]])[0].value
          .isComplete,
      ).toBe(false);
    },
  );

  it.each(['Behind', 'Ahead', 'Unavailable', 'Unknown'] as const)(
    'does not turn caught-up counters into 99 percent while %s',
    indexerLiveness => {
      const rows = trace([
        [0, snapshot(1, true)],
        [100, { ...snapshot(1, true), indexerLiveness }],
        [200, snapshot(1, true)],
      ]);
      expect(
        rows.map(row => [row.at, row.value.progress, row.value.isComplete]),
      ).toEqual([
        [0, 1, true],
        [100, undefined, false],
        [200, 1, true],
      ]);
    },
  );

  it('keeps unknown targets indeterminate until evidence arrives', () => {
    const rows = trace([
      [0, { ...snapshot(), dust: undefined }],
      [100, snapshot()],
    ]);
    expect(rows.map(row => [row.at, row.value.progress])).toEqual([
      [0, undefined],
      [100, 0.48],
    ]);
  });

  it('hides numeric progress immediately on connection loss', () => {
    const complete = snapshot(1, true);
    const rows = trace([
      [0, complete],
      [
        100,
        {
          ...complete,
          isConnected: { dust: false, shielded: true, unshielded: true },
        },
      ],
    ]);
    expect(rows[1]).toMatchObject({
      at: 100,
      value: {
        isConnected: false,
        isComplete: false,
        progress: undefined,
        statusDetail: 'v2.sync-status.detail.disconnected',
      },
    });
  });

  it('cancels pending numeric work on unsubscribe', () => {
    expect(
      trace(
        [
          [0, snapshot()],
          [100, snapshot(0.5)],
        ],
        [[0, true]],
        250,
      ),
    ).toHaveLength(1);
  });
});
