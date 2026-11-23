import { useTranslation, type TranslationKey } from '@lace-contract/i18n';
import { isSameProofServerMode } from '@lace-contract/midnight-context';
import { NavigationControls, StackRoutes } from '@lace-lib/navigation';
import {
  Button,
  Column,
  RadioButton,
  Row,
  Sheet,
  spacing,
  Text,
  Toggle,
  useTheme,
  WarningAlert,
} from '@lace-lib/ui-toolkit';
import { useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';

import { useFilteredDustSyncConsent } from '../../hooks/useFilteredDustSyncConsent';
import { useMidnightSettings } from '../../hooks/useMidnightSettings';
import { useProofServerConfirmation } from '../../hooks/useProofServerConfirmation';

import type {
  ProofServerSection,
  ProofServerTier,
} from '../../hooks/useMidnightSettings';
import type { ProofServerMode } from '@lace-contract/midnight-context';

const tierHeaderKey: Record<ProofServerTier, TranslationKey> = {
  custom: 'midnight.proof-server.section.custom',
  'on-device': 'midnight.proof-server.section.on-device',
  paired: 'midnight.proof-server.section.paired',
  delegated: 'midnight.proof-server.section.delegated',
};

const labelKeyForMode = (mode: ProofServerMode): TranslationKey | undefined => {
  switch (mode.kind) {
    case 'in-process':
      return 'midnight.proof-server.in-process.label';
    case 'local-host':
      return 'midnight.proof-server.local-host.label';
    case 'paired-device':
      return undefined;
    case 'delegated':
    case 'tee-delegated':
      return undefined;
  }
};

const descriptionKeyForMode = (
  mode: ProofServerMode,
): TranslationKey | undefined => {
  switch (mode.kind) {
    case 'in-process':
      return 'midnight.proof-server.in-process.description';
    case 'local-host':
      return 'midnight.proof-server.local-host.description';
    case 'paired-device':
      return 'midnight.proof-server.paired-device.description';
    case 'delegated':
      return mode.descriptionKey as TranslationKey | undefined;
    case 'tee-delegated':
      return (mode.descriptionKey ??
        'midnight.proof-server.tee-delegated.description') as TranslationKey;
  }
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const testIdForMode = (mode: ProofServerMode): string => {
  switch (mode.kind) {
    case 'in-process':
      return 'in-process';
    case 'local-host':
      return 'local-host';
    case 'paired-device':
      return `paired-${slugify(mode.pairingId)}`;
    case 'delegated':
      return `delegated-${slugify(mode.label) || slugify(mode.url)}`;
    case 'tee-delegated':
      return `tee-delegated-${slugify(mode.label) || slugify(mode.url)}`;
  }
};

const endpointForDisplay = (mode: ProofServerMode): string | undefined => {
  switch (mode.kind) {
    case 'in-process':
      return undefined;
    case 'local-host':
    case 'paired-device':
    case 'delegated':
    case 'tee-delegated':
      return mode.url;
  }
};

export const MidnightSettingsSheet = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const styles = useStyles();

  const {
    networkId,
    networksConfig,
    isSaving,
    isOpen,
    dustResetConfirmation,
    hasSaveFailed,
    unreadableSnapshotAccountId,
    unreadableSnapshotWallet,
    unreadableSnapshotAccount,
    confirmDustReset,
    cancelDustReset,
    openSettings,
    closeSettings,
    save,
    getProofServerSections,
  } = useMidnightSettings();

  const sections = useMemo(
    () => getProofServerSections(networkId),
    [getProofServerSections, networkId],
  );

  const [selectedProofServer, setSelectedProofServer] =
    useState<ProofServerMode>(networksConfig[networkId].proofServer);

  const [consentedFilteredDustIndexerUrl, setConsentedFilteredDustIndexerUrl] =
    useState(networksConfig[networkId].filteredDustSyncIndexer);
  const isFilteredSyncRolloutEnabled =
    !!networksConfig[networkId].isFilteredDustSyncRolloutEnabled;
  const isFilteredSyncSelected =
    consentedFilteredDustIndexerUrl ===
    networksConfig[networkId].indexerAddress;
  const changeFilteredSync = useCallback(
    (enabled: boolean) => {
      setConsentedFilteredDustIndexerUrl(
        enabled && isFilteredSyncRolloutEnabled
          ? networksConfig[networkId].indexerAddress
          : undefined,
      );
    },
    [isFilteredSyncRolloutEnabled, networksConfig, networkId],
  );
  const nodeAddresses = networksConfig[networkId].nodeAddress;
  const indexerAddress = networksConfig[networkId].indexerAddress;

  // A confirmation is valid only for the network and endpoint the user reviewed.
  useEffect(() => {
    if (
      dustResetConfirmation &&
      (dustResetConfirmation.networkId !== networkId ||
        dustResetConfirmation.config.indexerAddress !== indexerAddress ||
        !isSameProofServerMode(
          dustResetConfirmation.config.proofServer,
          selectedProofServer,
        ))
    )
      cancelDustReset();
  }, [
    dustResetConfirmation,
    networkId,
    indexerAddress,
    selectedProofServer,
    cancelDustReset,
  ]);

  const hasSaveInitiated = useRef(false);
  const openUnreadableAccountOptions = useCallback(() => {
    if (!unreadableSnapshotAccount) return;
    hasSaveInitiated.current = false;
    NavigationControls.navigate(StackRoutes.AccountDetails, {
      walletId: unreadableSnapshotAccount.walletId,
      accountId: unreadableSnapshotAccount.accountId,
    });
  }, [unreadableSnapshotAccount]);

  const handleClose = useCallback(() => {
    NavigationControls.closeSheet();
  }, []);

  useEffect(() => {
    openSettings();
    return () => {
      closeSettings();
    };
  }, [openSettings, closeSettings]);

  useEffect(() => {
    if (hasSaveInitiated.current && !isOpen) {
      hasSaveInitiated.current = false;
      handleClose();
    }
  }, [isOpen, handleClose]);

  const handleSave = useCallback(() => {
    const updatedConfig = {
      ...networksConfig[networkId],
      proofServer: selectedProofServer,
      filteredDustSyncIndexer: consentedFilteredDustIndexerUrl,
    };
    hasSaveInitiated.current = true;
    save({ config: updatedConfig, networkId });
  }, [
    networksConfig,
    networkId,
    selectedProofServer,
    consentedFilteredDustIndexerUrl,
    save,
  ]);

  const hasSyncSettingChanged =
    consentedFilteredDustIndexerUrl !==
    networksConfig[networkId].filteredDustSyncIndexer;
  const availableProofServerModes = useMemo(
    () => sections.flatMap(section => section.modes),
    [sections],
  );
  const {
    isAwaitingConsent: isFilteredSyncConsentPending,
    requestSave: requestFilteredSyncConsentOrSave,
    confirm: confirmDustSync,
    cancel: cancelDustSync,
  } = useFilteredDustSyncConsent({
    networkId,
    indexerAddress,
    proofServer: selectedProofServer,
    availableProofServerModes,
    isOpen,
    isSaving,
    isRolloutEnabled: isFilteredSyncRolloutEnabled,
    isSelected: isFilteredSyncSelected,
    hasSettingChanged: hasSyncSettingChanged,
    onSave: handleSave,
  });

  // Prover consent runs first. Persist both settings only after Dust consent too.
  const {
    confirmation: proofServerConfirmation,
    requestSave,
    confirm,
    cancel,
  } = useProofServerConfirmation({
    networkId,
    mode: selectedProofServer,
    availableModes: availableProofServerModes,
    isOpen,
    isSaving,
    onSave: requestFilteredSyncConsentOrSave,
  });

  const getLabel = useCallback(
    (mode: ProofServerMode) => {
      const key = labelKeyForMode(mode);
      if (key) return t(key);
      if (mode.kind === 'delegated' || mode.kind === 'tee-delegated') {
        return mode.label;
      }
      if (mode.kind === 'paired-device') {
        return t('midnight.proof-server.paired-device.label', {
          deviceName: mode.pairingId,
        });
      }
      return '';
    },
    [t],
  );

  const getDescription = useCallback(
    (mode: ProofServerMode) => {
      const key = descriptionKeyForMode(mode);
      if (key) return t(key);
      if (mode.kind === 'delegated') {
        return t('midnight.proof-server.delegated.description-generic', {
          label: mode.label,
        });
      }
      return undefined;
    },
    [t],
  );

  // A sync preference can be saved even when only one prover is available.
  const totalModes = sections.reduce(
    (sum, section) => sum + section.modes.length,
    0,
  );

  const isSaveDisabled =
    isSaving || (totalModes <= 1 && !hasSyncSettingChanged);

  // One active step controls the title, actions and body together.
  const activeStep = dustResetConfirmation
    ? 'dust-reset'
    : isFilteredSyncConsentPending
    ? 'filtered-sync-consent'
    : proofServerConfirmation
    ? 'proof-server-consent'
    : 'settings';

  useEffect(() => {
    let title: TranslationKey = 'v2.pages.midnight-settings.title';
    let primaryLabel: TranslationKey =
      'settings.configure-midnight.drawer.saveBtnLabel';
    let onPress = requestSave;
    let secondaryButton:
      | { label: string; onPress: () => void; testID: string }
      | undefined;
    switch (activeStep) {
      case 'settings':
        break;
      case 'dust-reset':
        title = 'midnight.filtered-dust-sync.label';
        primaryLabel = 'midnight.filtered-dust-sync.reset-confirm';
        onPress = confirmDustReset;
        secondaryButton = {
          label: t('app.cancel'),
          onPress: cancelDustReset,
          testID: 'midnight-dust-reset-cancel',
        };
        break;
      case 'filtered-sync-consent':
        title = 'midnight.filtered-dust-sync.label';
        primaryLabel = 'midnight.proof-server.disclosure.confirm';
        onPress = confirmDustSync;
        secondaryButton = {
          label: t('app.cancel'),
          onPress: cancelDustSync,
          testID: 'midnight-filtered-dust-sync-cancel',
        };
        break;
      case 'proof-server-consent':
        title = proofServerConfirmation?.isCustom
          ? 'midnight.proof-server.custom.disclosure.title'
          : 'midnight.proof-server.disclosure.title';
        primaryLabel = 'midnight.proof-server.disclosure.confirm';
        onPress = confirm;
        secondaryButton = {
          label: t('app.cancel'),
          onPress: cancel,
          testID: 'proof-server-disclosure-cancel',
        };
        break;
    }
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t(title)}
          testID="midnight-settings-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={secondaryButton}
          primaryButton={{
            label: t(primaryLabel),
            onPress,
            disabled: isSaveDisabled,
            testID: 'save-configuration-button',
          }}
        />
      ),
    });
  }, [
    navigation,
    t,
    activeStep,
    proofServerConfirmation,
    confirm,
    cancel,
    requestSave,
    isSaveDisabled,
    confirmDustSync,
    cancelDustSync,
    confirmDustReset,
    cancelDustReset,
  ]);

  if (activeStep === 'dust-reset') {
    return (
      <Sheet.Scroll showsVerticalScrollIndicator={false}>
        <WarningAlert
          title={t('midnight.filtered-dust-sync.reset-title')}
          body={t('midnight.filtered-dust-sync.reset-warning')}
          testID="midnight-dust-reset-warning"
        />
      </Sheet.Scroll>
    );
  }

  if (activeStep === 'filtered-sync-consent') {
    return (
      <Sheet.Scroll showsVerticalScrollIndicator={false}>
        <Column gap={spacing.L}>
          <WarningAlert
            title={t('midnight.proof-server.disclosure.warning-title')}
            body={t('midnight.filtered-dust-sync.disclosure')}
            testID="midnight-filtered-dust-sync-disclosure"
          />
          <Column gap={spacing.S}>
            <Text.S>{t('midnight.network-config.indexer-address')}</Text.S>
            <Text.XS style={styles.secondaryText}>{indexerAddress}</Text.XS>
          </Column>
        </Column>
      </Sheet.Scroll>
    );
  }

  if (activeStep === 'proof-server-consent' && proofServerConfirmation) {
    return (
      <Sheet.Scroll showsVerticalScrollIndicator={false}>
        <Column gap={spacing.M}>
          {proofServerConfirmation.isFirstUse ? (
            <WarningAlert
              title={t('midnight.proof-server.disclosure.warning-title')}
              body={t(
                proofServerConfirmation.isCustom
                  ? 'midnight.proof-server.custom.disclosure.first-use'
                  : 'midnight.proof-server.disclosure.first-use',
                { provider: proofServerConfirmation.provider },
              )}
              testID="proof-server-disclosure-message"
            />
          ) : (
            <Text.S testID="proof-server-disclosure-message">
              {t(
                proofServerConfirmation.isCustom
                  ? 'midnight.proof-server.custom.disclosure.reminder'
                  : 'midnight.proof-server.disclosure.reminder',
                { provider: proofServerConfirmation.provider },
              )}
            </Text.S>
          )}
          <Column gap={spacing.S}>
            <Text.S>{t('midnight.proof-server.address')}</Text.S>
            <Text.XS>{endpointForDisplay(selectedProofServer)}</Text.XS>
          </Column>
        </Column>
      </Sheet.Scroll>
    );
  }

  return (
    <Sheet.Scroll showsVerticalScrollIndicator={false}>
      <Column gap={spacing.L}>
        {hasSaveFailed && (
          <Column gap={spacing.S}>
            <WarningAlert
              title={t('midnight.filtered-dust-sync.check-failed-title')}
              body={t(
                unreadableSnapshotAccountId
                  ? 'midnight.filtered-dust-sync.snapshot-unreadable'
                  : 'midnight.filtered-dust-sync.check-failed',
              )}
              testID="midnight-settings-save-error"
            />
            {unreadableSnapshotAccount && unreadableSnapshotWallet && (
              <Column gap={spacing.S}>
                <Text.S>
                  {unreadableSnapshotWallet.metadata.name} /{' '}
                  {unreadableSnapshotAccount.metadata.name}
                </Text.S>
                <Button.Secondary
                  label={t('midnight.fee-recovery.open-account-options')}
                  onPress={openUnreadableAccountOptions}
                  testID="midnight-settings-open-account-options"
                />
              </Column>
            )}
          </Column>
        )}
        <Text.S>{t('midnight.proof-server.title')}</Text.S>
        {sections.map(section => (
          <ProofServerTierSection
            key={section.tier}
            section={section}
            selected={selectedProofServer}
            isSaving={isSaving}
            onSelect={setSelectedProofServer}
            getLabel={getLabel}
            getDescription={getDescription}
            sectionHeader={t(tierHeaderKey[section.tier])}
            secondaryTextStyle={styles.secondaryText}
            optionContentStyle={styles.optionContent}
            sectionHeaderStyle={styles.sectionHeader}
            locallyGeneratedLabel={t('midnight.proof-server.locally-generated')}
          />
        ))}
        <Column gap={spacing.S}>
          <Text.S>{t('midnight.network-config.node-address')}</Text.S>
          <Row alignItems="flex-start" gap={spacing.M}>
            <RadioButton
              isChecked
              isDisabled
              onRadioValueChange={() => undefined}
              testID="midnight-node-radio"
              accessibilityLabel={`${t(
                'midnight.network-config.node-address',
              )}: ${nodeAddresses}`}
            />
            <Text.XS style={styles.optionContent}>{nodeAddresses}</Text.XS>
          </Row>
        </Column>
        <Column gap={spacing.S}>
          <Text.S>{t('midnight.network-config.indexer-address')}</Text.S>
          <Row alignItems="flex-start" gap={spacing.M}>
            <RadioButton
              isChecked
              isDisabled
              onRadioValueChange={() => undefined}
              testID="midnight-indexer-radio"
              accessibilityLabel={`${t(
                'midnight.network-config.indexer-address',
              )}: ${indexerAddress}`}
            />
            <Column gap={spacing.M} style={styles.optionContent}>
              <Text.XS>{indexerAddress}</Text.XS>
              {(isFilteredSyncRolloutEnabled ||
                networksConfig[networkId].filteredDustSyncIndexer) && (
                <Column gap={spacing.S}>
                  <Toggle
                    reverse
                    label={t('midnight.filtered-dust-sync.label')}
                    accessibilityLabel={t('midnight.filtered-dust-sync.label')}
                    value={isFilteredSyncSelected}
                    aria-checked={isFilteredSyncSelected}
                    aria-disabled={
                      isSaving ||
                      (!isFilteredSyncRolloutEnabled && !isFilteredSyncSelected)
                    }
                    onValueChange={changeFilteredSync}
                    disabled={
                      isSaving ||
                      (!isFilteredSyncRolloutEnabled && !isFilteredSyncSelected)
                    }
                    testID="midnight-filtered-dust-sync"
                  />
                  <Text.XS style={styles.secondaryText}>
                    {t('midnight.filtered-dust-sync.description')}
                  </Text.XS>
                </Column>
              )}
            </Column>
          </Row>
        </Column>
      </Column>
    </Sheet.Scroll>
  );
};

type ProofServerTierSectionProps = {
  section: ProofServerSection;
  selected: ProofServerMode;
  isSaving: boolean;
  onSelect: (mode: ProofServerMode) => void;
  getLabel: (mode: ProofServerMode) => string;
  getDescription: (mode: ProofServerMode) => string | undefined;
  sectionHeader: string;
  secondaryTextStyle: ReturnType<typeof useStyles>['secondaryText'];
  optionContentStyle: ReturnType<typeof useStyles>['optionContent'];
  sectionHeaderStyle: ReturnType<typeof useStyles>['sectionHeader'];
  locallyGeneratedLabel: string;
};

const ProofServerTierSection = ({
  section,
  selected,
  isSaving,
  onSelect,
  getLabel,
  getDescription,
  sectionHeader,
  secondaryTextStyle,
  optionContentStyle,
  sectionHeaderStyle,
  locallyGeneratedLabel,
}: ProofServerTierSectionProps) => (
  <Column gap={spacing.M}>
    <Text.S
      style={[secondaryTextStyle, sectionHeaderStyle]}
      testID={`proof-server-section-${section.tier}`}>
      {sectionHeader}
    </Text.S>
    {section.modes.map(mode => {
      const testIdSuffix = testIdForMode(mode);
      const endpoint =
        mode.kind === 'in-process'
          ? locallyGeneratedLabel
          : endpointForDisplay(mode);
      const description = getDescription(mode);
      const isSelected = isSameProofServerMode(selected, mode);
      return (
        <Row key={testIdSuffix} alignItems="flex-start" gap={spacing.M}>
          <RadioButton
            isChecked={isSelected}
            isDisabled={isSaving}
            onRadioValueChange={() => {
              onSelect(mode);
            }}
            testID={`proof-server-${testIdSuffix}-radio`}
            accessibilityLabel={
              endpoint ? `${getLabel(mode)}: ${endpoint}` : getLabel(mode)
            }
          />
          <Column gap={spacing.XS} style={optionContentStyle}>
            <Text.S testID={`proof-server-${testIdSuffix}-title`}>
              {getLabel(mode)}
            </Text.S>
            {endpoint ? (
              <Text.XS style={secondaryTextStyle}>{endpoint}</Text.XS>
            ) : null}
            {description ? (
              <Text.XS
                style={secondaryTextStyle}
                testID={`proof-server-${testIdSuffix}-description`}>
                {description}
              </Text.XS>
            ) : null}
          </Column>
        </Row>
      );
    })}
  </Column>
);

const useStyles = () => {
  const { theme } = useTheme();
  return StyleSheet.create({
    optionContent: {
      flex: 1,
    },
    sectionHeader: { paddingLeft: 28 + spacing.M },
    secondaryText: { color: theme.text.secondary },
  });
};
