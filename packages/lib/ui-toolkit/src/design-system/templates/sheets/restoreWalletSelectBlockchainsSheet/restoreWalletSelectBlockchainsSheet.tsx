import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Avatar, Button, Text, Toggle } from '../../../atoms';
import { SheetHeader } from '../../../molecules';
import { Sheet } from '../../../organisms';
import { MIN_SHEET_CONTENT_HEIGHT } from '../../../util';

import type { IconName } from '../../../atoms';

export type RestoreWalletSelectBlockchainsOption = {
  id: string;
  label: string;
  icon: IconName;
  selected: boolean;
  disabled?: boolean;
  onToggle: (selected: boolean) => void;
  testID?: string;
};

export type RestoreWalletSelectBlockchainsSheetTemplateProps = {
  title: string;
  subtitle: string;
  walletName: string;
  walletInitials: string;
  options: RestoreWalletSelectBlockchainsOption[];
  confirmLabel: string;
  onConfirm: () => void;
  onBack: () => void;
  isConfirmDisabled?: boolean;
  isLoading?: boolean;
  testID?: string;
  confirmTestID?: string;
};

export const RestoreWalletSelectBlockchainsSheetTemplate = ({
  title,
  subtitle,
  walletName,
  walletInitials,
  options,
  confirmLabel,
  onConfirm,
  onBack,
  isConfirmDisabled = false,
  isLoading = false,
  testID = 'restore-wallet-select-blockchains-sheet',
  confirmTestID = 'restore-wallet-select-blockchains-confirm',
}: RestoreWalletSelectBlockchainsSheetTemplateProps) => {
  return (
    <>
      <Sheet.Scroll testID={testID} contentContainerStyle={styles.content}>
        <SheetHeader
          title={title}
          leftIconOnPress={onBack}
          testID={`${testID}-header`}
        />
        <View style={styles.body}>
          <View style={styles.summary}>
            <Avatar
              size={56}
              shape="rounded"
              content={{ fallback: walletInitials }}
              testID={`${testID}-avatar`}
            />
            <Text.M style={styles.walletName} testID={`${testID}-wallet-name`}>
              {walletName}
            </Text.M>
            <Text.XS style={styles.subtitle} testID={`${testID}-subtitle`}>
              {subtitle}
            </Text.XS>
          </View>
          <View style={styles.options}>
            {options.map(option => (
              <Toggle
                key={option.id}
                value={option.selected}
                onValueChange={option.onToggle}
                disabled={option.disabled}
                reverse
                label={option.label}
                preIcon={option.icon}
                toggleStyle={styles.option}
                testID={option.testID}
              />
            ))}
          </View>
        </View>
      </Sheet.Scroll>
      <View style={styles.footer}>
        <Button.Primary
          label={confirmLabel}
          onPress={onConfirm}
          disabled={isConfirmDisabled}
          loading={isLoading}
          testID={confirmTestID}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: MIN_SHEET_CONTENT_HEIGHT - spacing.XL,
    gap: spacing.L,
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.XL,
  },
  summary: {
    alignItems: 'center',
    gap: spacing.S,
  },
  walletName: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  options: {
    gap: spacing.S,
  },
  option: {
    width: '100%',
    paddingHorizontal: spacing.M,
    paddingVertical: spacing.S,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingBottom: spacing.L,
    paddingTop: spacing.M,
  },
});

export default RestoreWalletSelectBlockchainsSheetTemplate;
