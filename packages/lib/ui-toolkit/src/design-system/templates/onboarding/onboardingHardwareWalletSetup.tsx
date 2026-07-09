import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Button, Text } from '../../atoms';
import { NavigationHeader } from '../../molecules';
import { DropdownMenu } from '../../molecules/dropdownMenu/dropdownMenu';
import { footerHeight, Sheet } from '../../organisms';

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
  // Use the sheet layout (SheetHeader + scroll + anchored SheetFooter) instead
  // of the full-screen OnboardingLayout. Set when hosting inside a sheet.
  embedded?: boolean;
}

export const OnboardingHardwareWalletSetup = (
  props: OnboardingHardwareWalletSetupProps,
) => {
  if (props.embedded) return <EmbeddedHardwareWalletSetup {...props} />;
  return <FullScreenHardwareWalletSetup {...props} />;
};

const FullScreenHardwareWalletSetup = ({
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
      <View style={fullScreenStyles.container}>
        <NavigationHeader title={title} onBackPress={onBackPress} />

        <ScrollView
          style={fullScreenStyles.scrollView}
          contentContainerStyle={fullScreenStyles.scrollContent}>
          <FieldGroups
            accountIndex={accountIndex}
            onAccountIndexChange={onAccountIndexChange}
            accountLabel={accountLabel}
            derivationTypeOptions={derivationTypeOptions}
            derivationType={derivationType}
            onDerivationTypeChange={onDerivationTypeChange}
            derivationTypeLabel={derivationTypeLabel}
            selectedDerivationOption={selectedDerivationOption}
            error={error}
          />
        </ScrollView>

        <View style={fullScreenStyles.buttonContainer}>
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

const EmbeddedHardwareWalletSetup = ({
  accountIndex,
  onAccountIndexChange,
  accountLabel,
  derivationTypeOptions,
  derivationType,
  onDerivationTypeChange,
  derivationTypeLabel,
  error,
}: OnboardingHardwareWalletSetupProps) => {
  const contentContainerStyle = useMemo(
    () => [
      embeddedStyles.scrollContent,
      { paddingBottom: footerHeight.horizontal },
    ],
    [footerHeight],
  );
  const selectedDerivationOption = derivationTypeOptions?.find(
    o => o.value === derivationType,
  );

  return (
    <Sheet.Scroll
      testID="hardware-setup-sheet"
      contentContainerStyle={contentContainerStyle}>
      <FieldGroups
        accountIndex={accountIndex}
        onAccountIndexChange={onAccountIndexChange}
        accountLabel={accountLabel}
        derivationTypeOptions={derivationTypeOptions}
        derivationType={derivationType}
        onDerivationTypeChange={onDerivationTypeChange}
        derivationTypeLabel={derivationTypeLabel}
        selectedDerivationOption={selectedDerivationOption}
        error={error}
      />
    </Sheet.Scroll>
  );
};

interface FieldGroupsProps {
  accountIndex: number;
  onAccountIndexChange: (index: number) => void;
  accountLabel: string;
  derivationTypeOptions?: DerivationTypeOption[];
  derivationType?: string;
  onDerivationTypeChange?: (type: string) => void;
  derivationTypeLabel?: string;
  selectedDerivationOption?: DerivationTypeOption;
  error?: string | null;
}

const FieldGroups = ({
  accountIndex,
  onAccountIndexChange,
  accountLabel,
  derivationTypeOptions,
  derivationType,
  onDerivationTypeChange,
  derivationTypeLabel,
  selectedDerivationOption,
  error,
}: FieldGroupsProps) => (
  <>
    <View style={fieldStyles.fieldGroup}>
      <Text.S variant="primary" style={fieldStyles.label}>
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
        <View style={fieldStyles.fieldGroup}>
          <Text.S variant="primary" style={fieldStyles.label}>
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
          <View style={fieldStyles.tooltipContainer}>
            {derivationTypeOptions.map(o => (
              <Text.XS
                key={o.value}
                variant="secondary"
                style={fieldStyles.tooltipLine}>
                {o.label}: {o.description}
              </Text.XS>
            ))}
          </View>
        </View>
      )}

    {error && (
      <View style={fieldStyles.errorContainer}>
        <Text.S variant="secondary">{error}</Text.S>
      </View>
    )}
  </>
);

const fullScreenStyles = StyleSheet.create({
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
  buttonContainer: {
    paddingHorizontal: spacing.L,
    paddingBottom: spacing.L,
  },
});

const embeddedStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.L,
    paddingTop: spacing.L,
  },
});

const fieldStyles = StyleSheet.create({
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
});
