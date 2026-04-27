import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';

import { radius, spacing } from '../../../design-tokens';
import { Text, Button, Toggle, BlurView } from '../../atoms';
import { NavigationHeader } from '../../molecules';

import { OnboardingLayout } from './OnboardingLayout';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms/icons/Icon';

export interface AccountOption {
  id: string;
  name: string;
  icon: IconName;
  enabled: boolean;
  isLoading?: boolean;
}

interface OnboardingCreateWalletProps {
  title: string;
  subtitle: string;
  accounts: AccountOption[];
  onAccountToggle: (accountId: string, value: boolean) => void;
  onFinishSetup: () => void;
  onBackPress: () => void;
  finishButtonLabel: string;
  theme: Theme;
  isFinishDisabled?: boolean;
  isFinishLoading?: boolean;
  isAccountSelectionDisabled?: boolean;
}

export const OnboardingCreateWallet = ({
  title,
  subtitle,
  accounts,
  onAccountToggle,
  onFinishSetup,
  onBackPress,
  finishButtonLabel,
  theme,
  isFinishDisabled = false,
  isFinishLoading = false,
  isAccountSelectionDisabled = false,
}: OnboardingCreateWalletProps) => {
  const styles = createStyles(theme);

  return (
    <OnboardingLayout>
      <NavigationHeader title={title} onBackPress={onBackPress} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {/* Subtitle on top of the screen */}
        <View style={styles.subtitleContainer}>
          <Text.M variant="primary" testID="onboarding-create-wallet-subtitle">
            {subtitle}
          </Text.M>
        </View>

        {/* Account options */}
        <View style={styles.accountsContainer}>
          {accounts.map((account: AccountOption) => (
            <BlurView key={account.id} style={styles.accountOption}>
              <Toggle
                value={account.enabled}
                isLoading={account.isLoading}
                disabled={isAccountSelectionDisabled}
                reverse={true}
                label={account.name}
                preIcon={account.icon}
                onValueChange={(value: boolean) => {
                  onAccountToggle(account.id, value);
                }}
                testID={`onboarding-create-wallet-toggle-${account.id}`}
              />
            </BlurView>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button.Primary
            label={finishButtonLabel}
            onPress={onFinishSetup}
            disabled={isFinishDisabled}
            loading={isFinishLoading}
            testID="onboarding-create-wallet-finish-button"
          />
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: spacing.M,
      justifyContent: 'space-between',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: spacing.XL,
      paddingBottom: spacing.M,
    },
    subtitleContainer: {
      alignItems: 'center',
      marginBottom: spacing.L,
      paddingHorizontal: spacing.L,
    },
    accountsContainer: {
      gap: spacing.M,
      paddingHorizontal: spacing.S,
    },
    accountOption: {
      overflow: 'hidden',
      borderRadius: radius.S,
      padding: spacing.L,
      borderWidth: 1,
      borderColor: theme.border.top,
    },
    buttonContainer: {
      marginTop: spacing.XL,
    },
  });
