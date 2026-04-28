import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Button, Column, Loader, Text } from '../../../atoms';
import {
  RecoveryPhrase,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { ByteArray } from '@lace-sdk/util';

interface RecoveryPhraseDisplaySheetProps {
  title: string;
  description: string;
  mnemonicWords: ByteArray[] | null;
  isBlurred: boolean;
  showPassphraseLabel: string;
  hidePassphraseLabel: string;
  continueButtonLabel: string;
  copyButtonLabel?: string;
  onToggleBlur: () => void;
  onContinue: () => void;
  onCopy?: () => void;
  testID?: string;
  continueButtonTestID?: string;
  copyButtonTestID?: string;
  showHideButtonTestID?: string;
}

export const RecoveryPhraseDisplaySheet = ({
  title,
  description,
  mnemonicWords,
  isBlurred,
  showPassphraseLabel,
  hidePassphraseLabel,
  continueButtonLabel,
  copyButtonLabel,
  onToggleBlur,
  onContinue,
  onCopy,
  testID = 'recovery-phrase-display-sheet',
  continueButtonTestID = 'recovery-phrase-display-continue-button',
  copyButtonTestID = 'recovery-phrase-display-copy-button',
  showHideButtonTestID,
}: RecoveryPhraseDisplaySheetProps) => {
  const { theme } = useTheme();
  const showHideButtonLabel = isBlurred
    ? showPassphraseLabel
    : hidePassphraseLabel;
  const defaultShowHideButtonTestID = isBlurred
    ? 'recovery-phrase-show-button'
    : 'recovery-phrase-hide-button';

  const footerHeight = useFooterHeight();
  const styles = getStyles(footerHeight);

  return (
    <>
      <SheetHeader
        title={title}
        testID="recovery-phrase-display-sheet-header"
      />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        testID={testID}
        contentContainerStyle={styles.contentContainer}>
        <Column style={styles.content} gap={spacing.L}>
          <Text.S align="center">{description}</Text.S>
          <Button.Secondary
            preIconName={isBlurred ? 'View' : 'ViewOff'}
            label={showHideButtonLabel}
            onPress={onToggleBlur}
            testID={showHideButtonTestID || defaultShowHideButtonTestID}
            flex={1}
          />
          {!mnemonicWords && (
            <Loader color={theme.text.primary} style={styles.loader} />
          )}
          {mnemonicWords && (
            <RecoveryPhrase
              words={mnemonicWords}
              isBlurred={isBlurred}
              testID="recovery-phrase-display-words"
            />
          )}
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={
          onCopy && copyButtonLabel
            ? {
                label: copyButtonLabel,
                onPress: onCopy,
                preIconName: 'Copy',
                testID: copyButtonTestID,
              }
            : undefined
        }
        primaryButton={{
          label: continueButtonLabel,
          onPress: onContinue,
          testID: continueButtonTestID,
          disabled: isBlurred,
        }}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom: footerHeight,
    },
    content: {
      paddingHorizontal: spacing.M,
    },
    loader: {
      marginVertical: 0,
      marginHorizontal: 'auto',
    },
  });
