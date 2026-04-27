import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Button, Column, Loader } from '../../../atoms';
import {
  RecoveryPhrase,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { ByteArray } from '@lace-sdk/util';

interface RecoveryPhraseSheetTemplateProps {
  title: string;
  mnemonicWords: ByteArray[] | null;
  isBlurred: boolean;
  showPassphraseLabel: string;
  doneButtonLabel: string;
  copyButtonLabel?: string;
  onToggleBlur: () => void;
  onDone: () => void;
  onCopy?: () => void;
  testID?: string;
  doneButtonTestID?: string;
  copyButtonTestID?: string;
  showHideButtonTestID?: string;
}

export const RecoveryPhraseSheetTemplate = ({
  title,
  mnemonicWords,
  isBlurred,
  showPassphraseLabel,
  doneButtonLabel,
  copyButtonLabel,
  onToggleBlur,
  onDone,
  onCopy,
  testID = 'recovery-phrase-sheet',
  doneButtonTestID = 'recovery-phrase-done-button',
  copyButtonTestID = 'recovery-phrase-copy-button',
  showHideButtonTestID,
}: RecoveryPhraseSheetTemplateProps) => {
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);
  const defaultShowHideButtonTestID = isBlurred
    ? 'recovery-phrase-show-button'
    : 'recovery-phrase-hide-button';

  return (
    <>
      <SheetHeader title={title} testID="recovery-phrase-sheet-header" />
      <Sheet.Scroll
        testID={testID}
        contentContainerStyle={styles.contentContainer}>
        <Column style={styles.content}>
          <Button.Secondary
            preIconName={isBlurred ? 'View' : 'ViewOff'}
            label={showPassphraseLabel}
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
              testID="recovery-phrase-words"
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
          label: doneButtonLabel,
          onPress: onDone,
          testID: doneButtonTestID,
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
    content: {
      paddingHorizontal: spacing.S,
      gap: spacing.M,
    },
    loader: {
      marginVertical: 0,
      marginHorizontal: 'auto',
    },
  });
