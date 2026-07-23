import {
  BitcoinTokenPriceId,
  CardanoTokenPriceId,
} from '@lace-contract/token-pricing';
import { valueToLocale } from '@lace-lib/util-render';
import BigNumberJs from 'bignumber.js';

export type ComputeFiatForFeeParams = {
  rawAmount: string;
  chainName: string | null;
  allPrices: Record<string, { price: number }> | undefined;
  currencyPreference: { name: string } | undefined;
};

const EMPTY_FIAT: { value: string; currency: string } = {
  value: '',
  currency: '',
};

const SATOSHIS_PER_BTC = 100_000_000;
const LOVELACE_PER_ADA = 1_000_000;

/**
 * Computes fiat value and currency for a fee entry using BigNumber for precision.
 * Supports Bitcoin (satoshis → BTC) and Cardano (lovelace → ADA).
 */
export const computeFiatForFee = ({
  rawAmount,
  chainName,
  allPrices,
  currencyPreference,
}: ComputeFiatForFeeParams): { value: string; currency: string } => {
  if (!allPrices || !currencyPreference) {
    return EMPTY_FIAT;
  }

  let priceId: string;
  let amountInBaseUnit: BigNumberJs;

  // Prices are keyed by the base-coin tokenId (BITCOIN_TOKEN_ID / LOVELACE_TOKEN_ID),
  // not the ticker. Inlined here to keep this generic module independent of the
  // blockchain-context contracts.
  if (chainName === 'Bitcoin') {
    priceId = BitcoinTokenPriceId('bitcoin');
    amountInBaseUnit = new BigNumberJs(rawAmount).div(SATOSHIS_PER_BTC);
  } else if (chainName === 'Cardano') {
    priceId = CardanoTokenPriceId('lovelace');
    amountInBaseUnit = new BigNumberJs(rawAmount).div(LOVELACE_PER_ADA);
  } else {
    return EMPTY_FIAT;
  }

  const priceData = allPrices[priceId];
  if (!priceData?.price) return EMPTY_FIAT;

  const fiatValue = amountInBaseUnit.times(priceData.price);
  return {
    value: valueToLocale(fiatValue.toString(), 2, 2),
    currency: currencyPreference.name,
  };
};
