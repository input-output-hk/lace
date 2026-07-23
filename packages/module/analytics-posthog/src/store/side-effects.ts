import { toEmpty } from '@cardano-sdk/util-rxjs';
import { isHardwareWallet, WalletType } from '@lace-contract/wallet-repo';
import {
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  map,
  startWith,
  tap,
} from 'rxjs';

import { buildCardanoGovernanceAccounts } from './cardano-governance-super-property';

import type { SideEffect } from '..';
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
  ].sort();

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
    ...(networkType === 'mainnet' && {
      cardano_governance_accounts: buildCardanoGovernanceAccounts(
        cardanoAccounts,
        rewardAccountDetails,
      ),
    }),
  };
};

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
  },
  { posthog },
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
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    tap(identity => {
      if (!identity) return;
      posthog.identify(identity.userId, identity.properties);
    }),
    toEmpty,
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
