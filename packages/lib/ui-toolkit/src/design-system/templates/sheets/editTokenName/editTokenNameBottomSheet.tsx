import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, CustomTextInput } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

interface EditTokenNameBottomSheetProps {
  labels: {
    title: string;
    nameLabel: string;
    tickerLabel: string;
    confirmLabel: string;
    cancelLabel: string;
  };
  values: {
    tokenFullName: string;
    tokenShortName: string;
    tokenFullNameError?: string;
    tokenShortNameError?: string;
  };
  actions: {
    onTokenFullNameChange: (value: string) => void;
    onTokenShortNameChange: (value: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
  };
  utils: {
    isConfirmDisabled: boolean;
  };
}

export const EditTokenNameBottomSheet = ({
  labels,
  values,
  actions,
  utils,
}: EditTokenNameBottomSheetProps) => {
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);

  return (
    <>
      <SheetHeader title={labels.title} />
      <Sheet.Scroll contentContainerStyle={styles.sheetContent}>
        <Column gap={spacing.L} style={styles.content}>
          <CustomTextInput
            label={labels.nameLabel}
            value={values.tokenFullName}
            onChangeText={actions.onTokenFullNameChange}
            inputError={values.tokenFullNameError}
            isWithinBottomSheet
          />
          <CustomTextInput
            label={labels.tickerLabel}
            value={values.tokenShortName}
            onChangeText={actions.onTokenShortNameChange}
            inputError={values.tokenShortNameError}
            isWithinBottomSheet
          />
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={{
          label: labels.cancelLabel,
          onPress: actions.onCancel,
        }}
        primaryButton={{
          label: labels.confirmLabel,
          onPress: actions.onConfirm,
          disabled: utils.isConfirmDisabled,
        }}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    sheetContent: {
      paddingBottom: footerHeight,
    },
    content: {
      marginHorizontal: spacing.S,
      marginTop: spacing.M,
    },
  });
