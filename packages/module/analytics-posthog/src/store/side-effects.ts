import { deepEquals } from '@cardano-sdk/util';
import { blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';
import { isHardwareWallet, WalletType } from '@lace-contract/wallet-repo';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  mergeMap,
  of,
  startWith,
  take,
} from 'rxjs';

import { buildCardanoGovernanceAccounts } from './cardano-governance-super-property';

import type { SideEffect } from '..';
import type { IdentifiedUser } from './slice';
import type { AccountRewardAccountDetailsMap } from '@lace-contract/cardano-context';
import type { CurrencyPreference } from '@lace-contract/token-pricing';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';
import type { JsonType } from '@lace-lib/util-store';

export const initializePostHogAnalyticsDependencies: SideEffect = (
  _,
  __,
  { initializePostHogAnalytics, posthog, getDefaultPostHogEventProperties },
) => {
  initializePostHogAnalytics(posthog, getDefaultPostHogEventProperties);
  return EMPTY;
};

/**
 * Whether `rewardAccountDetails` holds an entry for *every* account it
 * describes.
 *
 * The map is not persisted while the accounts it describes are, so after every
 * boot it is empty for accounts that certainly have stake, and
 * `buildCardanoGovernanceAccounts` maps those to `votingPower: 0`. Reporting
 * that would overwrite real voting power with zero; omitting the key leaves the
 * last reported value untouched, because `posthog.identify` merges.
 *
 * `every`, not `some`: the accounts are written one at a time, so a partially
 * loaded map still zeroes the accounts that are missing, and those zeroes are
 * merged over their real values here as well as in PostHog.
 */
const hasLoadedRewardAccountDetails = (
  cardanoAccounts: readonly Pick<AnyAccount, 'accountId'>[],
  rewardAccountDetails: AccountRewardAccountDetailsMap,
): boolean =>
  cardanoAccounts.every(
    ({ accountId }) =>
      rewardAccountDetails[accountId]?.rewardAccountInfo !== undefined,
  );

/**
 * Code-unit ordering, matching what a bare `sort()` does for strings.
 *
 * Deliberately not `localeCompare`: this array is compared against the
 * persisted snapshot, so a locale-dependent order would make a language change
 * look like a property change and re-identify.
 */
const compareBlockchainNames = (a: string, b: string): number => {
  if (a < b) return -1;
  return a > b ? 1 : 0;
};

const computeUserSuperProperties = ({
  wallets,
  networkType,
  theme,
  themeMode,
  language,
  currency,
  cardanoAccounts,
  rewardAccountDetails,
}: {
  wallets: readonly AnyWallet[];
  networkType: string | undefined;
  theme: string | undefined;
  themeMode: string | undefined;
  language: string | undefined;
  currency: CurrencyPreference | undefined;
  cardanoAccounts: readonly AnyAccount[];
  rewardAccountDetails: AccountRewardAccountDetailsMap;
}): Record<string, JsonType> => {
  const accounts: AnyAccount[] = [];
  for (const wallet of wallets) accounts.push(...wallet.accounts);
  const blockchainsWithAccounts = [
    ...new Set(accounts.map(a => a.blockchainName)),
  ].sort(compareBlockchainNames);

  return {
    num_wallets: wallets.length,
    num_accounts: accounts.length,
    has_hardware_wallet: wallets.some(w => isHardwareWallet(w)),
    has_ledger: wallets.some(w => w.type === WalletType.HardwareLedger),
    has_trezor: wallets.some(w => w.type === WalletType.HardwareTrezor),
    has_seed_signer: wallets.some(
      w => w.type === WalletType.HardwareSeedSigner,
    ),
    has_keystone: wallets.some(w => w.type === WalletType.HardwareKeystone),
    blockchains_with_accounts: blockchainsWithAccounts,
    ...(networkType && { preferred_network_type: networkType }),
    // `preferred_theme` is the *resolved* color scheme ('light' | 'dark') —
    // useful for "is this user on dark mode right now" queries. The user's
    // *choice* is a separate property because 'system' resolves to whichever
    // OS-level scheme is active and would be lost otherwise.
    ...(theme && { preferred_theme: theme }),
    ...(themeMode && { preferred_theme_mode: themeMode }),
    ...(language && { preferred_language: language }),
    ...(currency && { preferred_currency: currency.ticker }),
    // Mainnet-only: rewardAccountDetails is cleared on network switch, so this
    // data only exists while mainnet is active. Omitting the key on testnet lets
    // posthog.identify's merge keep the last mainnet snapshot instead of blanking it.
    ...(networkType === 'mainnet' &&
      hasLoadedRewardAccountDetails(cardanoAccounts, rewardAccountDetails) && {
        cardano_governance_accounts: buildCardanoGovernanceAccounts(
          cardanoAccounts,
          rewardAccountDetails,
        ),
      }),
  };
};

/**
 * Window over which changed identities are coalesced into one identify. Sized
 * for the async settling shortly after boot — the per-account writes of a
 * single provider pass land a few hundred ms apart and each one is a distinct
 * identity. Not for rehydration: that is awaited before epics run.
 *
 * Load-bearing for the once-per-session cap below: without it the session's
 * single identify would be spent on the least settled identity of the boot.
 */
const IDENTIFY_DEBOUNCE_MS = 1000;

/**
 * Whether sending `next` would change the person PostHog holds, given `last` —
 * what was last sent.
 *
 * `posthog.identify` merges: a key absent from the payload leaves the person's
 * existing value untouched, so an absent key cannot change anything and must
 * not force a re-identify. Compare present keys only.
 *
 * A null `last` (never identified) is caught by the userId comparison, since
 * `next.userId` is always a string and so never equals `undefined`.
 */
const identifyWouldChangePerson = (
  next: IdentifiedUser,
  last: IdentifiedUser | null,
): boolean =>
  next.userId !== last?.userId ||
  Object.entries(next.properties).some(
    ([key, value]) => !deepEquals(value, last?.properties[key]),
  );

export const identifyUserWithSuperProperties: SideEffect = (
  _,
  {
    analytics: { selectAnalyticsUser$ },
    wallets: { selectAll$ },
    network: { selectNetworkType$ },
    views: { selectColorScheme$, selectLanguage$, selectThemePreference$ },
    tokenPricing: { selectCurrencyPreference$ },
    cardanoContext: {
      selectActiveCardanoAccounts$,
      selectRewardAccountDetails$,
    },
    posthogAnalytics: { selectIdentifiedUser$ },
  },
  { posthog, actions, logger },
) =>
  combineLatest([
    selectAnalyticsUser$,
    selectAll$.pipe(startWith([])),
    selectNetworkType$.pipe(startWith(undefined)),
    selectColorScheme$.pipe(startWith(undefined)),
    selectLanguage$.pipe(startWith(undefined)),
    selectCurrencyPreference$.pipe(startWith(undefined)),
    selectThemePreference$.pipe(startWith(undefined)),
    selectActiveCardanoAccounts$.pipe(startWith([])),
    selectRewardAccountDetails$.pipe(startWith({})),
  ]).pipe(
    map(
      ([
        user,
        wallets,
        networkType,
        theme,
        language,
        currency,
        themeMode,
        cardanoAccounts,
        rewardAccountDetails,
      ]) => {
        if (!user) return null;
        return {
          userId: user.id,
          properties: computeUserSuperProperties({
            wallets,
            networkType,
            theme,
            themeMode,
            language,
            currency,
            cardanoAccounts,
            rewardAccountDetails,
          }),
        };
      },
    ),
    filter(
      (identity): identity is NonNullable<typeof identity> => identity !== null,
    ),
    distinctUntilChanged(deepEquals),
    debounceTime(IDENTIFY_DEBOUNCE_MS),
    // Compare against the *persisted* snapshot, not just in-memory history:
    // the extension service worker restarts constantly, and every restart
    // would otherwise re-send an unchanged $identify (billed per event).
    blockingWithLatestFrom(selectIdentifiedUser$),
    filter(([next, last]) => identifyWouldChangePerson(next, last)),
    mergeMap(([next]) => {
      try {
        posthog.identify(next.userId, next.properties);
      } catch (error) {
        // Deliberately no snapshot: an identify that never left must not be
        // deduped against, and an uncaught throw here would take down the
        // root epic with every other side effect in it.
        logger.error('Failed to identify PostHog user', error);
        return EMPTY;
      }
      return of(actions.posthogAnalytics.identified(next));
    }),
    // One identify per session, counted on the send rather than the attempt so
    // a throw does not spend it. A change arriving after the cap still lands:
    // the snapshot holds what was sent, so the next session sees it and sends.
    take(1),
  );

export const trackFeatureView: SideEffect = (
  { features: { featureView$ } },
  _,
  { actions },
) =>
  featureView$.pipe(
    map(({ payload }) =>
      actions.analytics.trackEvent({
        eventName: '$feature_view',
        payload: { feature_flag: payload },
      }),
    ),
  );

export const trackFeatureInteraction: SideEffect = (
  { features: { featureInteraction$ } },
  _,
  { actions },
) =>
  featureInteraction$.pipe(
    map(({ payload }) =>
      actions.analytics.trackEvent({
        eventName: '$feature_interaction',
        payload: {
          feature_flag: payload,
          $set: { [`$feature_interaction/${payload}`]: true },
        },
      }),
    ),
  );

export const posthogSideEffects: SideEffect[] = [
  identifyUserWithSuperProperties,
  initializePostHogAnalyticsDependencies,
  trackFeatureView,
  trackFeatureInteraction,
];
