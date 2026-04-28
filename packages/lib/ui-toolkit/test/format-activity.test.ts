import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { formatDate, formatTime } from '@lace-lib/util-render';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  activityListRowKey,
  formatAndGroupActivitiesByDate,
} from '../src/utils/formatActivity';

import type { Activity } from '@lace-contract/activities';
import type { MetadataByTokenId } from '@lace-contract/tokens';

const fakeNowTimestamp = 1746526784955;
const hour = 1000 * 60 * 60;
const day = hour * 24;

vi.useFakeTimers().setSystemTime(new Date(fakeNowTimestamp));

const tokenId1 = TokenId('lovelace');
const tokenId2 = TokenId('0200000');
const tokenId3 = TokenId('0200001');

const tokensMetadataByTokenId: MetadataByTokenId = {
  [tokenId1]: {
    tokenId: tokenId1,
    decimals: 6,
    ticker: 'ADA',
    displayDecimalPlaces: 2,
    blockchainSpecific: {},
  },
  [tokenId2]: {
    tokenId: tokenId2,
    decimals: 2,
    ticker: 'tDust',
    displayDecimalPlaces: 2,
    blockchainSpecific: {},
  },
  [tokenId3]: {
    tokenId: tokenId3,
    decimals: 0,
    ticker: 'NFT',
    displayDecimalPlaces: 0,
    blockchainSpecific: {},
  },
};

const accountId = AccountId('account1');

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'activity.label.today': 'Today',
    'activity.history.send': 'Send',
    'activity.history.receive': 'Receive',
    'activity.history.reward': 'Reward',
    'activity.history.self': 'Self',
    'activity.history.failed.title': 'Failed',
    'activity.history.pending.title': 'Pending',
    'activity.history.failed.subtitle': 'Transaction failed',
    'activity.history.pending.sending': 'Sending...',
    'activity.history.pending.receiving': 'Receiving...',
    'activity.unknown.ticker': 'Unknown',
    'activity.history.delegation': 'Delegation',
    'activity.history.registration': 'Registration',
    'activity.history.deregistration': 'Deregistration',
    'activity.history.withdrawal': 'Withdrawal',
    'activity.assets.nfts': 'NFTs',
    'activity.assets.tokens': 'Tokens',
    'activity.assets.mixed': 'Mixed',
  };
  return translations[key] || key;
});

describe('formatAndGroupActivitiesByDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('returns empty array when no activities provided', () => {
      const result = formatAndGroupActivitiesByDate({
        activities: [],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result).toEqual([]);
    });

    it('groups activities by date and sorts them by timestamp descending', () => {
      const activity1: Activity = {
        accountId,
        activityId: 'activity1',
        timestamp: Timestamp(fakeNowTimestamp - 12 * day),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(1000000n) }, // 1 ADA
        ],
        type: ActivityType.Receive,
      };

      const activity2: Activity = {
        accountId,
        activityId: 'activity2',
        timestamp: Timestamp(fakeNowTimestamp - 3 * hour),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(500000n) }, // 0.5 ADA
        ],
        type: ActivityType.Send,
      };

      const activity3: Activity = {
        accountId,
        activityId: 'activity3',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(2000000n) }, // 2 ADA
        ],
        type: ActivityType.Send,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity1, activity2, activity3],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result).toEqual([
        // Today's activities (sorted by timestamp descending)
        expect.objectContaining({
          date: 'Today',
          items: [
            expect.objectContaining({
              id: 'activity3',
              rowKey: 'activity3-Send',
            }),
            expect.objectContaining({
              id: 'activity2',
              rowKey: 'activity2-Send',
            }),
          ],
        }),
        // Previous day's activities
        expect.objectContaining({
          date: formatDate({
            date: activity1.timestamp,
            type: 'local',
          }),
          items: [
            expect.objectContaining({
              id: 'activity1',
              rowKey: 'activity1-Receive',
            }),
          ],
        }),
      ]);
    });

    it('assigns distinct rowKeys when the same activity id appears for multiple activity types', () => {
      const sharedId = 'same-tx';
      const delegation: Activity = {
        accountId,
        activityId: sharedId,
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(-2000000n) },
        ],
        type: ActivityType.Delegation,
      };
      const registration: Activity = {
        accountId,
        activityId: sharedId,
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(-2000000n) },
        ],
        type: ActivityType.Registration,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [delegation, registration],
        t: mockT,
        tokensMetadataByTokenId,
      });

      const rowKeys = result[0].items.map(index => index.rowKey);
      expect(new Set(rowKeys).size).toBe(2);
      expect(rowKeys).toContain('same-tx-Delegation');
      expect(rowKeys).toContain('same-tx-Registration');
    });
  });

  describe('default activity type formatting with single balance change', () => {
    it('formats Send activity correctly', () => {
      const activity: Activity = {
        accountId,
        activityId: 'send-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(1000000n) },
        ],
        type: ActivityType.Send,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result).toEqual([
        {
          date: 'Today',
          dateIcon: 'Calendar03',
          items: [
            {
              id: activity.activityId,
              rowKey: activityListRowKey(activity),
              iconBackground: 'positive',
              iconName: 'ArrowUp03',
              info: {
                subtitle: formatTime({
                  date: activity.timestamp,
                  type: 'local',
                }),
                title: 'send-activity',
              },
              status: 'sent',
              timestamp: activity.timestamp,
              value: {
                title: {
                  amount: '1.00',
                  label: 'ADA',
                },
              },
            },
          ],
        },
      ]);
    });

    it('formats Receive activity correctly', () => {
      const activity: Activity = {
        accountId,
        activityId: 'receive-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(2000000n) },
        ],
        type: ActivityType.Receive,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result).toEqual([
        {
          date: 'Today',
          dateIcon: 'Calendar03',
          items: [
            {
              id: activity.activityId,
              rowKey: activityListRowKey(activity),
              iconBackground: 'positive',
              iconName: 'ArrowDown03',
              info: {
                subtitle: formatTime({
                  date: activity.timestamp,
                  type: 'local',
                }),
                title: 'receive-activity',
              },
              status: 'received',
              timestamp: activity.timestamp,
              value: {
                title: {
                  amount: '2.00',
                  label: 'ADA',
                },
              },
            },
          ],
        },
      ]);
    });

    it('formats Rewards activity correctly', () => {
      const activity: Activity = {
        accountId,
        activityId: 'rewards-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(5000000n) },
        ],
        type: ActivityType.Rewards,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result).toEqual([
        {
          date: 'Today',
          dateIcon: 'Calendar03',
          items: [
            {
              id: activity.activityId,
              rowKey: activityListRowKey(activity),
              iconBackground: 'positive',
              iconName: 'Gift',
              info: {
                subtitle: formatTime({
                  date: activity.timestamp,
                  type: 'local',
                }),
                title: 'Reward',
              },
              status: 'rewards',
              timestamp: activity.timestamp,
              value: {
                title: {
                  amount: '5.00',
                  label: 'ADA',
                },
              },
            },
          ],
        },
      ]);
    });

    it('formats Self activity correctly', () => {
      const activity: Activity = {
        accountId,
        activityId: 'self-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(1000000n) },
        ],
        type: ActivityType.Self,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result).toEqual([
        {
          date: 'Today',
          dateIcon: 'Calendar03',
          items: [
            {
              id: activity.activityId,
              rowKey: activityListRowKey(activity),
              iconBackground: 'secondary',
              iconName: 'Recycle03',
              info: {
                subtitle: formatTime({
                  date: activity.timestamp,
                  type: 'local',
                }),
                title: 'Self',
              },
              status: 'received',
              timestamp: activity.timestamp,
              value: {
                title: {
                  amount: '1.00',
                  label: 'ADA',
                },
              },
            },
          ],
        },
      ]);
    });

    it('formats Failed activity correctly', () => {
      const activity: Activity = {
        accountId,
        activityId: 'failed-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(1000000n) },
        ],
        type: ActivityType.Failed,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result).toEqual([
        {
          date: 'Today',
          dateIcon: 'Calendar03',
          items: [
            {
              id: activity.activityId,
              rowKey: activityListRowKey(activity),
              iconBackground: 'negative',
              iconName: 'AlertTriangle',
              info: {
                title: 'Failed',
              },
              status: 'failed',
              timestamp: activity.timestamp,
              value: {
                subtitle: 'Transaction failed',
              },
            },
          ],
        },
      ]);
    });

    it('formats Pending activity correctly', () => {
      const activity: Activity = {
        accountId,
        activityId: 'pending-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(1000000n) },
        ],
        type: ActivityType.Pending,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result).toEqual([
        {
          date: 'Today',
          dateIcon: 'Calendar03',
          items: [
            {
              id: activity.activityId,
              rowKey: activityListRowKey(activity),
              iconBackground: 'neutral',
              iconName: 'Loading03',
              info: {
                title: 'Pending',
              },
              status: 'pending',
              timestamp: activity.timestamp,
              value: {
                subtitle: 'Receiving...',
              },
            },
          ],
        },
      ]);
    });

    it('formats Delegation activity correctly', () => {
      const activity: Activity = {
        accountId,
        activityId: 'delegation-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(-2000000n) },
        ],
        type: ActivityType.Delegation,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result[0].items[0]).toMatchObject({
        id: activity.activityId,
        rowKey: activityListRowKey(activity),
        iconBackground: 'secondary',
        iconName: 'ArrowUp03',
        status: 'delegation',
        info: {
          title: 'Delegation',
        },
      });
    });

    it('formats Registration activity correctly', () => {
      const activity: Activity = {
        accountId,
        activityId: 'registration-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(-2000000n) },
        ],
        type: ActivityType.Registration,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result[0].items[0]).toMatchObject({
        id: activity.activityId,
        rowKey: activityListRowKey(activity),
        iconBackground: 'secondary',
        iconName: 'ArrowUp03',
        status: 'registration',
        info: {
          title: 'Registration',
        },
      });
    });

    it('formats Deregistration activity correctly', () => {
      const activity: Activity = {
        accountId,
        activityId: 'deregistration-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(1995000n) },
        ],
        type: ActivityType.Deregistration,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result[0].items[0]).toMatchObject({
        id: activity.activityId,
        rowKey: activityListRowKey(activity),
        iconBackground: 'secondary',
        iconName: 'ArrowDown03',
        status: 'deregistration',
        info: {
          title: 'Deregistration',
        },
      });
    });

    it('formats Withdrawal activity correctly', () => {
      const activity: Activity = {
        accountId,
        activityId: 'withdrawal-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(5000000n) },
        ],
        type: ActivityType.Withdrawal,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result[0].items[0]).toMatchObject({
        id: activity.activityId,
        rowKey: activityListRowKey(activity),
        iconBackground: 'secondary',
        iconName: 'ArrowDown03',
        status: 'withdrawal',
        info: {
          title: 'Withdrawal',
        },
      });
    });
  });

  describe('ui customizations', () => {
    it('takes an optional customization to get the main token balance change', () => {
      const activity: Activity = {
        accountId,
        activityId: 'send-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(1000000n) },
          { tokenId: tokenId2, amount: BigNumber(200n) },
        ],
        type: ActivityType.Send,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
        // Return the second token of that activity as the main token
        getMainTokenBalanceChange: tokenBalanceChanges => ({
          ...tokenBalanceChanges[1],
        }),
      });

      expect(result).toEqual([
        {
          date: 'Today',
          dateIcon: 'Calendar03',
          items: [
            {
              id: activity.activityId,
              rowKey: activityListRowKey(activity),
              iconBackground: 'positive',
              iconName: 'ArrowUp03',
              info: {
                subtitle: formatTime({
                  date: activity.timestamp,
                  type: 'local',
                }),
                title: 'send-activity',
              },
              status: 'sent',
              timestamp: activity.timestamp,
              value: {
                title: {
                  // Should be the second token of that activity
                  amount: '2.00',
                  label: 'tDust',
                },
              },
            },
          ],
        },
      ]);
    });

    it('takes an optional customization for the tokens info summary', () => {
      const activity: Activity = {
        accountId,
        activityId: 'send-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(1000000n) },
        ],
        type: ActivityType.Send,
      };

      const expectedItemValue = {
        title: {
          amount: 'custom',
          label: '[TOKEN]',
        },
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
        // Provide customization for the token info summary
        getTokensInfoSummary: () => expectedItemValue,
      });

      expect(result).toEqual([
        {
          date: 'Today',
          dateIcon: 'Calendar03',
          items: [
            {
              id: activity.activityId,
              rowKey: activityListRowKey(activity),
              iconBackground: 'positive',
              iconName: 'ArrowUp03',
              info: {
                subtitle: formatTime({
                  date: activity.timestamp,
                  type: 'local',
                }),
                title: 'send-activity',
              },
              status: 'sent',
              timestamp: activity.timestamp,
              // should be the custom value returned by the customization
              value: expectedItemValue,
            },
          ],
        },
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle activities with empty token balance changes', () => {
      const activity: Activity = {
        accountId,
        activityId: 'empty-tokens-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [],
        type: ActivityType.Send,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      const item = result[0].items[0];
      expect(item.rowKey).toBe(activityListRowKey(activity));
      expect(
        'title' in item.value &&
          item.value.title &&
          'amount' in item.value.title &&
          item.value.title.amount,
      ).toBe('');
      expect(
        'title' in item.value &&
          item.value.title &&
          'label' in item.value.title &&
          item.value.title.label,
      ).toBe('Unknown');
    });

    it('should preserve original activities array (immutability)', () => {
      const originalActivities: Activity[] = [
        {
          accountId,
          activityId: 'activity1',
          timestamp: Timestamp(fakeNowTimestamp),
          tokenBalanceChanges: [
            { tokenId: tokenId1, amount: BigNumber(1000000n) },
          ],
          type: ActivityType.Send,
        },
      ];

      const activitiesCopy = [...originalActivities];

      formatAndGroupActivitiesByDate({
        activities: originalActivities,
        t: mockT,
        tokensMetadataByTokenId,
      });

      // Original array should be unchanged
      expect(originalActivities).toEqual(activitiesCopy);
    });
  });

  describe('dateIcon property', () => {
    it('should include dateIcon property in all sections', () => {
      const activity: Activity = {
        accountId,
        activityId: 'test-activity',
        timestamp: Timestamp(fakeNowTimestamp),
        tokenBalanceChanges: [
          { tokenId: tokenId1, amount: BigNumber(1000000n) },
        ],
        type: ActivityType.Send,
      };

      const result = formatAndGroupActivitiesByDate({
        activities: [activity],
        t: mockT,
        tokensMetadataByTokenId,
      });

      expect(result[0].dateIcon).toBe('Calendar03');
    });
  });
});
