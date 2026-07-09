import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import { getTopOnChainActivity } from '../../../src/store/helpers/get-top-on-chain-activity-id';

import type { Activity } from '@lace-contract/activities';

const accountId = AccountId('account1');

const sendActivity = (id: string, slot?: number): Activity => ({
  accountId,
  activityId: id,
  timestamp: Timestamp(id.length),
  tokenBalanceChanges: [],
  type: ActivityType.Send,
  ...(slot !== undefined && {
    blockchainSpecific: { Cardano: { slot: Cardano.Slot(slot) } },
  }),
});

const pendingActivity = (id: string): Activity => ({
  accountId,
  activityId: id,
  timestamp: Timestamp(id.length),
  tokenBalanceChanges: [],
  type: ActivityType.Pending,
});

const rewardActivity = (id: string): Activity => ({
  accountId,
  activityId: id,
  timestamp: Timestamp(id.length),
  tokenBalanceChanges: [],
  type: ActivityType.Rewards,
});

describe('getTopOnChainActivity', () => {
  it('returns undefined when the account has no activities', () => {
    expect(getTopOnChainActivity({}, accountId)).toBeUndefined();
  });

  it('returns undefined when the account has only Pending activities', () => {
    expect(
      getTopOnChainActivity(
        { [accountId]: [pendingActivity('tx-pending')] },
        accountId,
      ),
    ).toBeUndefined();
  });

  it('skips a Pending entry on top and returns the Send entry below it', () => {
    const result = getTopOnChainActivity(
      {
        [accountId]: [
          pendingActivity('tx-pending'),
          sendActivity('tx-send', 12_345),
        ],
      },
      accountId,
    );
    expect(result).toEqual({
      activityId: 'tx-send',
      slot: Cardano.Slot(12_345),
    });
  });

  it('extracts the slot from blockchainSpecific.Cardano.slot when present', () => {
    const result = getTopOnChainActivity(
      { [accountId]: [sendActivity('tx-send', 999)] },
      accountId,
    );
    expect(result?.slot).toBe(Cardano.Slot(999));
  });

  it('returns slot=undefined when Cardano metadata is absent', () => {
    const result = getTopOnChainActivity(
      { [accountId]: [sendActivity('tx-send')] },
      accountId,
    );
    expect(result).toEqual({ activityId: 'tx-send', slot: undefined });
  });

  describe('without includeRewardActivities (default)', () => {
    it('skips Rewards entries and returns undefined when only Rewards exist', () => {
      expect(
        getTopOnChainActivity(
          { [accountId]: [rewardActivity('reward-1')] },
          accountId,
        ),
      ).toBeUndefined();
    });

    it('returns the Send entry, skipping a Rewards entry above it', () => {
      const result = getTopOnChainActivity(
        {
          [accountId]: [
            rewardActivity('reward-1'),
            sendActivity('tx-send', 12_345),
          ],
        },
        accountId,
      );
      expect(result).toEqual({
        activityId: 'tx-send',
        slot: Cardano.Slot(12_345),
      });
    });
  });

  describe('with includeRewardActivities', () => {
    it('returns the Rewards entry when it is the only entry', () => {
      const result = getTopOnChainActivity(
        { [accountId]: [rewardActivity('reward-1')] },
        accountId,
        true,
      );
      expect(result).toEqual({ activityId: 'reward-1', slot: undefined });
    });

    it('skips a Pending entry on top and returns the Rewards entry below it', () => {
      const result = getTopOnChainActivity(
        {
          [accountId]: [
            pendingActivity('tx-pending'),
            rewardActivity('reward-1'),
          ],
        },
        accountId,
        true,
      );
      expect(result).toEqual({ activityId: 'reward-1', slot: undefined });
    });

    it('returns the on-chain Send entry when it is above a Rewards entry', () => {
      const result = getTopOnChainActivity(
        {
          [accountId]: [
            sendActivity('tx-send', 12_345),
            rewardActivity('reward-1'),
          ],
        },
        accountId,
        true,
      );
      expect(result).toEqual({
        activityId: 'tx-send',
        slot: Cardano.Slot(12_345),
      });
    });
  });
});
