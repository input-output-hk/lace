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

  if (chainName === 'Bitcoin') {
    priceId = BitcoinTokenPriceId('btc');
    amountInBaseUnit = new BigNumberJs(rawAmount).div(SATOSHIS_PER_BTC);
  } else if (chainName === 'Cardano') {
    priceId = CardanoTokenPriceId('ada');
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
