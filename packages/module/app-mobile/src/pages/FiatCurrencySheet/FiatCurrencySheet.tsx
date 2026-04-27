import { FiatCurrencySheet as FiatCurrencySheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useFiatCurrencySheet } from './useFiatCurrencySheet';

export const FiatCurrencySheet = () => {
  const fiatCurrencySheetProps = useFiatCurrencySheet();

  return <FiatCurrencySheetTemplate {...fiatCurrencySheetProps} />;
};
