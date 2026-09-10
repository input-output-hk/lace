/**
 * @vitest-environment jsdom
 */

import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseLaceSelector = vi.fn<(key: string) => unknown>();

vi.mock('../../src/hooks', () => ({
  // The factory is hoisted above the mock's declaration, so it may only be
  // dereferenced lazily, from inside the replacement hook.
  useLaceSelector: (key: string): unknown => mockUseLaceSelector(key),
  useDispatchLaceAction: () => vi.fn(),
}));

vi.mock('@lace-contract/analytics', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

vi.mock('@lace-contract/app', () => ({
  useAccountSupportsNfts: () => ({
    accountSupportsNfts: () => true,
    hasAnyAccountNftSupport: true,
  }),
  useNftViewReset: () => undefined,
  useUICustomisation: () => [],
}));

vi.mock('@lace-contract/cardano-context', () => ({
  convertLovelacesToAda: () => 0,
  DEFAULT_DECIMALS: 2,
  resolveAccountNameSuffix: () => undefined,
}));

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lace-contract/token-pricing', () => ({
  FEATURE_FLAG_TOKEN_PRICING: 'token-pricing',
  getTokenPriceId: () => undefined,
  TOKEN_PRICING_NETWORK_TYPE: 'mainnet',
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  Blockchains: {
    Bitcoin: () => null,
    Cardano: () => null,
    Midnight: () => null,
  },
  Icon: () => null,
  TabBarMetrics: { vertical: { width: 0 } },
  useTheme: () => ({ isSideMenu: false }),
}));

vi.mock('@lace-lib/util-render', () => ({
  formatLocaleNumber: () => '0',
  getTokenFiatValueTruncated: () => 0,
}));

vi.mock('react-native', () => ({
  useWindowDimensions: () => ({ height: 600, width: 800 }),
}));

vi.mock('../../src/pages/portfolio/accountCardTransformer', () => ({
  transformAccountsToCards: () => [],
}));

vi.mock('../../src/pages/portfolio/useCarouselManagement', () => ({
  useCarouselManagement: () => ({}),
}));

vi.mock('../../src/pages/portfolio/usePortfolioActions', () => ({
  usePortfolioActions: () => ({
    portfolioActions: {},
    createSendAction: () => () => {},
    createAccountsAction: () => () => {},
  }),
}));

vi.mock('../../src/pages/portfolio/usePriceHistory', () => ({
  usePriceHistory: () => ({ getPriceHistoryData: () => ({ data: [] }) }),
}));

vi.mock('../../src/pages/portfolio/useScrollAnimation', () => ({
  useScrollAnimation: () => ({
    scrollHandler: () => {},
    animatedContainerStyle: {},
    activeAssetView: { value: 0 },
    activeAccountIndex: { value: 0 },
  }),
}));

import { usePortfolio } from '../../src/pages/portfolio/usePortfolio';

import type { AnyAccount } from '@lace-contract/wallet-repo';

/** Matches `INITIAL_LOAD_IDLE_TIMEOUT_MS` in `usePortfolio`. */
const INITIAL_LOAD_IDLE_TIMEOUT_MS = 30_000;

const cardanoAccount = {
  accountId: AccountId('account-1'),
  walletId: WalletId('wallet-1'),
  blockchainName: 'Cardano',
  metadata: { name: 'Account 1' },
} as unknown as AnyAccount;

const ACCOUNTS = [cardanoAccount];
const NO_ACCOUNTS: AnyAccount[] = [];

type SyncStatus = 'error' | 'idle' | 'synced' | 'syncing';

type SyncGateState = {
  accounts: AnyAccount[];
  networkKey: string;
  syncStatus: SyncStatus;
  hasEverSynced: boolean;
  hasSyncFailure: boolean;
};

const state: SyncGateState = {
  accounts: ACCOUNTS,
  networkKey: 'cardano-mainnet',
  syncStatus: 'syncing',
  hasEverSynced: false,
  hasSyncFailure: false,
};

const EMPTY_FEATURES = { featureFlags: [] };
const EMPTY_MAP = {};
const EMPTY_LIST: never[] = [];

const renderPortfolio = (overrides: Partial<SyncGateState> = {}) => {
  Object.assign(state, overrides);

  return renderHook(() =>
    usePortfolio({ headerHeight: 100, headerTopInset: 0 }),
  );
};

beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(state, {
    accounts: ACCOUNTS,
    networkKey: 'cardano-mainnet',
    syncStatus: 'syncing',
    hasEverSynced: false,
    hasSyncFailure: false,
  });

  mockUseLaceSelector.mockImplementation((key: string) => {
    switch (key) {
      case 'features.selectLoadedFeatures':
        return EMPTY_FEATURES;
      case 'network.selectNetworkType':
        return 'mainnet';
      case 'network.selectNetworkKey':
        return state.networkKey;
      case 'wallets.selectAll':
        return EMPTY_LIST;
      case 'wallets.selectActiveNetworkAccounts':
        return state.accounts;
      case 'wallets.selectActiveAccountContext':
        return undefined;
      case 'sync.selectGlobalSyncStatus':
        return state.syncStatus;
      case 'sync.selectActiveNetworkHasEverSynced':
        return state.hasEverSynced;
      case 'cardanoContext.selectActiveNetworkHasSyncFailure':
        return state.hasSyncFailure;
      case 'cardanoContext.selectRewardAccountDetails':
      case 'cardanoContext.selectFlaggedExploitsByAccount':
      case 'tokens.selectTokensGroupedByAccount':
      case 'tokenPricing.selectPrices':
      case 'tokenPricing.selectPriceHistory':
        return EMPTY_MAP;
      case 'tokens.selectAggregatedFungibleTokensForVisibleAccounts':
      case 'activities.selectByAccountId':
        return EMPTY_LIST;
      case 'tokenPricing.selectCurrencyPreference':
        return { name: 'USD', ticker: '$' };
      case 'tokenPricing.selectIsPricingStale':
        return false;
      case 'ui.getIsPortfolioView':
        return true;
      default:
        throw new Error(`Unexpected useLaceSelector: ${key}`);
    }
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('usePortfolio initial-load gate', () => {
  it('shows the skeleton while the first sync round is in flight', () => {
    const { result } = renderPortfolio({ syncStatus: 'syncing' });

    expect(result.current.isLoading).toBe(true);
  });

  it('keeps the skeleton for an in-flight round past the idle timeout', () => {
    const { result } = renderPortfolio({ syncStatus: 'syncing' });

    act(() => {
      vi.advanceTimersByTime(INITIAL_LOAD_IDLE_TIMEOUT_MS);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('exits the skeleton when an operation fails inside a round still in flight', () => {
    const { result } = renderPortfolio({ syncStatus: 'error' });

    expect(result.current.isLoading).toBe(false);
  });

  it('keeps the skeleton while the first round has not been enqueued yet', () => {
    const { result } = renderPortfolio({ syncStatus: 'idle' });

    expect(result.current.isLoading).toBe(true);
  });

  it('exits the skeleton when no sync round starts within the initial-load window', () => {
    const { result } = renderPortfolio({ syncStatus: 'idle' });

    act(() => {
      vi.advanceTimersByTime(INITIAL_LOAD_IDLE_TIMEOUT_MS);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('restarts the initial-load window when the active network changes', () => {
    const { result, rerender } = renderPortfolio({ syncStatus: 'idle' });

    act(() => {
      vi.advanceTimersByTime(INITIAL_LOAD_IDLE_TIMEOUT_MS);
    });
    expect(result.current.isLoading).toBe(false);

    state.networkKey = 'cardano-preprod';
    rerender();

    expect(result.current.isLoading).toBe(true);
  });

  it('exits the skeleton on a terminal sync failure', () => {
    const { result } = renderPortfolio({
      syncStatus: 'idle',
      hasSyncFailure: true,
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('exits the skeleton once the active network has synced', () => {
    const { result } = renderPortfolio({
      syncStatus: 'syncing',
      hasEverSynced: true,
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('shows the empty state when the active network has no accounts', () => {
    const { result } = renderPortfolio({
      accounts: NO_ACCOUNTS,
      syncStatus: 'idle',
    });

    expect(result.current.isLoading).toBe(false);
  });
});
