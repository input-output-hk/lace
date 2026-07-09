import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Button, Loader, Column, Text } from '../../../atoms';
import { RecoveryPhrase } from '../../../molecules';
import { Sheet, footerHeight } from '../../../organisms';

import type { ByteArray } from '@lace-sdk/util';

interface RecoveryPhraseSheetTemplateProps {
  mnemonicWords: ByteArray[] | null;
  isBlurred: boolean;
  showPassphraseLabel: string;
  hidePassphraseLabel?: string;
  onToggleBlur: () => void;
  testID?: string;
  showHideButtonTestID?: string;
  description?: string;
}

export const RecoveryPhraseSheetTemplate = ({
  mnemonicWords,
  isBlurred,
  showPassphraseLabel,
  onToggleBlur,
  testID = 'recovery-phrase-sheet',
  showHideButtonTestID,
  description,
  hidePassphraseLabel,
}: RecoveryPhraseSheetTemplateProps) => {
  const { theme } = useTheme();
  const showHideButtonLabel = isBlurred
    ? showPassphraseLabel
    : hidePassphraseLabel ?? showPassphraseLabel;
  const defaultShowHideButtonTestID = isBlurred
    ? 'recovery-phrase-show-button'
    : 'recovery-phrase-hide-button';

  return (
    <Sheet.Scroll testID={testID}>
      <Column style={styles.content}>
        {!!description && <Text.S align="center">{description}</Text.S>}
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
            testID="recovery-phrase-words"
          />
        )}
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.S,
    gap: spacing.M,
    paddingBottom: footerHeight.horizontal,
  },
  loader: {
    marginVertical: 0,
    marginHorizontal: 'auto',
  },
});
