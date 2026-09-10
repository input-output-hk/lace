import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { OnboardingRestoreWallet as OnboardingRestoreTemplate } from '@lace-lib/ui-toolkit';
import { Modal } from '@lace-lib/ui-toolkit';
import React from 'react';
import { Linking, Platform } from 'react-native';

import { useOnboardingRestoreWallet } from './useOnboardingRestoreWallet';

import type { StackScreenProps, StackRoutes } from '@lace-lib/navigation';

export const OnboardingRestoreWallet = (
  props: StackScreenProps<StackRoutes.OnboardingRestoreWallet>,
) => {
  const { t } = useTranslation();
  const {
    title,
    onNext,
    onBackPress,
    validateMnemonic,
    instructionText,
    placeholderText,
    pasteButtonLabel,
    nextButtonLabel,
    verificationErrorText,
    isBiometricRequiredModalVisible,
  } = useOnboardingRestoreWallet(props);

  const entryCustomisations = useUICustomisation(
    'addons.loadOnboardingEntryUICustomisations',
  );
  const RestoreCalloutComponent = entryCustomisations.find(
    customisation => customisation.RestoreCallout,
  )?.RestoreCallout;

  const handleGoToSettings = () => {
    if (Platform.OS === 'android') {
      void Linking.sendIntent('android.settings.SETTINGS');
    } else {
      void Linking.openSettings();
    }
  };

  return (
    <>
      <OnboardingRestoreTemplate
        title={title}
        onBackPress={onBackPress}
        onNext={onNext}
        instructionText={instructionText}
        placeholderText={placeholderText}
        pasteButtonLabel={pasteButtonLabel}
        nextButtonLabel={nextButtonLabel}
        validateMnemonic={validateMnemonic}
        verificationErrorText={verificationErrorText}
        {...(RestoreCalloutComponent && {
          callout: <RestoreCalloutComponent />,
        })}
      />

      <Modal
        visible={isBiometricRequiredModalVisible}
        heading={t('authentication-prompt.biometric-required.title')}
        description={t('authentication-prompt.biometric-required.description')}
        confirmText={t(
          'authentication-prompt.biometric-required.go-to-settings',
        )}
        onConfirm={handleGoToSettings}
      />
    </>
  );
};
