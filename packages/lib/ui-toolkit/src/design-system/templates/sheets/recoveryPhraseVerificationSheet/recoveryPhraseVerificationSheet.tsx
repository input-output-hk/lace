import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, CustomTextInput, Text } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

interface RecoveryPhraseVerificationSheetProps {
  title: string;
  description: string;
  inputValue: string;
  errorMessage: string;
  placeholder: string;
  finishButtonLabel: string;
  pasteButtonLabel?: string;
  isFinishEnabled: boolean;
  onInputChange: (text: string) => void;
  onFinish: () => void;
  onPaste?: () => void;
  onBack: () => void;
  testID?: string;
  finishButtonTestID?: string;
  pasteButtonTestID?: string;
  inputTestID?: string;
}

export const RecoveryPhraseVerificationSheet = ({
  title,
  description,
  inputValue,
  errorMessage,
  placeholder,
  finishButtonLabel,
  pasteButtonLabel,
  isFinishEnabled,
  onInputChange,
  onFinish,
  onPaste,
  onBack,
  testID = 'recovery-phrase-verification-sheet',
  finishButtonTestID = 'recovery-phrase-verification-finish-button',
  pasteButtonTestID = 'recovery-phrase-verification-paste-button',
  inputTestID = 'recovery-phrase-verification-input',
}: RecoveryPhraseVerificationSheetProps) => {
  const footerHeight = useFooterHeight();
  const styles = getStyles(footerHeight);

  return (
    <>
      <SheetHeader
        title={title}
        leftIconOnPress={onBack}
        testID="recovery-phrase-verification-sheet-header"
      />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        testID={testID}
        contentContainerStyle={styles.contentContainer}>
        <Text.S align="center">{description}</Text.S>
        <Column gap={spacing.L}>
          <CustomTextInput
            isWithinBottomSheet
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
      <SheetFooter
        secondaryButton={
          onPaste && pasteButtonLabel
            ? {
                label: pasteButtonLabel,
                onPress: onPaste,
                preIconName: 'Paste',
                testID: pasteButtonTestID,
              }
            : undefined
        }
        primaryButton={{
          label: finishButtonLabel,
          onPress: onFinish,
          disabled: !isFinishEnabled,
          testID: finishButtonTestID,
        }}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom: footerHeight,
      gap: spacing.XL,
    },
  });
