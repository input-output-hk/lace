import { util } from '@cardano-sdk/key-management';
import { useAnalytics } from '@lace-contract/analytics';
import { FeatureFlagKey } from '@lace-contract/feature';
import { useTranslation } from '@lace-contract/i18n';
import {
  clearPendingCreateWalletSecrets,
  setPendingCreateWalletSecrets,
} from '@lace-contract/onboarding-v2';
import { StackRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useLaceSelector } from '../../hooks';
import { parseRecoveryPhrase } from '../utils';

import type { StackScreenProps } from '@lace-lib/navigation';

export const useOnboardingRestoreWallet = ({
  navigation,
}: StackScreenProps<StackRoutes.OnboardingRestoreWallet>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { trackEvent } = useAnalytics();

  // Whether the device has ANY form of authentication (PIN, passcode, biometrics)
  // Use this for enforcement checks
  const isDeviceAuthAvailable = useLaceSelector(
    'authenticationPrompt.selectDeviceAuthAvailable',
  );
  const loadedFeatures = useLaceSelector('features.selectLoadedFeatures');

  const [isBiometricRequiredModalVisible, setIsBiometricRequiredModalVisible] =
    useState(false);

  const isMobile = Platform.OS !== 'web';
  const enforceBiometricFlag = loadedFeatures?.featureFlags?.find(
    flag => flag.key === FeatureFlagKey('ENFORCE_BIOMETRIC_REQUIREMENT'),
  ) as { payload?: { enabled?: boolean } } | undefined;
  const shouldEnforceBiometric =
    isMobile && enforceBiometricFlag?.payload?.enabled === true;

  const handleNext = useCallback(
    (passphrase: string) => {
      trackEvent(
        'onboarding | restore wallet | enter your recovery phrase | next | press',
      );
      // Clear previous stored data, since we are starting a new wallet restoration
      clearPendingCreateWalletSecrets();
      setPendingCreateWalletSecrets({
        recoveryPhrase: parseRecoveryPhrase(passphrase),
      });

      navigation.navigate(StackRoutes.OnboardingDesktopLogin);
    },
    [navigation, trackEvent],
  );

  const handleBackPress = useCallback(() => {
    trackEvent(
      'onboarding | restore wallet | enter your recovery phrase | back | press',
    );

    clearPendingCreateWalletSecrets();
    navigation.goBack();
  }, [navigation, trackEvent]);

  // Close modal automatically when device auth becomes available
  // (User enabled PIN/passcode/biometrics in device settings)
  useEffect(() => {
    if (!isDeviceAuthAvailable && shouldEnforceBiometric) {
      setIsBiometricRequiredModalVisible(true);
    }
    if (isDeviceAuthAvailable && isBiometricRequiredModalVisible) {
      setIsBiometricRequiredModalVisible(false);
    }
  }, [
    isDeviceAuthAvailable,
    isBiometricRequiredModalVisible,
    shouldEnforceBiometric,
  ]);

  const title = t('onboarding.start.restore-wallet.title');
  const instructionText = t('onboarding.restore-wallet.subtitle.description');
  const placeholderText = t('onboarding.restore-wallet.input.description');
  const pasteButtonLabel = t('v2.generic.btn.paste');
  const nextButtonLabel = t('v2.generic.btn.next');
  const verificationErrorText = t('v2.recovery-phrase.verification.error');

  return {
    theme,
    title,
    onNext: handleNext,
    onBackPress: handleBackPress,
    validateMnemonic: util.validateMnemonic,
    instructionText,
    placeholderText,
    pasteButtonLabel,
    nextButtonLabel,
    verificationErrorText,
    isBiometricRequiredModalVisible,
  };
};
