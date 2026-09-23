import { getRealFiConfigFromFlags } from '@lace-contract/realfi-staking';
import { TokenId } from '@lace-contract/tokens';
import { NavigationControls, StackRoutes } from '@lace-lib/navigation';
import { Logos } from '@lace-lib/ui-toolkit';

import { GenesisBoostBanner } from '../components/GenesisBoostBanner';
import {
  getCachedEarnedUsdPerSusdr,
  getCachedPendingUnstakeBaseUnits,
  getCachedStakingApy,
  getCachedVaultRate,
  subscribeToCardDataChanges,
} from '../realfi-yield';

import type { AvailableAddons } from '..';
import type { TranslationKey } from '@lace-contract/i18n';
import type { ContextualLaceInit } from '@lace-contract/module';
import type {
  StakingCenterProductCard,
  StakingCenterProductCardAddon,
} from '@lace-contract/staking-center';
import type { AccountId } from '@lace-contract/wallet-repo';

// The addon is invoked by the host loader (not in React render), so it cannot
// read live Redux position/balance via useLaceSelector. It contributes a single
// "USDr Staking" entry card. Per-account cards + live USD totals +
// reward-contribution aggregation remain a refinement (spec M2/M4). The shape:
// contributor → addon contract → host fold → StakingCenterPage product cards.
const PLACEHOLDER_ACCOUNT_ID = '' as AccountId;

const USDR_DECIMALS = 6;

// The addon is synchronous and runs in the module loader without Redux access,
// so it cannot read the REALFI flag payload / active network at load time.
// Every network-dependent figure (balance token ids + vault rate, APY, earned
// rate, pending funds) is therefore a per-render resolver the hub calls with
// the live flags + active network (like `isEnabledForNetwork`), backed by the
// store-mirrored module caches (the makeYieldInfoCache side-effect — the same
// figures the USDr detail screen selects).
const buildCard = (): StakingCenterProductCard => {
  return {
    id: 'realfi-usdr',
    accountId: PLACEHOLDER_ACCOUNT_ID,
    // The hub calls this with the LIVE flags + active network on every render —
    // the addon itself runs network-blind in the loader, so this closure is how
    // the card stays preview-only when the wallet sits on another network.
    isEnabledForNetwork: (featureFlags, activeNetworkId) =>
      getRealFiConfigFromFlags(featureFlags, activeNetworkId) !== undefined,
    // `satisfies` keeps the compile-time key check the contract field can't
    // carry (it is `string` — the TranslationKey union in the contract type
    // overflows module type serialization, TS7056).
    titleKey: 'realfi.staking-center.card.title' satisfies TranslationKey,
    totalBalanceUsdDisplay: '$0.00',
    // The card's brand logo, contributed here so the hub stays product-neutral.
    icon: Logos.Usdr,
    // Total Balance on the card = USD value of the position (staked sUSDr valued
    // at that network's live vault rate + available USDr at $1), summed across
    // active-network accounts by the host — the same figure as the detail
    // screen's Total Balance. Resolved per render (like apyDisplay): a
    // load-time snapshot froze a cold boot's $1 vault-rate fallback for the
    // whole mount, and compile-time token ids ignored flag-payload overrides.
    usdBalance: (featureFlags, activeNetworkId) => {
      const config = getRealFiConfigFromFlags(featureFlags, activeNetworkId);
      if (!config) return undefined;
      return {
        tokens: [
          {
            tokenId: TokenId(config.susdrTokenId),
            usdRate: getCachedVaultRate(config.realfiNetwork),
          },
          { tokenId: TokenId(config.usdrTokenId), usdRate: 1 },
        ],
      };
    },
    // Undefined until the active network's APY cache has primed, so the card
    // shows no yield rather than an invented (or another network's) rate.
    apyDisplay: (featureFlags, activeNetworkId) => {
      const config = getRealFiConfigFromFlags(featureFlags, activeNetworkId);
      const apy = config
        ? getCachedStakingApy(config.realfiNetwork)
        : undefined;
      return apy === undefined ? undefined : `${(apy * 100).toFixed(1)}%`;
    },
    // Total Earned contribution (LW-14651): staked sUSDr earns its vault-rate
    // appreciation over the persisted first-seen basis; the host multiplies by
    // its live sUSDr balance. Undefined until the network's rate is observed.
    earnedUsdPerToken: (featureFlags, activeNetworkId) => {
      const config = getRealFiConfigFromFlags(featureFlags, activeNetworkId);
      if (!config) return undefined;
      const earnedUsdPerUnit = getCachedEarnedUsdPerSusdr(config.realfiNetwork);
      if (earnedUsdPerUnit === undefined) return undefined;
      return [{ tokenId: TokenId(config.susdrTokenId), earnedUsdPerUnit }];
    },
    // Funds mid-unstake (cooldown + withdraw-ready timelocks) have left every
    // wallet balance, so the host adds this on top of the usdBalance token sum
    // (LW-14651 AC1). Base units are USDr (6 decimals) valued at $1, matching
    // the detail screen. Wallet-wide by construction (like the detail's
    // selectAllWithdrawables); the config gate keeps it off disabled networks.
    pendingUsd: (featureFlags, activeNetworkId) => {
      const config = getRealFiConfigFromFlags(featureFlags, activeNetworkId);
      if (!config) return undefined;
      return Number(getCachedPendingUnstakeBaseUnits()) / 10 ** USDR_DECIMALS;
    },
    subscribe: subscribeToCardDataChanges,
    hasActivePosition: false,
    onPress: () => {
      NavigationControls.navigate(StackRoutes.UsdrStakingDetail, {
        accountId: PLACEHOLDER_ACCOUNT_ID,
      });
    },
    // Stake CTA lands on the USDr staking center, which itself opens the
    // "How it Works" carousel on the first visit only (persisted flag) — the
    // addon runs outside Redux and cannot make that decision here.
    onManageStake: () => {
      NavigationControls.navigate(StackRoutes.UsdrStakingDetail, {
        accountId: PLACEHOLDER_ACCOUNT_ID,
      });
    },
  };
};

// Synchronous (matches the proven data-addon pattern, e.g.
// createAddressBookAddressValidator) so useLoadModules returns the resolved
// data directly, not a Promise. All live figures resolve per render through
// the card's closures — nothing is snapshotted at load time.
const loadStakingCenterProductCard: ContextualLaceInit<
  StakingCenterProductCardAddon,
  AvailableAddons
> = () => ({
  cards: [buildCard()],
  // Season banner (LW-15495). Gating (flags, network, end date) lives inside
  // the component — the loader is network/store-blind, like the cards above.
  banner: { id: 'realfi-genesis-boost', Component: GenesisBoostBanner },
});

export default loadStakingCenterProductCard;
