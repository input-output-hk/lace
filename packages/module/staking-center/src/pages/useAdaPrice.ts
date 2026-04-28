import { CardanoTokenPriceId } from '@lace-contract/token-pricing';
import { useMemo } from 'react';

import { useLaceSelector } from '../hooks';

export const useAdaPrice = () => {
  const currency = useLaceSelector('tokenPricing.selectCurrencyPreference');

  const tokenPrices = useLaceSelector('tokenPricing.selectPrices');
  const adaPrice = useMemo(
    () => tokenPrices?.[CardanoTokenPriceId('ada')]?.price || 1,
    [tokenPrices],
  );

  return useMemo(() => ({ currency, adaPrice }), [adaPrice]);
};
