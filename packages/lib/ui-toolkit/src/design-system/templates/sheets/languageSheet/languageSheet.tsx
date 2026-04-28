import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Text } from '../../../atoms';
import {
  RadioGroup,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

interface LanguageSheetProps {
  title: string;
  description: string;
  radioOptions: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  cancelLabel: string;
  confirmLabel: string;
}

export const LanguageSheet = ({
  title,
  description,
  radioOptions,
  value,
  onChange,
  onClose,
  onConfirm,
  cancelLabel,
  confirmLabel,
}: LanguageSheetProps) => {
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        testID="language-sheet"
        contentContainerStyle={styles.container}>
        <Text.S>{description}</Text.S>

        <RadioGroup
          options={radioOptions}
          value={value}
          onChange={onChange}
          direction="column"
          style={styles.radioGroup}
        />
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={{
          label: cancelLabel,
          onPress: onClose,
          testID: 'language-sheet-cancel-button',
        }}
        primaryButton={{
          label: confirmLabel,
          onPress: onConfirm,
          testID: 'language-sheet-confirm-button',
        }}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    container: {
      paddingBottom: footerHeight,
    },
    radioGroup: {
      marginTop: spacing.L,
      gap: spacing.M,
    },
  });
