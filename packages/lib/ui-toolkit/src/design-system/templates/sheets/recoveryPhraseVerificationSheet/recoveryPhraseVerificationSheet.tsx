import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, CustomTextInput, Text } from '../../../atoms';
import { Sheet, footerHeight } from '../../../organisms';

interface RecoveryPhraseVerificationSheetProps {
  description: string;
  inputValue: string;
  errorMessage: string;
  placeholder: string;
  onInputChange: (text: string) => void;
  testID?: string;
  inputTestID?: string;
}

export const RecoveryPhraseVerificationSheet = ({
  description,
  inputValue,
  errorMessage,
  placeholder,
  onInputChange,
  testID = 'recovery-phrase-verification-sheet',
  inputTestID = 'recovery-phrase-verification-input',
}: RecoveryPhraseVerificationSheetProps) => {
  return (
    <Sheet.Scroll
      showsVerticalScrollIndicator={false}
      testID={testID}
      contentContainerStyle={styles.contentContainer}>
      <Text.S align="center">{description}</Text.S>
      <Column gap={spacing.L} style={styles.contentContainer}>
        <CustomTextInput
          value={inputValue}
          onChangeText={onInputChange}
          label={placeholder}
          animatedLabel={true}
          multiline={true}
          numberOfLines={8}
          size="large"
          inputError={errorMessage}
          testID={inputTestID}
        />
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    gap: spacing.XL,
    paddingBottom: footerHeight.horizontal,
  },
});
