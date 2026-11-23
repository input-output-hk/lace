/** @vitest-environment jsdom */
import { ActivityType } from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-lib/util';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useActivityDetailsSheet } from '../src/pages/ActivityDetailsSheet/useActivityDetailsSheet';

import type { Activity, ActivityDetail } from '@lace-contract/activities';

const state = vi.hoisted(() => ({
  firstActivity: undefined as Activity | undefined,
  accountActivities: [] as Activity[],
  details: undefined as ActivityDetail | undefined,
  load: vi.fn(),
}));
vi.mock('@lace-contract/app', () => ({
  useConfig: () => ({ appConfig: {} }),
  useUICustomisation: () => [],
}));
vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@lace-lib/ui-toolkit', () => ({ useTheme: () => ({ theme: {} }) }));
vi.mock('../src/hooks', () => ({
  useDispatchLaceAction: () => state.load,
  useLaceSelector: (key: string, params?: { accountId: string }) => {
    switch (key) {
      case 'activities.selectActivityById':
        return state.firstActivity;
      case 'activities.selectByAccountId':
        return state.accountActivities.filter(
          a => a.accountId === params?.accountId,
        );
      case 'activities.selectActivityDetails':
        return state.details;
      case 'wallets.selectActiveNetworkAccounts':
        return ['one', 'two'].map(accountId => ({
          accountId,
          blockchainName: 'Midnight',
        }));
      case 'addresses.selectByAccountId':
        return [];
      case 'tokens.selectTokensMetadata':
        return {};
      default:
        throw new Error(`Unexpected selector: ${key}`);
    }
  },
}));

const activity = (account: string): Activity => ({
  accountId: AccountId(account),
  activityId: 'shared-transaction',
  type: ActivityType.Receive,
  timestamp: Timestamp(1),
  tokenBalanceChanges: [],
});
const props = (item: Activity) =>
  ({
    route: { params: { activityId: item.activityId, activity: item } },
  } as Parameters<typeof useActivityDetailsSheet>[0]);

beforeEach(() => {
  state.load.mockClear();
  state.firstActivity = activity('one');
  state.accountActivities = [activity('one'), activity('two')];
  state.details = { ...activity('one'), fee: '42', address: 'recipient' };
});
afterEach(cleanup);

describe('account-scoped activity details', () => {
  it('does not reuse another wallet’s details or fee for the same transaction', () => {
    const { result } = renderHook(() =>
      useActivityDetailsSheet(props(activity('two'))),
    );
    expect(result.current.accountId).toBe('two');
    expect(result.current.activityDetails).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    expect(state.load).toHaveBeenCalledExactlyOnceWith({
      activity: activity('two'),
      blockchainName: 'Midnight',
    });
  });

  it('keeps the owning account when reopening the same transaction from another wallet', () => {
    const { result, rerender } = renderHook(useActivityDetailsSheet, {
      initialProps: props(activity('one')),
    });
    expect(result.current.activityDetails?.fee).toBe('42');
    rerender(props(activity('two')));
    expect(result.current.activityDetails).toBeUndefined();
    act(() => {
      state.details = { ...activity('two'), fee: '', address: 'recipient' };
    });
    rerender(props(activity('two')));
    expect(result.current.activityDetails?.accountId).toBe('two');
    expect(result.current.activityDetails?.fee).toBe('');
    expect(result.current.isLoading).toBe(false);
  });

  it('uses updated activity data from the owning account', () => {
    const stale = { ...activity('two'), type: ActivityType.Pending };
    const { result } = renderHook(() => useActivityDetailsSheet(props(stale)));
    expect(result.current.activityType).toBe(ActivityType.Receive);
    expect(state.load).toHaveBeenCalledWith({
      activity: activity('two'),
      blockchainName: 'Midnight',
    });
  });
});
