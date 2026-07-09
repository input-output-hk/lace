import {
  FiatCurrencySheet as FiatCurrencySheetTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useFiatCurrencySheet } from './useFiatCurrencySheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const FiatCurrencySheet = ({
  navigation,
}: SheetScreenProps<SheetRoutes.FiatCurrencySheet>) => {
  const fiatCurrencySheetProps = useFiatCurrencySheet();

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={fiatCurrencySheetProps.title}
          subtitle={fiatCurrencySheetProps.description}
          testID="fiat-currency-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          showDivider
          secondaryButton={{
            label: fiatCurrencySheetProps.cancelLabel,
            onPress: fiatCurrencySheetProps.onClose,
            testID: 'fiat-currency-sheet-cancel-button',
          }}
          primaryButton={{
            label: fiatCurrencySheetProps.confirmLabel,
            onPress: fiatCurrencySheetProps.onConfirm,
            testID: 'fiat-currency-sheet-confirm-button',
          }}
        />
      ),
    });
  }, [
    navigation,
    fiatCurrencySheetProps.title,
    fiatCurrencySheetProps.description,
    fiatCurrencySheetProps.cancelLabel,
    fiatCurrencySheetProps.confirmLabel,
    fiatCurrencySheetProps.onClose,
    fiatCurrencySheetProps.onConfirm,
  ]);

  return <FiatCurrencySheetTemplate {...fiatCurrencySheetProps} />;
};
