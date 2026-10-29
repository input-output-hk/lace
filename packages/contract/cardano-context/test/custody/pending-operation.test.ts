import { ActivityType } from '@lace-contract/activities';
import { Timestamp } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { cardanoCustodyActivityMetadataOf } from '../../src/custody/pending-operation';

import type { Activity } from '@lace-contract/activities';
import type { AccountId } from '@lace-contract/wallet-repo';

const pendingWith = (custody: unknown): Activity => ({
  accountId: 'account' as AccountId,
  activityId: 'ab'.repeat(32),
  timestamp: Timestamp(0),
  tokenBalanceChanges: [],
  type: ActivityType.Pending,
  blockchainSpecific: {
    Cardano: { consumedInputs: [], producedOutputs: [], custody },
  } as Activity['blockchainSpecific'],
});

describe('cardanoCustodyActivityMetadataOf', () => {
  it('reads what a submission records', () => {
    const custody = {
      invalidHereafter: 1234,
      operation: 'issue-grant',
      status: 'outcome-unknown',
      reference: 'intent-42',
    };

    expect(cardanoCustodyActivityMetadataOf(pendingWith(custody))).toEqual(
      custody,
    );
  });

  it('reads an entry persisted before the operation and the status were recorded', () => {
    expect(
      cardanoCustodyActivityMetadataOf(pendingWith({ invalidHereafter: 1234 })),
    ).toEqual({ invalidHereafter: 1234 });
  });

  it('leaves out a field held in another shape than the wallet writes', () => {
    expect(
      cardanoCustodyActivityMetadataOf(
        pendingWith({
          invalidHereafter: 1234,
          operation: 7,
          status: 'settled',
          reference: null,
        }),
      ),
    ).toEqual({ invalidHereafter: 1234 });
  });

  it.each([
    ['no custody entry', undefined],
    ['a custody entry that is not an object', 'custody'],
    ['a custody entry without a validity bound', { status: 'pending' }],
    ['a validity bound that is not a number', { invalidHereafter: '1234' }],
  ])('is absent for an activity with %s', (_, custody) => {
    expect(cardanoCustodyActivityMetadataOf(pendingWith(custody))).toBe(
      undefined,
    );
  });

  it('is absent for an activity without Cardano metadata', () => {
    const activity: Activity = {
      accountId: 'account' as AccountId,
      activityId: 'ab'.repeat(32),
      timestamp: Timestamp(0),
      tokenBalanceChanges: [],
      type: ActivityType.Pending,
    };

    expect(cardanoCustodyActivityMetadataOf(activity)).toBe(undefined);
  });
});
