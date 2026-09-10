import { ByteArray } from '@lace-lib/util';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Button, Text } from '../../atoms';
import { NavigationHeader, RecoveryPhrase } from '../../molecules';

import { OnboardingLayout } from './OnboardingLayout';

interface OnboardingRecoveryPhraseDisplayProps {
  title: string;
  instructionText: string;
  words: string[];
  isBlurred: boolean;
  showPassphraseLabel: string;
  hidePassphraseLabel: string;
  onToggleBlur: () => void;
  continueButtonLabel: string;
  onContinue: () => void;
  onBackPress: () => void;
}

/**
 * Onboarding step that shows the freshly generated recovery phrase so the user
 * can write it down (presentation only — the phrase is staged in memory by the
 * caller, never persisted here). Continues straight to auth setup; verification
 * is handled later in settings.
 */
export const OnboardingRecoveryPhraseDisplay = ({
  title,
  instructionText,
  words,
  isBlurred,
  showPassphraseLabel,
  hidePassphraseLabel,
  onToggleBlur,
  continueButtonLabel,
  onContinue,
  onBackPress,
}: OnboardingRecoveryPhraseDisplayProps) => {
  const styles = createStyles();
  const byteWords = React.useMemo(() => words.map(ByteArray.fromUTF8), [words]);

  return (
    <OnboardingLayout>
      <NavigationHeader title={title} onBackPress={onBackPress} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text.XS
            variant="primary"
            align="center"
            style={styles.instructionText}
            testID="onboarding-recovery-phrase-display-subtitle">
            {instructionText}
          </Text.XS>

          <Button.Secondary
            preIconName={isBlurred ? 'View' : 'ViewOff'}
            label={isBlurred ? showPassphraseLabel : hidePassphraseLabel}
            onPress={onToggleBlur}
            testID="onboarding-recovery-phrase-toggle-button"
          />

          <RecoveryPhrase
            words={byteWords}
            isBlurred={isBlurred}
            testID="onboarding-recovery-phrase-words"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button.Primary
            label={continueButtonLabel}
            onPress={onContinue}
            testID="onboarding-recovery-phrase-continue-button"
          />
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
};

const createStyles = () =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: spacing.M,
      justifyContent: 'space-between',
    },
    content: {
      gap: spacing.M,
      paddingHorizontal: spacing.S,
    },
    instructionText: {
      paddingHorizontal: spacing.M,
    },
    buttonContainer: {
      marginTop: spacing.XL,
    },
  });
