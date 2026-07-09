import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, CustomTextInput } from '../../../atoms';
import { footerHeight } from '../../../organisms';
import { NAME_MAX_LENGTH } from '../../../util';

interface LabelsProps {
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
}

export const EditWalletSheetTemplate = ({
  labels,
  actions,
}: EditWalletSheetProps) => {
  const { nameLabel, name, nameError } = labels;
  const { onNameChange } = actions;

  return (
    <Column testID="edit-wallet-sheet" style={styles.container}>
      <CustomTextInput
        label={nameLabel}
        value={name}
        onChangeText={onNameChange}
        inputError={nameError}
        testID="edit-wallet-sheet-name-input"
        animatedLabel
        maxLength={NAME_MAX_LENGTH}
      />
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.M,
    paddingBottom: footerHeight.horizontal,
  },
});
