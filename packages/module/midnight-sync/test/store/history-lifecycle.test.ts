import { ActivityType, activitiesActions } from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import { BehaviorSubject, of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import {
  mapTxHistoryEntryToActivity,
  updateActivities,
} from '../../src/store/side-effects/activities';
import { formatFee } from '../../src/store/utils/activities';

import type { MidnightWallet } from '@lace-contract/midnight-context';
import type { WalletEntry } from '@midnightntwrk/wallet-sdk';

const accountId = AccountId('history-lifecycle');
const at = new Date('2026-11-03T12:00:00Z');
const entry = (overrides: Partial<WalletEntry> = {}): WalletEntry => ({
  hash: 'canonical',
  identifiers: ['pending-id'],
  lifecycle: { status: 'pending', submittedAt: at },
  unshielded: {
    id: 1,
    spentUtxos: [],
    createdUtxos: [
      {
        value: 3n,
        owner: '00'.repeat(32),
        tokenType: '00'.repeat(32),
        intentHash: '11'.repeat(32),
        outputIndex: 0,
      },
    ],
  },
  ...overrides,
});
const mapEntry = (txHistoryEntry: WalletEntry) =>
  mapTxHistoryEntryToActivity({
    accountId,
    txHistoryEntry,
    networkId: 'undeployed',
  });

describe('v2 transaction history lifecycle', () => {
  it('uses submission time for pending entries without inventing a fee or success', () => {
    expect(mapEntry(entry())).toMatchObject({
      activityId: 'canonical',
      type: ActivityType.Pending,
      timestamp: at.getTime(),
    });
    expect(formatFee(undefined)).toBe('');
    expect(formatFee(null)).toBe('');
    expect(formatFee(0n)).toBe('0');
  });

  it('marks a fork-orphaned entry failed using its rejection date', () => {
    expect(
      mapEntry(
        entry({
          lifecycle: {
            status: 'rejected',
            rejectedAt: at,
            reason: 'orphaned-by-protocol-upgrade',
          },
        }),
      ),
    ).toMatchObject({ type: ActivityType.Failed, timestamp: at.getTime() });
  });

  it.each(['SUCCESS', 'PARTIAL_SUCCESS'] as const)(
    'maps finalized %s with block time to received value',
    status => {
      expect(
        mapEntry(
          entry({
            status,
            lifecycle: {
              status: 'finalized',
              finalizedBlock: { hash: 'block', height: 1, timestamp: at },
            },
          }),
        ),
      ).toMatchObject({ type: ActivityType.Receive, timestamp: at.getTime() });
    },
  );

  it('waits for missing or invalid dates and does not label absent status as success', () => {
    expect(
      mapEntry(entry({ lifecycle: { status: 'finalized' } })),
    ).toBeUndefined();
    expect(mapEntry(entry({ timestamp: new Date('invalid') }))).toBeUndefined();
    expect(
      mapEntry(entry({ timestamp: at, lifecycle: { status: 'finalized' } })),
    ).toMatchObject({ type: ActivityType.Pending });
  });

  it('replaces optimistic aliases with the canonical entry while preserving another canonical hash', () => {
    const history = new BehaviorSubject([
      entry({ identifiers: ['pending-id', 'other'] }),
      entry({ hash: 'other', identifiers: [] }),
    ]);
    const wallet = {
      accountId,
      networkId: 'undeployed',
      transactionHistory$: history,
    } as unknown as MidnightWallet;
    const effects = updateActivities(
      {} as never,
      {
        features: { selectLoadedFeatures$: of({ featureFlags: [] }) },
      } as never,
      {
        actions: activitiesActions,
        midnightWallets$: new BehaviorSubject({ [accountId]: wallet }),
      } as never,
    );
    const emitted: { type: string; payload: unknown }[] = [];
    const subscription = effects.subscribe(action => emitted.push(action));
    try {
      expect(emitted).toContainEqual(
        activitiesActions.activities.removeActivities({
          accountId,
          activityIds: ['pending-id'],
        }),
      );
      history.next([
        entry({
          status: 'SUCCESS',
          timestamp: at,
          lifecycle: { status: 'finalized' },
        }),
      ]);
      const upserts = emitted.filter(
        action =>
          action.type === activitiesActions.activities.upsertActivities.type,
      );
      expect(upserts.at(-1)?.payload).toMatchObject({
        activities: [{ activityId: 'canonical', type: ActivityType.Receive }],
      });
      history.next([entry({ lifecycle: { status: 'finalized' } })]);
      expect(emitted).toContainEqual(
        activitiesActions.activities.removeActivities({
          accountId,
          activityIds: ['canonical', 'pending-id'],
        }),
      );
    } finally {
      subscription.unsubscribe();
    }
  });
});
