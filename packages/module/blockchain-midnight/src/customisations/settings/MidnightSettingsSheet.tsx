import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Column,
  RadioButton,
  Row,
  Sheet,
  SheetFooter,
  SheetHeader,
  spacing,
  Text,
  useFooterHeight,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';

import { useMidnightSettings } from '../../hooks';

import type { ProveServerOption } from '../../hooks/useMidnightSettings';

export const MidnightSettingsSheet = () => {
  const { t } = useTranslation();
  const styles = useStyles();

  const {
    networkId,
    networksConfig,
    isSaving,
    isOpen,
    openSettings,
    save,
    getProveServerOptions,
  } = useMidnightSettings();

  const [selectedProofServer, setSelectedProofServer] = useState(
    networksConfig[networkId].proofServerAddress,
  );

  const proveServerOptions = getProveServerOptions(networkId);
  const nodeAddresses = networksConfig[networkId].nodeAddress;
  const indexerAddress = networksConfig[networkId].indexerAddress;

  // Track if we initiated a save to know when to close the sheet
  const hasSaveInitiated = useRef(false);

  const handleClose = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  // Call openSettings on mount to transition state machine to 'Open'
  useEffect(() => {
    openSettings();
  }, [openSettings]);

  // Watch for save completion (state goes to 'Closed') and close sheet
  useEffect(() => {
    if (hasSaveInitiated.current && !isOpen) {
      hasSaveInitiated.current = false;
      handleClose();
    }
  }, [isOpen, handleClose]);

  const handleSave = useCallback(() => {
    const updatedConfig = {
      ...networksConfig[networkId],
      proofServerAddress: selectedProofServer,
    };
    hasSaveInitiated.current = true;
    save({ config: updatedConfig, networkId });
  }, [networksConfig, networkId, selectedProofServer, save]);

  const getOptionLabel = (option: ProveServerOption) => {
    if (option.variant === 'local') {
      return t('midnight.network-config.proof-server-option.local');
    }
    return t('midnight.network-config.proof-server-option.remote');
  };

  const getOptionDescription = (option: ProveServerOption) => {
    if (option.variant === 'local') {
      return t('v2.pages.midnight-settings.proof-server.localhost.description');
    }
    return t('midnight.network-config.proof-server-option-tooltip.remote');
  };

  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  return (
    <>
      <SheetHeader
        title={t('v2.pages.midnight-settings.title')}
        leftIconOnPress={handleClose}
        testID="midnight-settings-sheet-header"
      />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContainerStyle}>
        <Column gap={spacing.L}>
          <Text.S style={styles.secondaryText}>
            {t('v2.pages.midnight-settings.proof-server.title')}
          </Text.S>

          {proveServerOptions.map(option => (
            <Row key={option.url} alignItems="flex-start" gap={spacing.M}>
              <RadioButton
                isChecked={selectedProofServer === option.url}
                isDisabled={isSaving}
                onRadioValueChange={() => {
                  setSelectedProofServer(option.url);
                }}
                testID={`proof-server-${option.variant}-radio`}
              />
              <Column gap={spacing.XS} style={styles.optionContent}>
                <Text.S testID={`proof-server-${option.variant}-title`}>
                  {getOptionLabel(option)}
                </Text.S>
                <Text.XS style={styles.secondaryText}>{option.url}</Text.XS>
                <Text.XS style={styles.secondaryText}>
                  {getOptionDescription(option)}
                </Text.XS>
              </Column>
            </Row>
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
      <SheetFooter
        primaryButton={{
          label: t('settings.configure-midnight.drawer.saveBtnLabel'),
          onPress: handleSave,
          disabled: isSaving || proveServerOptions.length <= 1,
          testID: 'save-configuration-button',
        }}
      />
    </>
  );
};

const useStyles = () => {
  const { theme } = useTheme();
  return StyleSheet.create({
    optionContent: {
      flex: 1,
    },
    secondaryText: { color: theme.text.secondary },
  });
};
