import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import {
  RadioGroup,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

interface FiatCurrencySheetProps {
  title: string;
  description: string;
  radioOptions: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  cancelLabel: string;
  confirmLabel: string;
  testID?: string;
}

export const FiatCurrencySheet = ({
  title,
  description,
  radioOptions,
  value,
  onChange,
  onClose,
  onConfirm,
  cancelLabel,
  confirmLabel,
  testID = 'fiat-currency-sheet',
}: FiatCurrencySheetProps) => {
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);

  return (
    <>
      <SheetHeader
        title={title}
        subtitle={description}
        testID="fiat-currency-sheet-header"
      />
      <Sheet.Scroll testID={testID} contentContainerStyle={styles.container}>
        <RadioGroup
          options={radioOptions}
          value={value}
          onChange={onChange}
          direction="column"
        />
      </Sheet.Scroll>
      <SheetFooter
        showDivider
        secondaryButton={{
          label: cancelLabel,
          onPress: onClose,
          testID: 'fiat-currency-sheet-cancel-button',
        }}
        primaryButton={{
          label: confirmLabel,
          onPress: onConfirm,
          testID: 'fiat-currency-sheet-confirm-button',
        }}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    container: {
      padding: spacing.L,
      paddingBottom: footerHeight,
    },
  });
