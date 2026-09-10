import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../design-tokens';
import { BlurView, Button, Text } from '../../atoms';
import { NavigationHeader } from '../../molecules';

import { OnboardingLayout } from './OnboardingLayout';

import type { Theme } from '../../../design-tokens';

interface AnalyticsConsentProps {
  theme: Theme;
  title: string;
  subtitle: string;
  points: string[];
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const AnalyticsConsent = ({
  theme,
  title,
  subtitle,
  points,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: AnalyticsConsentProps) => {
  const styles = createStyles(theme);

  return (
    <OnboardingLayout>
      <NavigationHeader title={title} testID="analytics-consent-header" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.subtitleContainer}>
            <Text.M align="center" testID="analytics-consent-subtitle">
              {subtitle}
            </Text.M>
          </View>

          <View style={styles.pointsContainer}>
            {points.map(point => (
              <BlurView key={point} style={styles.point}>
                <Text.M>{point}</Text.M>
              </BlurView>
            ))}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button.Primary
            fullWidth
            label={acceptLabel}
            onPress={onAccept}
            testID="analytics-consent-accept-button"
          />
          <Button.Tertiary
            fullWidth
            label={declineLabel}
            onPress={onDecline}
            testID="analytics-consent-decline-button"
          />
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    buttonContainer: {
      gap: spacing.S,
      marginTop: spacing.XL,
    },
    content: {
      gap: spacing.M,
    },
    point: {
      backgroundColor: theme.background.primary,
      borderColor: theme.border.top,
      borderRadius: radius.S,
      borderWidth: 1,
      overflow: 'hidden',
      padding: spacing.L,
    },
    pointsContainer: {
      gap: spacing.M,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'space-between',
      padding: spacing.M,
    },
    scrollView: {
      flex: 1,
    },
    subtitleContainer: {
      alignItems: 'center',
      marginBottom: spacing.S,
      paddingHorizontal: spacing.L,
    },
  });
