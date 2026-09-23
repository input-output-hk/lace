import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  CustomTextInput,
  RadioGroup,
  spacing,
  Tabs,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import type {
  CnightTargetMode,
  CnightWalletTarget,
} from './useCnightDesignationSheet';
import type { RadioGroupOption, TabItem } from '@lace-lib/ui-toolkit';

interface CnightDesignationFormProps {
  isDesignated: boolean;
  currentTargetHex: string | undefined;
  currentWalletTargetId: string | undefined;
  targetMode: CnightTargetMode;
  onTargetModeChange: (mode: CnightTargetMode) => void;
  walletTargets: CnightWalletTarget[];
  isWalletTargetAvailable: boolean;
  selectedTargetId: string | undefined;
  onSelectedTargetIdChange: (id: string) => void;
  externalAddress: string;
  onExternalAddressChange: (value: string) => void;
  externalTargetStatus: 'empty' | 'invalid' | 'network-mismatch' | 'valid';
  isSameAsCurrentTarget: boolean;
  isUpdateBlocked: boolean;
  // Locks the target value inputs (recipient radio + address field) while the tx
  // builds — the sheet keeps the form on screen with the footer button spinning.
  // The wallet/external tab stays switchable: the shared Tabs disabled style
  // hides its labels, and a mid-build mode switch is harmless (it can't resubmit
  // and Review shows the frozen snapshot regardless).
  isLocked: boolean;
}

export const CnightDesignationForm = ({
  isDesignated,
  currentTargetHex,
  currentWalletTargetId,
  targetMode,
  onTargetModeChange,
  walletTargets,
  isWalletTargetAvailable,
  selectedTargetId,
  onSelectedTargetIdChange,
  externalAddress,
  onExternalAddressChange,
  externalTargetStatus,
  isSameAsCurrentTarget,
  isUpdateBlocked,
  isLocked,
}: CnightDesignationFormProps) => {
  const { t } = useTranslation();
  const styles = useStyles();

  const targetTabs = useMemo<TabItem<CnightTargetMode>[]>(
    () => [
      {
        label: t('v2.cnight-designation.form.target.wallet'),
        value: 'wallet',
        testID: 'cnight-target-tab-wallet',
      },
      {
        label: t('v2.cnight-designation.form.target.external'),
        value: 'external',
        testID: 'cnight-target-tab-external',
      },
    ],
    [t],
  );

  const walletOptions = useMemo<RadioGroupOption[]>(
    () =>
      walletTargets.map(target => ({
        value: target.accountId,
        label: target.accountName,
        preIcon: 'Midnight',
        isDisabled: isLocked,
        description:
          target.accountId === currentWalletTargetId
            ? t('v2.cnight-designation.manage.current-recipient')
            : undefined,
      })),
    [walletTargets, isLocked, currentWalletTargetId, t],
  );

  const externalError =
    externalTargetStatus === 'invalid'
      ? t('v2.cnight-designation.form.external.error.invalid')
      : externalTargetStatus === 'network-mismatch'
      ? t('v2.cnight-designation.form.external.error.network')
      : undefined;

  const targetPicker = (
    <>
      {/* Offer the wallet/external choice only when a self (Midnight) target
          exists; with none, the sheet is external-only rather than a dead tab. */}
      {isWalletTargetAvailable && (
        <Tabs
          tabs={targetTabs}
          value={targetMode}
          onChange={onTargetModeChange}
        />
      )}
      {targetMode === 'wallet' ? (
        <Column gap={spacing.M}>
          <Text.S style={styles.label}>
            {t('v2.cnight-designation.form.target.wallet.label')}
          </Text.S>
          <RadioGroup
            direction="column"
            options={walletOptions}
            value={selectedTargetId ?? ''}
            onChange={onSelectedTargetIdChange}
            testID="cnight-target-wallet-options"
          />
        </Column>
      ) : (
        <CustomTextInput
          value={externalAddress}
          label={t('v2.cnight-designation.form.external.label')}
          animatedLabel
          onChangeText={onExternalAddressChange}
          inputError={externalError}
          testID="cnight-external-address-input"
          autoCapitalize="none"
          autoCorrect={false}
          readOnly={isLocked}
        />
      )}
    </>
  );

  return (
    <Column style={styles.container} gap={spacing.L}>
      {isDesignated ? (
        <>
          <Text.S style={styles.active}>
            {t('v2.cnight-designation.manage.active')}
          </Text.S>
          {currentTargetHex !== undefined && (
            <Column gap={spacing.M}>
              <Text.S style={styles.label}>
                {t('v2.cnight-designation.manage.current-target')}
              </Text.S>
              {/* Full value (wraps) — the target is the user's routing choice,
                  so it must be readable/verifiable, not truncated. */}
              <Text.S testID="cnight-current-target">{currentTargetHex}</Text.S>
            </Column>
          )}
          {targetPicker}
          {/* Only when isUpdateBlocked isn't already explaining the disabled
              CTA — that reason takes precedence. */}
          {isSameAsCurrentTarget && !isUpdateBlocked && (
            <Text.S style={styles.label} testID="cnight-same-target-hint">
              {t('v2.cnight-designation.update.same-target')}
            </Text.S>
          )}
          {/* Change-target withdraws from the script reward account; when that
              isn't registered on-chain the footer CTA is disabled — explain why
              and point to Stop, which doesn't withdraw. */}
          {isUpdateBlocked && (
            <Text.S style={styles.label} testID="cnight-update-unavailable">
              {t('v2.cnight-designation.update.unavailable')}
            </Text.S>
          )}
        </>
      ) : (
        <>
          <Text.S style={styles.description}>
            {t('v2.cnight-designation.form.description')}
          </Text.S>
          {targetPicker}
        </>
      )}
    </Column>
  );
};

const useStyles = () => {
  const { theme } = useTheme();

  return StyleSheet.create({
    container: {
      paddingHorizontal: spacing.M,
    },
    description: {
      color: theme.text.secondary,
    },
    label: {
      color: theme.text.secondary,
    },
    active: {
      color: theme.data.positive,
    },
  });
};
