import type { ComponentType } from 'react';

import type { FeatureFlag } from '@lace-contract/feature';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { TokenId } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';

/** One token's live USD-earned rate, per display unit (LW-14651). */
export type StakingCenterEarnedTokenRate = {
  tokenId: TokenId;
  earnedUsdPerUnit: number;
};

/**
 * Named alias (not inlined in the card type) so declaration emit prints the
 * alias — an inline function type here flows into every module's inferred
 * `sharedModule` via the global addon registry and overflows the compiler's
 * serialization limit (TS7056, the addon-types constraint documented on
 * `titleKey`).
 */
export type StakingCenterEarnedUsdResolver = (
  featureFlags: readonly FeatureFlag[],
  activeNetworkId: BlockchainNetworkId | undefined,
) => StakingCenterEarnedTokenRate[] | undefined;

/**
 * Named alias for the same TS7056 declaration-emit reason as
 * {@link StakingCenterEarnedUsdResolver}.
 */
export type StakingCenterPendingUsdResolver = (
  featureFlags: readonly FeatureFlag[],
  activeNetworkId: BlockchainNetworkId | undefined,
) => number | undefined;

/**
 * Named alias for the same TS7056 declaration-emit reason as
 * {@link StakingCenterEarnedUsdResolver}.
 */
export type StakingCenterCardDataSubscriber = (
  onChange: () => void,
) => () => void;

/**
 * Named alias for the same TS7056 declaration-emit reason as
 * {@link StakingCenterEarnedUsdResolver}.
 */
export type StakingCenterUsdBalanceResolver = (
  featureFlags: readonly FeatureFlag[],
  activeNetworkId: BlockchainNetworkId | undefined,
) => { tokens: Array<{ tokenId: TokenId; usdRate: number }> } | undefined;

/**
 * A product card contributed to the Staking Center list (spec §4.2).
 * The host renders it via StakeCenterMain's stakeCards; the contributor
 * supplies display data + navigation callbacks.
 */
export type StakingCenterProductCard = {
  /** Stable identity for list keys + dedup. e.g. `realfi-usdr-${accountId}`. */
  id: string;
  accountId: AccountId;
  /**
   * Whether the product is enabled on the given active network. The module
   * loads when ANY network in its flag payload resolves (`willLoad` carries no
   * network context, and the network can switch without a module reload), so
   * the hub must re-check on every render with the live flags + active network
   * and hide the card when this returns false.
   */
  isEnabledForNetwork: (
    featureFlags: readonly FeatureFlag[],
    activeNetworkId: BlockchainNetworkId | undefined,
  ) => boolean;
  /**
   * Card title translation key, e.g. `realfi.staking-center.card.title`.
   * Typed as string: the TranslationKey union in a contract type flows into
   * the contributing module's inferred type and overflows the compiler's
   * serialization limit (TS7056 — same constraint as account-management's
   * slice state). Contributors keep type safety via `satisfies TranslationKey`
   * on the literal; the host casts back at the `t()` call.
   */
  titleKey: string;
  /** Total position value formatted in USD, e.g. "$1,234.56". */
  totalBalanceUsdDisplay: string;
  /**
   * Brand icon for the card (the product token's logo), rendered by the host
   * at the hub's own size. Contributor-supplied so the hub stays
   * product-neutral instead of hardcoding any product's logo; without one the
   * card renders no icon.
   */
  icon?: ComponentType<{ size?: number }>;
  /**
   * When set, the card's Total Balance is the USD sum of these tokens' wallet
   * totals (across accounts on the active network), each valued at `usdRate` —
   * e.g. sUSDr at the vault rate and USDr at 1 — which the host converts to
   * the user's selected currency for display. Takes precedence over
   * `totalBalanceUsdDisplay`. Resolved per render like {@link apyDisplay}:
   * the vault rate mirrors the store (a load-time snapshot would freeze a
   * cold boot's $1 fallback for the whole mount) and the token ids come from
   * the live flag payload, not compile-time config.
   */
  usdBalance?: StakingCenterUsdBalanceResolver;
  /**
   * Yield shown as % APY for the ACTIVE network, e.g. "8.2%" — resolved per
   * render like {@link isEnabledForNetwork}, because the network can switch
   * without a module reload and each network's protocol yields differently.
   * Returns `undefined` until that network's live rate has been fetched — the
   * hub then shows no yield value rather than a fabricated (or another
   * network's) one.
   */
  apyDisplay: (
    featureFlags: readonly FeatureFlag[],
    activeNetworkId: BlockchainNetworkId | undefined,
  ) => string | undefined;
  /**
   * Live USD earned per display unit of each listed token for the ACTIVE
   * network (LW-14651): the host multiplies by its live wallet balances and
   * folds the products into the hub's combined "Total Earned". Resolved per
   * render like {@link apyDisplay}; `undefined` until the network's rates
   * have ever been observed (no fabricated zero earnings).
   */
  earnedUsdPerToken?: StakingCenterEarnedUsdResolver;
  /**
   * USD value of the product's funds currently mid-flow (e.g. unstakes in
   * cooldown or awaiting claim) — money that has left every wallet balance,
   * so the host adds it on top of the `usdBalance` token sum (LW-14651 AC1).
   * Resolved per render like {@link apyDisplay}; `undefined` when the product
   * is disabled on the active network.
   */
  pendingUsd?: StakingCenterPendingUsdResolver;
  /**
   * Notifies when the module caches behind the per-render resolvers
   * ({@link usdBalance}, {@link apyDisplay}, {@link earnedUsdPerToken},
   * {@link pendingUsd}) change, so the host re-renders and re-resolves them —
   * they are not store state, so no selector subscription covers them, and a
   * cache write landing after the host's last render would otherwise never be
   * displayed. Returns the unsubscribe.
   */
  subscribe?: StakingCenterCardDataSubscriber;
  /** Whether the account has an active position (active vs empty card). */
  hasActivePosition: boolean;
  /** Navigate to the USDr Staking detail screen. */
  onPress: () => void;
  /** Primary CTA (Manage Stake) when no/low position. */
  onManageStake?: () => void;
};

/**
 * A promo banner contributed to the hub, rendered directly below the staking
 * status card (LW-15495 Genesis Boost). The component is self-gating — it
 * reads its own feature config (flags, network, date window) via hooks at
 * render time and returns null when inactive — so the host stays
 * product-neutral and the addon loader stays store-blind.
 */
export type StakingCenterBanner = {
  /** Stable identity for list keys, e.g. `realfi-genesis-boost`. */
  id: string;
  Component: ComponentType;
};

/**
 * The default export of the contributor's addon module
 * (`loadStakingCenterProductCard`). Returns the cards for all RealFi-eligible
 * Cardano accounts; earnings contribute via each card's live
 * `earnedUsdPerToken` resolver (the addon loader is store-blind, so a static
 * per-account list could never carry live values).
 */
export type StakingCenterProductCardAddon = {
  cards: StakingCenterProductCard[];
  banner?: StakingCenterBanner;
};
