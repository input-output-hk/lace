import { useTranslation } from '@lace-contract/i18n';
import { Modal } from '@lace-lib/ui-toolkit';
import React from 'react';
import { Linking, Platform } from 'react-native';

export interface BiometricRequiredPromptProps {
  onGoToSettings: () => void;
  onCancel?: () => void;
  visible: boolean;
}

export const BiometricRequiredPrompt = ({
  onGoToSettings,
  onCancel,
  visible,
}: BiometricRequiredPromptProps) => {
  const { t } = useTranslation();

  const handleGoToSettings = () => {
    onGoToSettings();
    if (Platform.OS === 'android') {
      void Linking.sendIntent('android.settings.SETTINGS');
    } else {
      void Linking.openSettings();
    }
  };

  return (
    <Modal
      visible={visible}
      heading={t('authentication-prompt.biometric-required.title')}
      description={t('authentication-prompt.biometric-required.description')}
      confirmText={t('authentication-prompt.biometric-required.go-to-settings')}
      onConfirm={handleGoToSettings}
      onClose={onCancel}
      onRequestClose={onCancel}
    />
  );
};
