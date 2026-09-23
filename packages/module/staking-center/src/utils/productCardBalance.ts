import { formatLocaleNumber } from '@lace-lib/util-render';

import { DEFAULT_DECIMALS } from './formatting';

import type { StakingCenterProductCard } from '@lace-contract/staking-center';
import type { CurrencyPreference } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';

type BalanceToken = Pick<Token, 'available' | 'decimals' | 'tokenId'>;

export type ProductCardCurrencyContext = {
  currency: CurrencyPreference;
  /**
   * USD → selected-currency rate (`tokenPricing.selectUsdToCurrencyRate`).
   * Undefined ⇒ no fresh conversion is available, so the USD-denominated
   * total is shown as USD rather than mislabeled in the selected currency.
   */
  usdToCurrencyRate: number | undefined;
};

export type ProductCardBalanceInputs = {
  // Resolved by the caller from the card's per-render `usdBalance` resolver
  // (live flags + active network) — never a load-time snapshot.
  usdBalance:
    | ReturnType<NonNullable<StakingCenterProductCard['usdBalance']>>
    | undefined;
  aggregatedFungibleTokens: readonly BalanceToken[];
};

// A product card's Total Balance = the USD sum of the tokens it declares via
// `usdBalance` (each token's wallet-total across active-network accounts ×
// its usdRate), e.g. staked sUSDr at the vault rate + available USDr at $1,
// plus `pendingUsd` — funds mid-flow (unstake cooldown / withdraw-ready) that
// have left every wallet balance — converted to the user's selected currency
// when a rate is available. Falls back to the card's own USD display when no
// usdBalance is declared.
export const formatProductCardBalance = (
  card: Pick<StakingCenterProductCard, 'totalBalanceUsdDisplay'>,
  { usdBalance, aggregatedFungibleTokens }: ProductCardBalanceInputs,
  {
    currency,
    usdToCurrencyRate,
    pendingUsd = 0,
  }: ProductCardCurrencyContext & { pendingUsd?: number },
): string => {
  if (!usdBalance) return card.totalBalanceUsdDisplay;
  const totalUsd = usdBalance.tokens.reduce((sum, { tokenId, usdRate }) => {
    const token = aggregatedFungibleTokens.find(
      entry => entry.tokenId === tokenId,
    );
    const amount = token
      ? Number(token.available.toString()) / 10 ** token.decimals
      : 0;
    return sum + amount * usdRate;
  }, pendingUsd);
  return formatUsdInSelectedCurrency(totalUsd, { currency, usdToCurrencyRate });
};

/**
 * A USD-denominated figure in the user's selected display currency (USD label
 * fallback while no fresh conversion rate is cached). Zero reads "0 <CODE>"
 * with no decimals (LW-14648's exact "0 USD" empty state).
 */
export const formatUsdInSelectedCurrency = (
  totalUsd: number,
  { currency, usdToCurrencyRate }: ProductCardCurrencyContext,
): string => {
  const [total, code] =
    usdToCurrencyRate === undefined
      ? [totalUsd, 'USD']
      : [totalUsd * usdToCurrencyRate, currency.name];
  if (total === 0) return `0 ${code}`;
  return `${formatLocaleNumber(String(total), DEFAULT_DECIMALS)} ${code}`;
};
