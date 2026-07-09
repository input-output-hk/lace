import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, CustomTextInput } from '../../../atoms';
import { footerHeight } from '../../../organisms';
import { NAME_MAX_LENGTH } from '../../../util';

interface actionProps {
  onSubmit: () => void;
  onCancel: () => void;
  onChangeText: (text: string) => void;
}

interface copiesProps {
  inputLabel: string;
  headerTitle?: string;
  secondaryButtonLabel?: string;
  primaryButtonLabel?: string;
}

interface utilsProps {
  nameValue: string;
  nameError?: string;
  isDisabled: boolean;
}

interface EditAccountSheetProps {
  actions: actionProps;
  copies: copiesProps;
  utils: utilsProps;
}

export const CustomizeAccountSheet = ({
  actions,
  copies,
  utils,
}: EditAccountSheetProps) => {
  const { onChangeText } = actions;

  const { nameValue, nameError } = utils;

  const { inputLabel } = copies;

  return (
    <Column
      gap={spacing.L}
      testID="customize-account-sheet"
      style={styles.container}>
      <CustomTextInput
        testID="customize-account-name-input"
        label={inputLabel}
        value={nameValue}
        onChangeText={onChangeText}
        inputError={nameError}
        size="small"
        animatedLabel
        maxLength={NAME_MAX_LENGTH}
      />
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.M,
    paddingBottom: footerHeight.horizontal,
    paddingHorizontal: spacing.M,
  },
});
