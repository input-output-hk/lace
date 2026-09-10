import React, { useCallback, useMemo } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { spacing } from '../../../design-tokens';
import { Button, Text } from '../../atoms';
import { NavigationHeader } from '../../molecules';
import { DropdownMenu } from '../../molecules/dropdownMenu/dropdownMenu';
import { footerHeight, Sheet } from '../../organisms';

import { OnboardingLayout } from './OnboardingLayout';

import type { DropdownMenuItem } from '../../molecules/dropdownMenu/dropdownMenu';

/**
 * App-wide ceiling for uncapped devices. Mirrors MAX_ACCOUNT_INDEX in
 * @lace-module/account-management (addAccountHelpers.ts) - kept separate
 * because modules own business rules and ui-toolkit is presentation-only.
 * Change both together.
 */
const DEFAULT_MAX_ACCOUNT_INDEX = 49;

const buildAccountIndexOptions = (
  maxAccountIndex: number,
): DropdownMenuItem[] =>
  Array.from({ length: maxAccountIndex + 1 }, (_, index) => ({
    id: String(index),
    text: `Account #${index}`,
  }));

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
  /**
   * Highest selectable account index (inclusive). Set when the device
   * firmware caps derivation (e.g. Keystone Cardano: 24); defaults to 49.
   */
  maxAccountIndex?: number;
  /**
   * Chains the connected device can hold this wallet's FIRST account on. Pass
   * with `blockchain`/`onBlockchainChange`/`blockchainLabel` to show the picker;
   * omit all four and the section is not rendered, so a consumer that never
   * passes them sees ZERO change (same contract as the derivation group below).
   *
   * SINGLE select, unlike the software create screen's multi-select toggles: a
   * device runs one app at a time, so one flow can only found one chain.
   */
  blockchainOptions?: string[];
  blockchain?: string;
  onBlockchainChange?: (blockchain: string) => void;
  blockchainLabel?: string;
  derivationTypeOptions?: DerivationTypeOption[];
  derivationType?: string;
  onDerivationTypeChange?: (type: string) => void;
  derivationTypeLabel?: string;
  onCreateWallet: () => void;
  createButtonLabel: string;
  isLoading?: boolean;
  error?: string | null;
  /**
   * Optional guidance shown WHILE the device round-trip is in flight (T125,
   * F002/F3 — e.g. "unlock your device / open the Cardano app"), distinct
   * from `error` (shown only after a settled failure) — the two never
   * overlap in practice (callers clear their error state before setting
   * `isLoading`), but are independent props so a consumer that never passes
   * this sees ZERO behavior change.
   */
  loadingHint?: string;
  // Use the sheet layout (SheetHeader + scroll + anchored SheetFooter) instead
  // of the full-screen OnboardingLayout. Set when hosting inside a sheet.
  embedded?: boolean;
  // Hide the account-index/derivation fields. Air-gapped Bitcoin reads the
  // account index from the device export, so it shows instructions instead.
  showAccountSetup?: boolean;
  instructionText?: string;
  /**
   * Informational note shown above the fields (e.g. Trezor Safe 7 and newer
   * require the Trezor Suite desktop app). Not an error: setup can proceed.
   */
  notice?: string;
  noticeLinkLabel?: string;
  /** Opened via the platform URL handler when the notice link is pressed. */
  noticeLinkUrl?: string;
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
  maxAccountIndex,
  blockchainOptions,
  blockchain,
  onBlockchainChange,
  blockchainLabel,
  derivationTypeOptions,
  derivationType,
  onDerivationTypeChange,
  derivationTypeLabel,
  onCreateWallet,
  createButtonLabel,
  isLoading = false,
  error,
  loadingHint,
  showAccountSetup = true,
  instructionText,
  notice,
  noticeLinkLabel,
  noticeLinkUrl,
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
            maxAccountIndex={maxAccountIndex}
            blockchainOptions={blockchainOptions}
            blockchain={blockchain}
            onBlockchainChange={onBlockchainChange}
            blockchainLabel={blockchainLabel}
            derivationTypeOptions={derivationTypeOptions}
            derivationType={derivationType}
            onDerivationTypeChange={onDerivationTypeChange}
            derivationTypeLabel={derivationTypeLabel}
            selectedDerivationOption={selectedDerivationOption}
            error={error}
            loadingHint={loadingHint}
            showAccountSetup={showAccountSetup}
            instructionText={instructionText}
            notice={notice}
            noticeLinkLabel={noticeLinkLabel}
            noticeLinkUrl={noticeLinkUrl}
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
  maxAccountIndex,
  blockchainOptions,
  blockchain,
  onBlockchainChange,
  blockchainLabel,
  derivationTypeOptions,
  derivationType,
  onDerivationTypeChange,
  derivationTypeLabel,
  error,
  loadingHint,
  showAccountSetup = true,
  instructionText,
  notice,
  noticeLinkLabel,
  noticeLinkUrl,
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
        maxAccountIndex={maxAccountIndex}
        blockchainOptions={blockchainOptions}
        blockchain={blockchain}
        onBlockchainChange={onBlockchainChange}
        blockchainLabel={blockchainLabel}
        derivationTypeOptions={derivationTypeOptions}
        derivationType={derivationType}
        onDerivationTypeChange={onDerivationTypeChange}
        derivationTypeLabel={derivationTypeLabel}
        selectedDerivationOption={selectedDerivationOption}
        error={error}
        loadingHint={loadingHint}
        showAccountSetup={showAccountSetup}
        instructionText={instructionText}
        notice={notice}
        noticeLinkLabel={noticeLinkLabel}
        noticeLinkUrl={noticeLinkUrl}
      />
    </Sheet.Scroll>
  );
};

interface FieldGroupsProps {
  accountIndex: number;
  onAccountIndexChange: (index: number) => void;
  accountLabel: string;
  maxAccountIndex?: number;
  blockchainOptions?: string[];
  blockchain?: string;
  onBlockchainChange?: (blockchain: string) => void;
  blockchainLabel?: string;
  derivationTypeOptions?: DerivationTypeOption[];
  derivationType?: string;
  onDerivationTypeChange?: (type: string) => void;
  derivationTypeLabel?: string;
  selectedDerivationOption?: DerivationTypeOption;
  error?: string | null;
  loadingHint?: string;
  showAccountSetup?: boolean;
  instructionText?: string;
  notice?: string;
  noticeLinkLabel?: string;
  noticeLinkUrl?: string;
}

const FieldGroups = ({
  accountIndex,
  onAccountIndexChange,
  accountLabel,
  maxAccountIndex = DEFAULT_MAX_ACCOUNT_INDEX,
  blockchainOptions,
  blockchain,
  onBlockchainChange,
  blockchainLabel,
  derivationTypeOptions,
  derivationType,
  onDerivationTypeChange,
  derivationTypeLabel,
  selectedDerivationOption,
  error,
  loadingHint,
  showAccountSetup = true,
  instructionText,
  notice,
  noticeLinkLabel,
  noticeLinkUrl,
}: FieldGroupsProps) => {
  const accountIndexOptions = useMemo(
    () => buildAccountIndexOptions(maxAccountIndex),
    [maxAccountIndex],
  );

  const handleNoticeLinkPress = useCallback(() => {
    if (noticeLinkUrl) void Linking.openURL(noticeLinkUrl);
  }, [noticeLinkUrl]);

  return (
    <>
      {notice && (
        <View style={fieldStyles.fieldGroup} testID="hardware-setup-notice">
          <Text.S variant="secondary">{notice}</Text.S>
          {noticeLinkLabel && noticeLinkUrl && (
            <TouchableOpacity
              onPress={handleNoticeLinkPress}
              testID="hardware-setup-notice-link">
              <Text.S variant="primary" style={fieldStyles.noticeLink}>
                {noticeLinkLabel}
              </Text.S>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!showAccountSetup && instructionText && (
        <View style={fieldStyles.fieldGroup}>
          <Text.S variant="primary" testID="hardware-setup-instructions">
            {instructionText}
          </Text.S>
        </View>
      )}

      {showAccountSetup && blockchainOptions && blockchain && (
        <View style={fieldStyles.fieldGroup}>
          <Text.S variant="primary" style={fieldStyles.label}>
            {blockchainLabel}
          </Text.S>
          <DropdownMenu
            items={blockchainOptions.map(option => ({
              id: option,
              text: option,
            }))}
            title={blockchain}
            selectedItemId={blockchain}
            onSelectItem={position => {
              // `onSelectItem` reports the POSITION in `items`, so it is mapped
              // back through the same array (unlike the account-index dropdown
              // below, where position and value coincide).
              const selected = blockchainOptions[position];
              if (selected) onBlockchainChange?.(selected);
            }}
            maxVisibleItems={5}
            testID="hardware-setup-blockchain"
          />
        </View>
      )}

      {showAccountSetup && (
        <View style={fieldStyles.fieldGroup}>
          <Text.S variant="primary" style={fieldStyles.label}>
            {accountLabel}
          </Text.S>
          <DropdownMenu
            items={accountIndexOptions}
            title={`Account #${accountIndex}`}
            selectedItemId={String(accountIndex)}
            onSelectItem={index => {
              onAccountIndexChange(index);
            }}
            maxVisibleItems={5}
            testID="hardware-setup-account-index"
          />
        </View>
      )}

      {showAccountSetup &&
        derivationTypeOptions &&
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

      {loadingHint && (
        <View
          style={fieldStyles.errorContainer}
          testID="hardware-setup-loading-hint">
          <Text.S variant="secondary">{loadingHint}</Text.S>
        </View>
      )}

      {error && (
        <View style={fieldStyles.errorContainer}>
          <Text.S variant="secondary">{error}</Text.S>
        </View>
      )}
    </>
  );
};

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
  noticeLink: {
    marginTop: spacing.XS,
    textDecorationLine: 'underline',
  },
});
