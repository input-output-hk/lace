import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { isLaunchSeasonActive } from '@lace-contract/realfi-staking';
import {
  NavigationControls,
  SheetRoutes,
  useFocusEffect,
} from '@lace-lib/navigation';
import {
  ActivityList,
  Column,
  Divider,
  EmptyStateMessage,
  PageContainerTemplate,
  PageHeader,
  Text,
  openUrl,
  spacing,
} from '@lace-lib/ui-toolkit';
import {
  formatAmountToLocale,
  formatDate,
  formatLocaleNumber,
} from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { RealFiBanner } from '../components/RealFiBanner';
import { RPointsCard } from '../components/RPointsCard';
import { UsdrStakingPortfolioCard } from '../components/UsdrStakingPortfolioCard';
import { formatCooldownRemaining } from '../cooldown-remaining';
import { hasFeedMismatch } from '../feed-mismatch';
import { useDispatchLaceAction, useLaceSelector } from '../hooks';
import { useActiveRealFiConfig } from '../use-realfi-config';

import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';
import type {
  ActivityCardType,
  ActivitySection,
  FormattedActivityListItem,
} from '@lace-lib/ui-toolkit';

const activityKeyExtractor = (item: ActivityCardType) =>
  item.type === 'activity' ? item.props.rowKey : item.props.date;

const CARDANO_BLOCKCHAIN_PARAM = { blockchainName: 'Cardano' } as const;

// Staked Balance = sUSDr, Available to Stake = USDr (both 6 decimals, shown 2dp).
const STAKED_TICKER = 'sUSDrf';
const AVAILABLE_TICKER = 'USDrf';
const STAKE_TOKEN_DECIMALS = 6;
const STAKE_DISPLAY_DECIMALS = 2;
const STAKE_UNIT_DIVISOR = 10 ** STAKE_TOKEN_DECIMALS;

/** Base-unit wallet-total (summed across active-network accounts) of a token. */
const tokenBaseUnits = (tokens: Token[], tokenId: string): bigint => {
  const token = tokens.find(entry => entry.tokenId === tokenId);
  return token ? BigInt(token.available.toString()) : 0n;
};

/** Format 6-decimal base units as a locale amount with 2 fraction digits. */
const formatStakeUnits = (baseUnits: bigint): string =>
  formatLocaleNumber(
    String(Number(baseUnits) / STAKE_UNIT_DIVISOR),
    STAKE_DISPLAY_DECIMALS,
  );

/**
 * Activity-row title key per kind. A swap→stake is a stake: label it "Stake"
 * like a direct stake so both read the same in the list. Kinds without an
 * entry keep the activity's own label.
 */
const ACTIVITY_TITLE_KEYS = {
  stake: 'realfi.detail.activity.stake',
  swap: 'realfi.detail.activity.stake',
  unstake: 'realfi.detail.activity.unstake',
  withdraw: 'realfi.detail.activity.withdraw',
} as const;

/**
 * Activity-row value line. Swap→stake rows show only the USDr staked (matching
 * a direct stake's "-x USDr"), not the combined "+received USDr, -input" swap
 * line — the input token lives on the detail sheet's "Swap value" row.
 * Persisted rows carry the amount as base units so it formats in the active
 * locale here, not the en-US string frozen at claim time (P3-h); other
 * read-derived rows keep their subtitle.
 */
const activityValueSubtitle = (activity: {
  kind: string;
  subtitle: string;
  usdrBaseUnits?: string;
  stakedUsdrBaseUnits?: string;
}): string => {
  if (activity.kind === 'swap' && activity.stakedUsdrBaseUnits !== undefined) {
    const staked = formatAmountToLocale(
      activity.stakedUsdrBaseUnits,
      STAKE_TOKEN_DECIMALS,
    );
    return `-${staked} USDrf`;
  }
  if (activity.usdrBaseUnits === undefined) return activity.subtitle;
  return `+${formatAmountToLocale(
    activity.usdrBaseUnits,
    STAKE_TOKEN_DECIMALS,
  )} USDrf`;
};

/**
 * USDr Staking detail screen (full-screen stack page, not a bottom sheet).
 * Renders a portfolio-style summary card (Total Balance, Staked Balance /
 * Available to Stake, and a full-width "Manage Stake" CTA) above a
 * "Staking Activities" section. The activities list reuses the token-detail
 * rendering (FlashList, sad-face empty placeholder); the read returns the full
 * history in one shot, so there is no pagination. Values come from the realfi
 * store selectors and are passed into the presentational components as props.
 */
export const UsdrStakingDetail = (
  props: StackScreenProps<StackRoutes.UsdrStakingDetail>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  // Once per mount, not per focus: the screen stays mounted behind its sheets,
  // so a focus-driven impression would recount every sheet dismissal as a view.
  const hasTrackedScreenView = useRef(false);
  useEffect(() => {
    if (hasTrackedScreenView.current) return;
    hasTrackedScreenView.current = true;
    trackEvent('realfi | usdr staking screen | viewed');
  }, [trackEvent]);
  // On web (browser extension) the @react-navigation/stack card wrapper grows to
  // its content height instead of clamping to the scene, so a flex:1 screen never
  // gives the list a bounded box and the page can't scroll (side panel + full
  // page). Pinning the screen body to the window height there caps that growth so
  // the FlashList gets a definite height and scrolls; native keeps flex:1.
  const { height: windowHeight } = useWindowDimensions();

  // The Staking Center product card contributes the card from the host loader
  // (no Redux access), so it navigates here with a placeholder account id. Resolve
  // the real account here: prefer the route param when set, else the first active
  // Cardano account.
  const routeAccountId = props.route.params.accountId as AccountId;
  const cardanoAccounts = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    CARDANO_BLOCKCHAIN_PARAM,
  );
  const accountId = useMemo<AccountId>(() => {
    if (routeAccountId) return routeAccountId;
    const accounts = Array.isArray(cardanoAccounts) ? cardanoAccounts : [];
    return accounts[0]?.accountId ?? routeAccountId;
  }, [routeAccountId, cardanoAccounts]);

  // First visit to the staking center → open the "How it Works" carousel once.
  // Marked seen at trigger time (not on dismissal) and persisted, so it fires
  // exactly once per installation however the user leaves the sheet.
  const hasSeenOnboarding = useLaceSelector(
    'realfiPosition.selectHasSeenOnboarding',
  );
  const markOnboardingShown = useDispatchLaceAction(
    'realfiPosition.onboardingShown',
  );
  const hasTriggeredOnboarding = useRef(false);
  useEffect(() => {
    if (hasSeenOnboarding || hasTriggeredOnboarding.current) return;
    hasTriggeredOnboarding.current = true;
    markOnboardingShown();
    NavigationControls.navigate(SheetRoutes.RealFiOnboarding, { accountId });
  }, [hasSeenOnboarding, markOnboardingShown, accountId]);

  // RealFi config for the active Cardano network (undefined off-preview today),
  // the source of the network's USDr/sUSDr token ids + RealFi/vault endpoints.
  const realfiConfig = useActiveRealFiConfig();

  // Staked Balance = total sUSDr across active-network accounts; Available to
  // Stake = total USDr across active-network accounts (both summed from the
  // aggregated fungible tokens, matched by the active network's token ids).
  // Network-scoped so preview holdings don't leak into e.g. preprod, where the
  // user holds none and `realfiConfig` is undefined ⇒ 0 (ADR 11).
  const aggregatedTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensForVisibleAccounts',
  );
  const stakedBaseUnits = useMemo(
    () =>
      realfiConfig
        ? tokenBaseUnits(aggregatedTokens, realfiConfig.susdrTokenId)
        : 0n,
    [aggregatedTokens, realfiConfig],
  );
  const availableBaseUnits = useMemo(
    () =>
      realfiConfig
        ? tokenBaseUnits(aggregatedTokens, realfiConfig.usdrTokenId)
        : 0n,
    [aggregatedTokens, realfiConfig],
  );
  const stakedBalance = useMemo(
    () => formatStakeUnits(stakedBaseUnits),
    [stakedBaseUnits],
  );
  const availableToStake = useMemo(
    () => formatStakeUnits(availableBaseUnits),
    [availableBaseUnits],
  );

  // Live sUSDr→USDr vault rate for valuing staked sUSDr in USD, from the
  // persisted per-network store: the last-known rate renders immediately on
  // every visit (no 1:1 flash), and the refresh dispatched below only touches
  // state when the rate has actually moved (reducer change-guard). Falls back
  // to 1:1 only before the first-ever successful read on this network.
  const yieldInfo = useLaceSelector(
    'realfiPosition.selectYieldInfo',
    realfiConfig?.realfiNetwork ?? 'preview',
  );
  const vaultRate = yieldInfo?.exchangeRate ?? 1;
  const requestYieldInfo = useDispatchLaceAction(
    'realfiPosition.yieldInfoRequested',
  );

  // Wallet-wide: withdraw-ready timelocks across every active-network account
  // (each item tagged with its accountId), so the banner/modal reflect all of
  // the wallet's claimables, not just the viewed account's.
  const withdrawable = useLaceSelector('realfiPosition.selectAllWithdrawables');
  // Wallet-wide unstakes still in cooldown (timelock not yet open).
  const coolingDown = useLaceSelector('realfiPosition.selectAllCoolingDown');

  // Total Balance = staked sUSDr valued at the vault rate + available USDr
  // (USDr ≈ $1) + funds mid-unstake (cooldown + withdraw-ready, USDr at $1 —
  // they've left every wallet balance; LW-14652 AC1) — the true position value,
  // matching the dApp's headline balance. USD-denominated by construction;
  // shown converted to the selected currency, or as USD while no conversion
  // rate is cached.
  const currencyPreference = useLaceSelector(
    'tokenPricing.selectCurrencyPreference',
  );
  const usdToCurrencyRate = useLaceSelector(
    'tokenPricing.selectUsdToCurrencyRate',
  );
  const currencyCode =
    usdToCurrencyRate === undefined ? 'USD' : currencyPreference.name;
  const totalBalance = useMemo(() => {
    const stakedUsd =
      (Number(stakedBaseUnits) / STAKE_UNIT_DIVISOR) * vaultRate;
    const availableUsd = Number(availableBaseUnits) / STAKE_UNIT_DIVISOR;
    const pendingUsd =
      [...coolingDown, ...withdrawable].reduce(
        (sum, unstake) => sum + Number(unstake.usdrAmount),
        0,
      ) / STAKE_UNIT_DIVISOR;
    return formatLocaleNumber(
      String(
        (stakedUsd + availableUsd + pendingUsd) * (usdToCurrencyRate ?? 1),
      ),
      STAKE_DISPLAY_DECIMALS,
    );
  }, [
    stakedBaseUnits,
    availableBaseUnits,
    coolingDown,
    withdrawable,
    vaultRate,
    usdToCurrencyRate,
  ]);

  // APY tag on the Total Balance row (LW-14652): only for a non-zero position
  // with a known persisted APY — hidden at zero balance (LW-14650 empty state).
  const apyTag = useMemo(() => {
    const apy = yieldInfo?.apy;
    if (apy === undefined || stakedBaseUnits + availableBaseUnits === 0n)
      return undefined;
    return `+${(apy * 100).toFixed(1)}% ${t('realfi.detail.apy')}`;
  }, [yieldInfo?.apy, stakedBaseUnits, availableBaseUnits, t]);

  // R-Points (launch season, LW-15495 AC2): wallet-wide like every other
  // figure on this screen — RealFi's engine keys points per account address,
  // so each active-network Cardano account is fetched and the card shows the
  // sum. Scoped to active-network accounts (ADR-11): the persisted per-account
  // snapshots survive network switches and another network's points must not
  // leak in. No data for any account ⇒ the card is hidden entirely, so the
  // points read can never block or delay this screen.
  const launchSeason = realfiConfig?.launchSeason;
  const allRPoints = useLaceSelector('realfiPosition.selectAllRPoints');
  const requestRPoints = useDispatchLaceAction(
    'realfiPosition.rPointsRequested',
  );
  // Windowed, not merely present: the season has its own activeFrom/activeTo
  // in the flag payload, and a CMS kill switch (`launchSeason: null`, since
  // JSON has no undefined) must read as season-off too.
  const isSeasonActive = isLaunchSeasonActive(launchSeason, Date.now());
  useFocusEffect(
    useCallback(() => {
      if (!isSeasonActive) return;
      const accounts = Array.isArray(cardanoAccounts) ? cardanoAccounts : [];
      for (const account of accounts) {
        requestRPoints({ accountId: account.accountId });
      }
    }, [isSeasonActive, requestRPoints, cardanoAccounts]),
  );
  const rPointsDisplay = useMemo(() => {
    if (!isSeasonActive) return undefined;
    const accounts = Array.isArray(cardanoAccounts) ? cardanoAccounts : [];
    let hasAnySnapshot = false;
    let total = 0;
    for (const account of accounts) {
      const snapshot = allRPoints[account.accountId];
      if (snapshot) {
        hasAnySnapshot = true;
        total += snapshot.totalPoints;
      }
    }
    return hasAnySnapshot ? formatLocaleNumber(String(total), 0) : undefined;
  }, [isSeasonActive, cardanoAccounts, allRPoints]);

  // Card impression + points-API health in one event (LW-15494): 'ok' = every
  // account's read succeeded, 'stale' = the card shows persisted points after a
  // failed refresh, 'failed' = a read failed with nothing to show (the card is
  // hidden, but the impression still fires — it doubles as the API monitoring
  // signal). Undefined until every account's on-focus read resolves.
  const rPointsFetchStatuses = useLaceSelector(
    'realfiPosition.selectRPointsFetchStatusByAccount',
  );
  const rPointsApiStatus = useMemo(() => {
    if (!isSeasonActive) return undefined;
    const accounts = Array.isArray(cardanoAccounts) ? cardanoAccounts : [];
    if (accounts.length === 0) return undefined;
    const statuses = accounts.map(
      account => rPointsFetchStatuses[account.accountId],
    );
    if (statuses.some(status => status === undefined)) return undefined;
    if (statuses.every(status => status === 'success')) return 'ok';
    return rPointsDisplay === undefined ? 'failed' : 'stale';
  }, [isSeasonActive, cardanoAccounts, rPointsFetchStatuses, rPointsDisplay]);
  const hasTrackedRPointsView = useRef(false);
  useEffect(() => {
    if (hasTrackedRPointsView.current || rPointsApiStatus === undefined) return;
    hasTrackedRPointsView.current = true;
    trackEvent('realfi | rpoints card | viewed', {
      api_status: rPointsApiStatus,
    });
  }, [rPointsApiStatus, trackEvent]);
  const rewardsDashboardUrl = launchSeason?.rewardsDashboardUrl;
  const onOpenRewardsDashboard = useMemo(() => {
    if (!rewardsDashboardUrl) return undefined;
    return () => {
      trackEvent('realfi | rpoints card | view rewards clicked');
      void openUrl({
        url: rewardsDashboardUrl,
        onError: () => {
          // Error handling is done in the openUrl utility.
        },
      });
    };
  }, [rewardsDashboardUrl, trackEvent]);

  // ADR-24: guard every sheet-navigation callback with `isFocused()` so an
  // RNGH touch-through on a hidden screen can't fire it. `isFocused()` is a
  // stable synchronous call (no re-render, no subscription).
  const onManageStake = useCallback(() => {
    if (!navigation.isFocused()) return;
    NavigationControls.navigate(SheetRoutes.RealFiManageStake, {
      accountId,
      tab: 'stake',
    });
  }, [navigation, accountId]);

  const onWithdrawBannerPress = useCallback(() => {
    if (!navigation.isFocused()) return;
    NavigationControls.navigate(SheetRoutes.RealFiWithdraw, { accountId });
  }, [navigation, accountId]);

  const onRPointsInfo = useCallback(() => {
    if (!navigation.isFocused()) return;
    NavigationControls.navigate(SheetRoutes.RealFiRPointsExplainer);
  }, [navigation]);

  // Card body (outside the ℹ️ / ↗) goes straight to the by-account breakdown.
  const onRPointsByAccount = useCallback(() => {
    if (!navigation.isFocused()) return;
    NavigationControls.navigate(SheetRoutes.RealFiRPointsByAccount);
  }, [navigation]);

  // Full-screen stack page: back/close pop the screen off the stack.
  const onClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Real staking history + withdraw-ready unstakes are fetched by the
  // `makeStakeActivities` side-effect (in the service worker, where the RealFi
  // off-chain SDK client + its @blaze-cardano/core dep load — they can't run in
  // this Metro-bundled UI, ADR 19). We just trigger the read and read the store.
  const requestStakeActivities = useDispatchLaceAction(
    'realfiPosition.stakeActivitiesRequested',
  );
  const requestWithdrawables = useDispatchLaceAction(
    'realfiPosition.withdrawablesRequested',
  );
  // Wallet-wide, matching the aggregated balance card and rewards banner: the
  // history can live on a different wallet than the account this screen
  // resolves from the Staking Center's placeholder (multi-wallet installs).
  // Filtered to ACTIVE-network accounts (ADR-11): the persisted withdrawn
  // rows survive network switches keyed by account, and another network's
  // claims must not appear in this network's history.
  const combinedActivities = useLaceSelector(
    'realfiPosition.selectCombinedStakeActivities',
  );
  const activities = useMemo(() => {
    const activeIds = new Set(
      (Array.isArray(cardanoAccounts) ? cardanoAccounts : []).map(
        account => account.accountId,
      ),
    );
    return combinedActivities.filter(activity =>
      activeIds.has(activity.accountId),
    );
  }, [combinedActivities, cardanoAccounts]);

  // A USDr/sUSDr position worth polling for on every visit: funds held (USDr or
  // staked sUSDr), in flight (cooldown / withdraw-ready), or a still-in-progress
  // stake/unstake. With none of these there is nothing new that can land, so an
  // empty wallet skips the poll entirely.
  const hasUsdrPosition =
    stakedBaseUnits > 0n ||
    availableBaseUnits > 0n ||
    coolingDown.length > 0 ||
    withdrawable.length > 0 ||
    activities.some(activity => !activity.completed);

  // Each row navigates with its OWN account (the aggregated list spans
  // wallets), so the detail sheet's {accountId, activityId} lookup resolves.
  const onActivityPress = useCallback(
    (activityId: string) => {
      if (!navigation.isFocused()) return;
      const activity = activities.find(item => item.id === activityId);
      NavigationControls.navigate(SheetRoutes.RealFiStakeDetail, {
        accountId: activity?.accountId ?? accountId,
        activityId,
      });
    },
    [navigation, activities, accountId],
  );

  // A failed claim opens the error sheet (LW-14684 — flow errors get the sheet,
  // not a toast). The claim sheet closed on confirm, so this screen is the
  // surface that reacts. Edge-triggered on undefined → defined so re-renders
  // (and the sheet's own Close/Try again, which clear the failure) never
  // re-push it; a failure recorded while unmounted opens it on the next visit.
  const withdrawFailure = useLaceSelector(
    'realfiPosition.selectWithdrawFailure',
  );
  const hadWithdrawFailure = useRef(false);
  useEffect(() => {
    const has = withdrawFailure !== undefined;
    if (has && !hadWithdrawFailure.current) {
      NavigationControls.navigate(SheetRoutes.RealFiTransactionError);
    }
    hadWithdrawFailure.current = has;
  }, [withdrawFailure]);

  // Poll for anything new on EVERY visit to this screen, not just first mount:
  // a stack page stays mounted behind the sheets it opens (Manage Stake,
  // Withdraw, activity detail), so a plain mount effect would miss the return
  // trip — `useFocusEffect` re-runs each time the screen regains focus. The
  // yield figures and the withdraw-ready / cooldown reads are gated on an
  // actual position: with nothing held, in cooldown, withdraw-ready, or a
  // stake/unstake still in progress, none of those can change, so an empty
  // wallet skips them. Also reactive on the accounts selector, so a restore
  // whose account discovery finishes after mount fetches.
  useFocusEffect(
    useCallback(() => {
      if (!realfiConfig) return;
      // The order history is read even with no position: it is what decides
      // first-swap bonus eligibility, and a prior swap can exist from another
      // device. Gating it behind a position hid the bonus from exactly the
      // first-time swappers it is meant for, since unread history fails closed.
      const accounts = Array.isArray(cardanoAccounts) ? cardanoAccounts : [];
      for (const account of accounts) {
        requestStakeActivities({ accountId: account.accountId });
      }
      if (!hasUsdrPosition) return;
      requestYieldInfo();
      requestWithdrawables();
    }, [
      realfiConfig,
      hasUsdrPosition,
      cardanoAccounts,
      requestYieldInfo,
      requestStakeActivities,
      requestWithdrawables,
    ]),
  );

  // Group the detected on-chain activities by request date into the date-tagged
  // sections the ActivityList expects. A completed entry (sUSDr received) shows
  // the positive icon.
  const sections = useMemo<ActivitySection[]>(() => {
    const byDate = new Map<string, FormattedActivityListItem[]>();
    for (const activity of activities) {
      // A completed activity's card shows its completion date (LW-14653);
      // in-flight rows keep the request date.
      const date = formatDate({
        date: activity.completedAt ?? activity.requestDate,
        type: 'local',
      });
      const titleKey =
        ACTIVITY_TITLE_KEYS[activity.kind as keyof typeof ACTIVITY_TITLE_KEYS];
      const title = titleKey === undefined ? activity.label : t(titleKey);
      const valueSubtitle = activityValueSubtitle(activity);
      const item: FormattedActivityListItem = {
        rowKey: activity.id,
        id: activity.id,
        // 'received' is the card's confirmed/done status; completed rows must
        // not render as pending (pending also greys out the value column).
        status: activity.completed ? 'received' : 'pending',
        info: { title },
        value: { subtitle: valueSubtitle },
        iconName: 'Coins',
        iconBackground: activity.completed ? 'positive' : 'neutral',
      };
      byDate.set(date, [...(byDate.get(date) ?? []), item]);
    }
    return [...byDate].map(([date, items]) => ({ date, items }));
  }, [t, activities]);

  const hasWithdrawable = withdrawable.length > 0;
  // Total withdraw-ready amount across all accounts (base units → display).
  const withdrawableTotal = useMemo(
    () =>
      formatStakeUnits(
        withdrawable.reduce(
          (sum, unstake) => sum + BigInt(unstake.usdrAmount),
          0n,
        ),
      ),
    [withdrawable],
  );

  // Cooldown banner: total still-locked amount + time until the soonest
  // unlocks, from the provider's era-proof claimable-at wall clock.
  const coolingDownInfo = useMemo(() => {
    if (coolingDown.length === 0) return undefined;
    const total = coolingDown.reduce(
      (sum, unstake) => sum + BigInt(unstake.usdrAmount),
      0n,
    );
    const earliestMs = Math.min(...coolingDown.map(u => u.claimableAtMs));
    return {
      amount: formatStakeUnits(total),
      time: formatCooldownRemaining(earliestMs - Date.now(), t),
    };
  }, [coolingDown, t]);

  // Feed-mismatch warning: a direct order tx this wallet submitted, confirmed
  // on-chain, that the RealFi feed still hasn't returned past the grace
  // period — the feed is missing data the chain has (stalled indexer), so the
  // list/banners below it are silently stale. Evaluated on render; the
  // focus-effect poll above re-renders this page often enough that a grace
  // boundary crossing surfaces without a dedicated ticker.
  const submittedOrderTxsByAccount = useLaceSelector(
    'realfiPosition.selectSubmittedOrderTxsByAccount',
  );
  const historyByAccount = useLaceSelector(
    'cardanoContext.selectTransactionHistoryGroupedByAccount',
  );
  const hasFeedMismatchWarning = useMemo(() => {
    const accounts = Array.isArray(cardanoAccounts) ? cardanoAccounts : [];
    const nowMs = Date.now();
    return accounts.some(account =>
      hasFeedMismatch({
        orderTxs: submittedOrderTxsByAccount[account.accountId] ?? [],
        confirmedTxIds: new Set(
          (historyByAccount[account.accountId] ?? []).map(item =>
            String(item.txId),
          ),
        ),
        usdrTokenId: realfiConfig?.usdrTokenId,
        nowMs,
      }),
    );
  }, [
    cardanoAccounts,
    submittedOrderTxsByAccount,
    historyByAccount,
    realfiConfig,
  ]);

  const listHeader = useMemo(
    () => (
      <Column gap={spacing.L}>
        {hasFeedMismatchWarning && (
          <RealFiBanner
            icon="AlertTriangle"
            title={t('realfi.detail.feed-mismatch-banner.title')}
            subtitle={t('realfi.detail.feed-mismatch-banner.subtitle')}
            subtitleLines={4}
            testID="realfi-feed-mismatch-banner"
          />
        )}
        {hasWithdrawable && (
          <RealFiBanner
            icon="Gift"
            title={t('realfi.detail.withdraw-banner.title')}
            subtitle={`+${withdrawableTotal} USDrf`}
            cta={{
              label: t('realfi.detail.withdraw-banner.cta'),
              onPress: onWithdrawBannerPress,
            }}
            testID="realfi-withdraw-banner"
          />
        )}
        {coolingDownInfo && (
          <RealFiBanner
            icon="Clock"
            title={t('realfi.detail.cooldown-banner.title')}
            subtitle={t(
              'realfi.detail.cooldown-banner.subtitle',
              coolingDownInfo,
            )}
            testID="realfi-cooldown-banner"
          />
        )}
        <UsdrStakingPortfolioCard
          totalBalance={totalBalance}
          currency={currencyCode}
          stakedBalance={stakedBalance}
          availableToStake={availableToStake}
          ticker={STAKED_TICKER}
          availableTicker={AVAILABLE_TICKER}
          apyTag={apyTag}
          onManageStake={onManageStake}
        />
        {rPointsDisplay !== undefined && (
          <RPointsCard
            points={rPointsDisplay}
            onInfoPress={onRPointsInfo}
            onPress={onRPointsByAccount}
            onOpenDashboard={onOpenRewardsDashboard}
          />
        )}
        <Divider />
        <Text.M testID="realfi-staking-activities-title">
          {t('realfi.detail.staking-activities')}
        </Text.M>
      </Column>
    ),
    [
      t,
      hasFeedMismatchWarning,
      hasWithdrawable,
      withdrawableTotal,
      coolingDownInfo,
      onWithdrawBannerPress,
      onManageStake,
      totalBalance,
      stakedBalance,
      availableToStake,
      apyTag,
      rPointsDisplay,
      onRPointsInfo,
      onRPointsByAccount,
      onOpenRewardsDashboard,
    ],
  );

  const emptyState = (
    <EmptyStateMessage
      message={t('realfi.detail.no-activities')}
      style={styles.empty}
      testID="realfi-staking-activities-empty"
    />
  );

  const content = (
    <ActivityList
      testID="realfi-staking-activities"
      sections={sections}
      onActivityPress={onActivityPress}
      keyExtractor={activityKeyExtractor}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={emptyState}
      showsVerticalScrollIndicator={false}
    />
  );

  // PageContainerTemplate keeps the side-panel width clamp the other list pages
  // use. The body height is definite on web (windowHeight) so the FlashList below
  // gets a bounded box and scrolls; native keeps flex:1 (the stack bounds it).
  // The template supplies the `spacing.M` horizontal inset, so the header/list
  // carry only vertical padding. No close button — the back button is enough,
  // matching other stack pages.
  return (
    <PageContainerTemplate>
      <View
        style={
          Platform.OS === 'web' ? { height: windowHeight } : styles.fillSpace
        }>
        <PageHeader
          title={t('realfi.detail.title')}
          onBackPress={onClose}
          compact
          testID="usdr-staking-detail-header"
        />
        {content}
      </View>
    </PageContainerTemplate>
  );
};

const styles = StyleSheet.create({
  // Native: flex fills the space below the header. Web pins an explicit height
  // (inline, from windowHeight) since the stack card there won't clamp height.
  fillSpace: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  // Horizontal inset comes from PageContainerTemplate; only vertical padding
  // lives here (FlashList only supports padding on the content container).
  listContent: {
    paddingTop: spacing.M,
    paddingBottom: spacing.XXL,
  },
  empty: {
    paddingVertical: spacing.XXL,
  },
});
