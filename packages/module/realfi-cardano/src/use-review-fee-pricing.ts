import {
  ADA_DECIMALS,
  LOVELACE_TOKEN_ID,
} from '@lace-contract/cardano-context';
import { getTokenPriceId } from '@lace-contract/token-pricing';
import { useMemo } from 'react';

import {
  adaPriceInCurrencyFrom,
  convertFeeToAdaAndFiat,
  priceInCurrencyFrom,
  serviceFeePriceInCurrency,
} from './fee-display';
import { useLaceSelector } from './hooks';

import type { Token } from '@lace-contract/tokens';

/** The review fields the fee rows price (a `RealFiReview` subset). */
export type ReviewFeeFields = {
  networkFee: string;
  processingFee: string;
  serviceFee: string;
  serviceFeeTokenId: string;
};

/**
 * Shared fee pricing for the Manage and Review sheets (LW-14680/14681 —
 * previously duplicated in both): the network and RealFi processing fees
 * (lovelace) and the service
 * fee — charged in the swap-input token on stake, USDr on unstake — each
 * converted to ADA + fiat at live prices (USDr at the epic's $1-per-USDr
 * convention via the USD→currency rate, anything else from the token-pricing
 * feed), alongside its charged-denomination `units`, which need no rate. The
 * two fees are NOT summable as raw base units, hence the conversion; an
 * unpriceable service fee yields `undefined` converted legs so callers fall
 * back honestly, never to a mislabeled figure.
 */
export const useReviewFeePricing = ({
  review,
  accountFungibleTokens,
  usdrTokenId,
}: {
  review: ReviewFeeFields | undefined;
  accountFungibleTokens: readonly Token[] | undefined;
  /** The active network's USDr id (wallet form) — priced at the USD rate. */
  usdrTokenId: string | undefined;
}) => {
  const prices = useLaceSelector('tokenPricing.selectPrices');
  const usdToCurrencyRate = useLaceSelector(
    'tokenPricing.selectUsdToCurrencyRate',
  );
  // Priced like the send flow's fee rows (LW-14681): the fixed lovelace price
  // entry, gated only on a positive price.
  const adaPriceInCurrency = adaPriceInCurrencyFrom(prices);

  const serviceFeeTokenId = review?.serviceFeeTokenId;
  const serviceFeeToken = useMemo(
    () =>
      (accountFungibleTokens ?? []).find(
        item => item.tokenId === serviceFeeTokenId,
      ),
    [accountFungibleTokens, serviceFeeTokenId],
  );
  const serviceFeeTokenPriceInCurrency = useMemo(
    () =>
      serviceFeePriceInCurrency({
        serviceFeeTokenId,
        lovelaceTokenId: LOVELACE_TOKEN_ID,
        usdrTokenId,
        usdToCurrencyRate,
        feedPriceInCurrency: priceInCurrencyFrom(
          prices,
          serviceFeeToken ? getTokenPriceId(serviceFeeToken) : undefined,
        ),
      }),
    [
      serviceFeeTokenId,
      usdrTokenId,
      usdToCurrencyRate,
      serviceFeeToken,
      prices,
    ],
  );

  const networkFee = useMemo(
    () =>
      convertFeeToAdaAndFiat(
        {
          baseUnits: review?.networkFee ?? '0',
          isLovelace: true,
          decimals: ADA_DECIMALS,
        },
        { adaPriceInCurrency, feeTokenPriceInCurrency: undefined },
      ),
    [review?.networkFee, adaPriceInCurrency],
  );
  const processingFee = useMemo(
    () =>
      convertFeeToAdaAndFiat(
        {
          baseUnits: review?.processingFee ?? '0',
          isLovelace: true,
          decimals: ADA_DECIMALS,
        },
        { adaPriceInCurrency, feeTokenPriceInCurrency: undefined },
      ),
    [review?.processingFee, adaPriceInCurrency],
  );
  const serviceFee = useMemo(
    () =>
      convertFeeToAdaAndFiat(
        {
          baseUnits: review?.serviceFee ?? '0',
          isLovelace: serviceFeeTokenId === LOVELACE_TOKEN_ID,
          decimals: serviceFeeToken?.decimals ?? ADA_DECIMALS,
        },
        {
          adaPriceInCurrency,
          feeTokenPriceInCurrency: serviceFeeTokenPriceInCurrency,
        },
      ),
    [
      review?.serviceFee,
      serviceFeeTokenId,
      serviceFeeToken?.decimals,
      adaPriceInCurrency,
      serviceFeeTokenPriceInCurrency,
    ],
  );

  return {
    adaPriceInCurrency,
    usdToCurrencyRate,
    serviceFeeToken,
    serviceFeeTokenPriceInCurrency,
    networkFee,
    processingFee,
    serviceFee,
  };
};
