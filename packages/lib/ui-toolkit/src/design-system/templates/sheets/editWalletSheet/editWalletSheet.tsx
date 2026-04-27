import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { CustomTextInput } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';
import { NAME_MAX_LENGTH } from '../../../util';

import type { ButtonConfig } from '../../../molecules/sheetFooter/sheetFooter.types';

interface LabelsProps {
  title: string;
  nameLabel: string;
  name: string;
  nameError?: string;
}

interface ActionsProps {
  onNameChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

interface EditWalletSheetProps {
  labels: LabelsProps;
  actions: ActionsProps;
  secondaryButton: ButtonConfig;
  primaryButton: ButtonConfig;
}

export const EditWalletSheetTemplate = ({
  labels,
  actions,
  secondaryButton,
  primaryButton,
}: EditWalletSheetProps) => {
  const { title, nameLabel, name, nameError } = labels;
  const { onNameChange } = actions;
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll
        testID="edit-wallet-sheet"
        contentContainerStyle={styles.contentContainer}>
        <CustomTextInput
          isWithinBottomSheet
          label={nameLabel}
          value={name}
          onChangeText={onNameChange}
          inputError={nameError}
          testID="edit-wallet-sheet-name-input"
          animatedLabel
          maxLength={NAME_MAX_LENGTH}
        />
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={secondaryButton}
        primaryButton={primaryButton}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    contentContainer: {
      paddingTop: spacing.M,
      paddingBottom: footerHeight,
    },
  });
