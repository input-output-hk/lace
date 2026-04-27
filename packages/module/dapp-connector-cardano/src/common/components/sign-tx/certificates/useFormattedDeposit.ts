import { useMemo } from 'react';

import { formatDeposit } from '../../../utils';
import { calculateAdaFiatValue } from '../../../utils/sign-tx-utils';

import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

export type UseFormattedDepositParams = {
  depositLovelace: bigint | undefined;
  coinSymbol: string;
  tokenPrices: Record<TokenPriceId, TokenPrice> | undefined;
  currencyTicker: string | undefined;
};

/**
 * Computes formatted ADA and optional fiat strings for a lovelace deposit amount.
 *
 * Centralises the repeated `useMemo` + format/fiat pattern used across certificate
 * components. When `depositLovelace` is undefined, `hasDeposit` is false and both
 * `formatted` and `fiat` are undefined.
 */
export const useFormattedDeposit = ({
  depositLovelace,
  coinSymbol,
  tokenPrices,
  currencyTicker,
}: UseFormattedDepositParams) => {
  const formatted = useMemo(
    () =>
      depositLovelace == null
        ? undefined
        : formatDeposit(depositLovelace, coinSymbol),
    [depositLovelace, coinSymbol],
  );
  const fiat = useMemo(
    () =>
      depositLovelace == null
        ? undefined
        : calculateAdaFiatValue(depositLovelace, tokenPrices, currencyTicker),
    [depositLovelace, tokenPrices, currencyTicker],
  );
  return { hasDeposit: depositLovelace != null, formatted, fiat };
};
