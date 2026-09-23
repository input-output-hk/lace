import {
  ADA_DECIMALS,
  LOVELACE_TOKEN_ID,
} from '@lace-contract/cardano-context';
import {
  CardanoTokenPriceId,
  getTokenPriceId,
  priceAmountInUsd,
} from '@lace-contract/token-pricing';
import { BigNumber } from '@lace-lib/util';

import type { RealFiReview } from './store/types';
import type { AnalyticsEventName } from '@lace-contract/analytics';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';

/** USDr/sUSDr base-unit precision. */
export const USDR_DECIMALS = 6;

/** The tracked flow kinds — claim analytics ride the withdraw path instead. */
export type RealFiTrackedFlowKind = 'stake' | 'unstake';

/**
 * PostHog event name per tracked flow kind and lifecycle stage (LW-15494).
 * `initiated` is UI-fired (the Manage sheet's CTA press), so it is absent here.
 */
export const REALFI_FLOW_EVENT_NAME = {
  stake: {
    txBuilt: 'realfi | usdr stake | tx built',
    submitted: 'realfi | usdr stake | submitted',
    success: 'realfi | usdr stake | success',
    failure: 'realfi | usdr stake | failure',
  },
  unstake: {
    txBuilt: 'realfi | usdr unstake | tx built',
    submitted: 'realfi | usdr unstake | submitted',
    success: 'realfi | usdr unstake | success',
    failure: 'realfi | usdr unstake | failure',
  },
} as const satisfies Record<
  RealFiTrackedFlowKind,
  Record<string, AnalyticsEventName>
>;

/** The flow fields the analytics context is derived from. */
export type RealFiFlowAnalyticsSnapshot = {
  kind: RealFiTrackedFlowKind;
  /** Input amount, base units (stake input token / sUSDr on unstake). */
  inputAmount: string;
  inputTokenId: string;
  review: RealFiReview;
};

/**
 * Value properties shared by every RealFi transaction lifecycle event.
 * `usdr_amount` is the order's USDr-side size and `usd_value` the USD value of
 * what the user committed — both plain numbers so PostHog can sum and average
 * them (LW-15494 reports raw amounts, not buckets).
 */
export type RealFiFlowAnalyticsContext = {
  tx_type: RealFiTrackedFlowKind;
  usdr_amount?: number;
  usd_value?: number;
  source_token: string;
};

/** Base units → full units, or `undefined` for an unreadable amount. */
export const baseUnitsToNumber = (
  baseUnits: string,
  decimals: number,
): number | undefined => {
  const amount = Number(baseUnits);
  return Number.isFinite(amount) ? amount / 10 ** decimals : undefined;
};

/** A provider amount as a positive bigint, or `undefined` when unusable. */
const positiveAmount = (raw: string): bigint | undefined => {
  let amount: bigint;
  try {
    amount = BigInt(raw);
  } catch {
    return undefined;
  }
  return amount > 0n ? amount : undefined;
};

/** USD value of the flow's input leg via the price cache, when priceable. */
const priceInputInUsd = (
  flow: RealFiFlowAnalyticsSnapshot,
  inputToken: Token | undefined,
  prices: Record<TokenPriceId, TokenPrice>,
): number | undefined => {
  const amount = positiveAmount(flow.inputAmount);
  if (amount === undefined) return undefined;
  if (flow.inputTokenId === LOVELACE_TOKEN_ID) {
    return priceAmountInUsd({
      amount: BigNumber(amount),
      decimals: ADA_DECIMALS,
      priceId: CardanoTokenPriceId(LOVELACE_TOKEN_ID),
      prices,
    });
  }
  if (!inputToken?.metadata) return undefined;
  const priceId = getTokenPriceId(inputToken);
  if (priceId === null) return undefined;
  return priceAmountInUsd({
    amount: BigNumber(amount),
    decimals: inputToken.decimals,
    priceId,
    prices,
  });
};

/**
 * The value/context properties of a RealFi flow analytics payload.
 *
 * `usdr_amount`: a USDr-funded stake reports its exact input; any other order
 * reports `estimatedOutput` — the USDr redeemed on unstake (the output is
 * locked to USDr), and the sUSDr minted on a swap-routed stake, ≈ USDr while
 * the vault rate sits near 1 (early-season drift is a few percent at most).
 *
 * `usd_value`: the input leg priced from the cache; when unpriceable (USDr and
 * sUSDr carry no CoinGecko price) it falls back to the USD-pegged
 * `usdr_amount`, so the property survives a price outage rather than vanish.
 */
export const getFlowAnalyticsContext = ({
  flow,
  prices,
  selectTokenById,
  usdrTokenId,
}: {
  flow: RealFiFlowAnalyticsSnapshot;
  prices: Record<TokenPriceId, TokenPrice>;
  selectTokenById: (tokenId: string) => Token | undefined;
  usdrTokenId: string | undefined;
}): RealFiFlowAnalyticsContext => {
  const isUsdrInput =
    usdrTokenId !== undefined && flow.inputTokenId === usdrTokenId;
  const usdrAmount = baseUnitsToNumber(
    flow.kind === 'stake' && isUsdrInput
      ? flow.inputAmount
      : flow.review.estimatedOutput,
    USDR_DECIMALS,
  );
  const inputToken = selectTokenById(flow.inputTokenId);
  const usdValue = priceInputInUsd(flow, inputToken, prices) ?? usdrAmount;
  return {
    tx_type: flow.kind,
    ...(usdrAmount !== undefined && { usdr_amount: usdrAmount }),
    ...(usdValue !== undefined && { usd_value: usdValue }),
    source_token:
      flow.inputTokenId === LOVELACE_TOKEN_ID
        ? 'ADA'
        : inputToken?.displayShortName ?? flow.inputTokenId,
  };
};
