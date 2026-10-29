import { useTranslation, type TranslationKey } from '@lace-contract/i18n';
import { isSameProofServerMode } from '@lace-contract/midnight-context';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Column,
  RadioButton,
  Row,
  Sheet,
  spacing,
  Text,
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
    openSettings,
    save,
    getProofServerSections,
  } = useMidnightSettings();

  const sections = useMemo(
    () => getProofServerSections(networkId),
    [getProofServerSections, networkId],
  );

  const [selectedProofServer, setSelectedProofServer] =
    useState<ProofServerMode>(networksConfig[networkId].proofServer);

  const nodeAddresses = networksConfig[networkId].nodeAddress;
  const indexerAddress = networksConfig[networkId].indexerAddress;

  const hasSaveInitiated = useRef(false);

  const handleClose = useCallback(() => {
    NavigationControls.closeSheet();
  }, []);

  useEffect(() => {
    openSettings();
  }, [openSettings]);

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
    };
    hasSaveInitiated.current = true;
    save({ config: updatedConfig, networkId });
  }, [networksConfig, networkId, selectedProofServer, save]);

  const { confirmation, requestSave, confirm, cancel } =
    useProofServerConfirmation({
      networkId,
      mode: selectedProofServer,
      availableModes: sections.flatMap(section => section.modes),
      isOpen,
      isSaving,
      onSave: handleSave,
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

  // Saving needs at least two available modes to choose between.
  const totalModes = sections.reduce(
    (sum, section) => sum + section.modes.length,
    0,
  );
  const isSaveDisabled = isSaving || totalModes <= 1;

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t(
            confirmation
              ? confirmation.isCustom
                ? 'midnight.proof-server.custom.disclosure.title'
                : 'midnight.proof-server.disclosure.title'
              : 'v2.pages.midnight-settings.title',
          )}
          testID="midnight-settings-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={
            confirmation
              ? {
                  label: t('app.cancel'),
                  onPress: cancel,
                  testID: 'proof-server-disclosure-cancel',
                }
              : undefined
          }
          primaryButton={{
            label: t(
              confirmation
                ? 'midnight.proof-server.disclosure.confirm'
                : 'settings.configure-midnight.drawer.saveBtnLabel',
            ),
            onPress: confirmation ? confirm : requestSave,
            disabled: isSaveDisabled,
            testID: 'save-configuration-button',
          }}
        />
      ),
    });
  }, [
    navigation,
    t,
    confirmation,
    confirm,
    cancel,
    requestSave,
    isSaveDisabled,
  ]);

  if (confirmation) {
    return (
      <Sheet.Scroll showsVerticalScrollIndicator={false}>
        <Column gap={spacing.M}>
          {confirmation.isFirstUse ? (
            <WarningAlert
              title={t('midnight.proof-server.disclosure.warning-title')}
              body={t(
                confirmation.isCustom
                  ? 'midnight.proof-server.custom.disclosure.first-use'
                  : 'midnight.proof-server.disclosure.first-use',
                { provider: confirmation.provider },
              )}
              testID="proof-server-disclosure-message"
            />
          ) : (
            <Text.S testID="proof-server-disclosure-message">
              {t(
                confirmation.isCustom
                  ? 'midnight.proof-server.custom.disclosure.reminder'
                  : 'midnight.proof-server.disclosure.reminder',
                { provider: confirmation.provider },
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
          />
        ))}
        <Column gap={spacing.S}>
          <Text.S>{t('midnight.network-config.node-address')}</Text.S>
          <Text.XS>{nodeAddresses}</Text.XS>
        </Column>
        <Column gap={spacing.S}>
          <Text.S>{t('midnight.network-config.indexer-address')}</Text.S>
          <Text.XS>{indexerAddress}</Text.XS>
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
}: ProofServerTierSectionProps) => (
  <Column gap={spacing.M}>
    <Text.S
      style={secondaryTextStyle}
      testID={`proof-server-section-${section.tier}`}>
      {sectionHeader}
    </Text.S>
    {section.modes.map(mode => {
      const testIdSuffix = testIdForMode(mode);
      const endpoint = endpointForDisplay(mode);
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
          />
          <Column gap={spacing.XS} style={optionContentStyle}>
            <Text.S testID={`proof-server-${testIdSuffix}-title`}>
              {getLabel(mode)}
            </Text.S>
            {endpoint ? (
              <Text.XS style={secondaryTextStyle}>{endpoint}</Text.XS>
            ) : null}
            {description ? (
              <Text.XS style={secondaryTextStyle}>{description}</Text.XS>
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
    secondaryText: { color: theme.text.secondary },
  });
};
