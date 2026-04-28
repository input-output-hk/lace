import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Button, Text } from '../../atoms';
import { NavigationHeader } from '../../molecules';
import { DropdownMenu } from '../../molecules/dropdownMenu/dropdownMenu';

import { OnboardingLayout } from './OnboardingLayout';

import type { DropdownMenuItem } from '../../molecules/dropdownMenu/dropdownMenu';

const ACCOUNT_INDEX_OPTIONS: DropdownMenuItem[] = Array.from(
  { length: 50 },
  (_, index) => ({
    id: String(index),
    text: `Account #${index}`,
  }),
);

export interface DerivationTypeOption {
  value: string;
  label: string;
  description: string;
}

export interface OnboardingHardwareWalletSetupProps {
  title: string;
  onBackPress: () => void;
  accountIndex: number;
  onAccountIndexChange: (index: number) => void;
  accountLabel: string;
  derivationTypeOptions?: DerivationTypeOption[];
  derivationType?: string;
  onDerivationTypeChange?: (type: string) => void;
  derivationTypeLabel?: string;
  onCreateWallet: () => void;
  createButtonLabel: string;
  isLoading?: boolean;
  error?: string | null;
}

export const OnboardingHardwareWalletSetup = ({
  title,
  onBackPress,
  accountIndex,
  onAccountIndexChange,
  accountLabel,
  derivationTypeOptions,
  derivationType,
  onDerivationTypeChange,
  derivationTypeLabel,
  onCreateWallet,
  createButtonLabel,
  isLoading = false,
  error,
}: OnboardingHardwareWalletSetupProps) => {
  const selectedDerivationOption = derivationTypeOptions?.find(
    o => o.value === derivationType,
  );

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <NavigationHeader title={title} onBackPress={onBackPress} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.fieldGroup}>
            <Text.S variant="primary" style={styles.label}>
              {accountLabel}
            </Text.S>
            <DropdownMenu
              items={ACCOUNT_INDEX_OPTIONS}
              title={`Account #${accountIndex}`}
              selectedItemId={String(accountIndex)}
              onSelectItem={index => {
                onAccountIndexChange(index);
              }}
              maxVisibleItems={5}
              testID="hardware-setup-account-index"
            />
          </View>

          {derivationTypeOptions &&
            derivationType &&
            onDerivationTypeChange &&
            derivationTypeLabel && (
              <View style={styles.fieldGroup}>
                <Text.S variant="primary" style={styles.label}>
                  {derivationTypeLabel}
                </Text.S>
                <DropdownMenu
                  items={derivationTypeOptions.map(o => ({
                    id: o.value,
                    text: o.label,
                  }))}
                  title={selectedDerivationOption?.label ?? derivationType}
                  selectedItemId={derivationType}
                  onSelectItem={index => {
                    const selected = derivationTypeOptions[index];
                    if (selected) onDerivationTypeChange(selected.value);
                  }}
                  maxVisibleItems={4}
                  testID="hardware-setup-derivation-type"
                />
                <View style={styles.tooltipContainer}>
                  {derivationTypeOptions.map(o => (
                    <Text.XS
                      key={o.value}
                      variant="secondary"
                      style={styles.tooltipLine}>
                      {o.label}: {o.description}
                    </Text.XS>
                  ))}
                </View>
              </View>
            )}

          {error && (
            <View style={styles.errorContainer}>
              <Text.S variant="secondary">{error}</Text.S>
            </View>
          )}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Button.Primary
            label={createButtonLabel}
            onPress={onCreateWallet}
            disabled={isLoading}
            loading={isLoading}
            testID="hardware-setup-create-button"
          />
        </View>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.L,
    paddingTop: spacing.L,
  },
  fieldGroup: {
    marginBottom: spacing.XL,
  },
  label: {
    marginBottom: spacing.S,
  },
  tooltipContainer: {
    marginTop: spacing.S,
    gap: spacing.XS,
  },
  tooltipLine: {
    lineHeight: 18,
  },
  errorContainer: {
    marginBottom: spacing.M,
  },
  buttonContainer: {
    paddingHorizontal: spacing.L,
    paddingBottom: spacing.L,
  },
});
