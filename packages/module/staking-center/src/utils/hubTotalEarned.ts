import { formatLocaleNumber } from '@lace-lib/util-render';

import { DEFAULT_DECIMALS } from './formatting';
import { formatUsdInSelectedCurrency } from './productCardBalance';

import type { ProductCardCurrencyContext } from './productCardBalance';
import type { StakingCenterEarnedTokenRate } from '@lace-contract/staking-center';
import type { Token } from '@lace-contract/tokens';

type BalanceToken = Pick<Token, 'available' | 'decimals' | 'tokenId'>;

const LOVELACE_PER_ADA = 1_000_000;

/**
 * The hub Staking Status card's combined "Total Earned" (LW-14651): lifetime
 * Cardano rewards valued at the current ADA/USD price, plus each contributed
 * token's wallet balance × its USD-earned rate, shown in the selected display
 * currency (USD fallback). When Cardano rewards exist but ADA is unpriced or
 * stale, the Cardano leg is shown denominated in ADA instead of being valued
 * at a wrong price — a permanent loading shimmer (the previous behavior) hid
 * real earnings for as long as the price stayed unavailable.
 */
export const formatHubTotalEarned = ({
  cardanoRewardsLovelace,
  adaPriceUsd,
  earnedTokens,
  aggregatedFungibleTokens,
  currencyContext,
}: {
  cardanoRewardsLovelace: string;
  /** Fresh ADA→USD price; undefined when unpriced or stale. */
  adaPriceUsd: number | undefined;
  earnedTokens: readonly StakingCenterEarnedTokenRate[];
  aggregatedFungibleTokens: readonly BalanceToken[];
  currencyContext: ProductCardCurrencyContext;
}): string => {
  const rewardsAda = Number(cardanoRewardsLovelace) / LOVELACE_PER_ADA;
  const tokensUsd = earnedTokens.reduce(
    (sum, { tokenId, earnedUsdPerUnit }) => {
      const token = aggregatedFungibleTokens.find(
        entry => entry.tokenId === tokenId,
      );
      const amount = token
        ? Number(token.available.toString()) / 10 ** token.decimals
        : 0;
      return sum + amount * earnedUsdPerUnit;
    },
    0,
  );
  if (rewardsAda > 0 && adaPriceUsd === undefined) {
    const adaPart = `${formatLocaleNumber(
      String(rewardsAda),
      DEFAULT_DECIMALS,
    )} ADA`;
    return tokensUsd > 0
      ? `${adaPart} + ${formatUsdInSelectedCurrency(
          tokensUsd,
          currencyContext,
        )}`
      : adaPart;
  }
  const cardanoUsd = rewardsAda * (adaPriceUsd ?? 0);
  return formatUsdInSelectedCurrency(cardanoUsd + tokensUsd, currencyContext);
};
