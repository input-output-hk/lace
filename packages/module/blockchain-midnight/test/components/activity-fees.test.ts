/** @vitest-environment jsdom */
import type { ReactElement, ReactNode } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { cloneElement, createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activityDetailsSheetUICustomisation } from '../../src/exported-modules/activity-details-sheet-ui-customisation';

import type { ActivityDetailsContentProps } from '@lace-contract/activities';

const state = vi.hoisted(() => ({
  isSupported: true,
  accounts: [{ accountId: 'account', walletId: 'owner-wallet' }],
  cache: { account: { hash: '42' }, other: { hash: '99' } },
  navigate: vi.fn(),
}));
vi.mock('../../src/hooks', () => ({
  useLaceSelector: (key: string) => {
    switch (key) {
      case 'network.selectNetworkType':
        return 'testnet';
      case 'midnightContext.selectSupportsFeeRecovery':
        return state.isSupported;
      case 'wallets.selectActiveNetworkAccounts':
        return state.accounts;
      default:
        return state.cache;
    }
  },
}));
vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { navigate: state.navigate },
  StackRoutes: { AccountDetails: 'AccountDetails' },
}));
vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ components }: { components: { accountOptions: ReactElement } }) =>
    createElement(
      'span',
      {},
      'You can fetch missing fees in ',
      cloneElement(components.accountOptions, {}, 'account options'),
      '.',
    ),
}));
vi.mock('@lace-contract/midnight-context', () => ({
  DUST_TOKEN_DECIMALS: 0,
  getDustTokenTickerByNetwork: () => 'tDUST',
}));
vi.mock('react-native', () => ({
  StyleSheet: { create: (x: unknown) => x },
  Platform: { OS: 'web' },
  View: ({ children }: { children: ReactNode }) =>
    createElement('div', {}, children),
}));
vi.mock('@lace-lib/ui-toolkit', () => {
  const container = ({ children }: { children: ReactNode }) =>
    createElement('div', {}, children);
  return {
    Column: container,
    CustomTag: container,
    Icon: container,
    Text: {
      M: container,
      S: ({
        children,
        onPress,
        accessibilityRole,
        accessibilityLabel,
        testID,
      }: {
        children: ReactNode;
        onPress?: () => void;
        accessibilityRole?: string;
        accessibilityLabel?: string;
        testID?: string;
      }) =>
        createElement(
          'span',
          {
            onClick: onPress,
            role: accessibilityRole,
            'aria-label': accessibilityLabel,
            'data-testid': testID,
          },
          children,
        ),
    },
    spacing: {},
    formatTokenBalanceChanges: () => '',
  };
});
vi.mock('@lace-lib/util-render', () => ({
  createUICustomisation: (config: unknown) => config,
  formatAmountToLocale: (fee: string) => fee,
  formatDate: () => '',
  formatTime: () => '',
}));
vi.mock('../../src/components/ActivityDetailItem', () => ({
  ActivityDetailItem: ({ label, value }: { label: string; value: ReactNode }) =>
    createElement('div', { 'data-testid': label }, value),
}));
beforeEach(() => {
  state.isSupported = true;
  state.accounts = [{ accountId: 'account', walletId: 'owner-wallet' }];
  state.navigate.mockClear();
});
afterEach(cleanup);

const renderActivity = (
  accountId: string,
  fee: string | undefined,
  { activityId = 'HASH', type = 'Receive' } = {},
) => {
  const Component =
    activityDetailsSheetUICustomisation().ActivityDetailsContent;
  return render(
    createElement(Component, {
      activityDetail: { accountId, fee, timestamp: 1, type },
      activityId,
      tokensMetadataByTokenId: {},
    } as ActivityDetailsContentProps),
  );
};
const linkLabel = 'midnight.fee-recovery.open-account-options';

describe('Midnight activity fee display', () => {
  it.each([
    ['account', '', '42 tDUST'],
    ['account', undefined, '42 tDUST'],
    ['account', '0', '0 tDUST'],
    ['account', '12', '12 tDUST'],
    ['uncached', '', 'midnight.fee-recovery.unavailable'],
  ])(
    'uses only the selected account cache and preserves SDK fee %s/%s',
    (accountId, fee, expected) => {
      renderActivity(accountId, fee);
      expect(
        screen.getByTestId('activity.activity-detail-drawer.fee').textContent,
      ).toBe(expected);
      expect(screen.queryByRole('link', { name: linkLabel })).toBeNull();
    },
  );

  it.each(['', undefined])(
    'links a missing fee to its owning account without starting a lookup (%s)',
    fee => {
      renderActivity('account', fee, { activityId: 'uncached' });
      expect(
        screen.getByTestId('activity-details-missing-fee-help'),
      ).toBeTruthy();
      const link = screen.getByRole('link', { name: linkLabel });
      expect(
        screen.getByTestId('activity-details-missing-fee-help').contains(link),
      ).toBe(true);
      expect(screen.queryByRole('button')).toBeNull();
      fireEvent.click(link);
      expect(state.navigate).toHaveBeenCalledExactlyOnceWith('AccountDetails', {
        accountId: 'account',
        walletId: 'owner-wallet',
      });
    },
  );

  it('does not offer a recovery path when fee recovery is unavailable', () => {
    state.isSupported = false;
    renderActivity('account', '', { activityId: 'uncached' });
    expect(screen.queryByRole('link', { name: linkLabel })).toBeNull();
    expect(
      screen.queryByTestId('activity-details-missing-fee-help'),
    ).toBeNull();
  });

  it('keeps recovered fees visible when fee recovery is disabled', () => {
    state.isSupported = false;
    renderActivity('account', '');
    expect(
      screen.getByTestId('activity.activity-detail-drawer.fee').textContent,
    ).toBe('42 tDUST');
    expect(screen.queryByRole('link', { name: linkLabel })).toBeNull();
  });

  it.each(['Pending', 'Failed'])(
    'does not offer finalized-fee recovery for a %s transaction',
    type => {
      renderActivity('account', '', { activityId: 'uncached', type });
      expect(screen.queryByRole('link', { name: linkLabel })).toBeNull();
    },
  );

  it('does not label a detail that is still loading as missing a fee', () => {
    const Component =
      activityDetailsSheetUICustomisation().ActivityDetailsContent;
    render(
      createElement(Component, {
        activityId: 'uncached',
        tokensMetadataByTokenId: {},
      } as ActivityDetailsContentProps),
    );
    expect(screen.queryByText('midnight.fee-recovery.unavailable')).toBeNull();
    expect(screen.queryByRole('link', { name: linkLabel })).toBeNull();
  });
});
