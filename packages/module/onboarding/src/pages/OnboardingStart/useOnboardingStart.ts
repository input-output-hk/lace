import { useAnalytics } from '@lace-contract/analytics';
import { useConfig } from '@lace-contract/app';
import { FeatureFlagKey } from '@lace-contract/feature';
import { useTranslation } from '@lace-contract/i18n';
import { StackRoutes } from '@lace-lib/navigation';
import { openUrl, useTheme } from '@lace-lib/ui-toolkit';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useLoadModules,
} from '../../hooks';

import type { OnboardingOption } from '@lace-contract/onboarding-v2';
import type { StackScreenProps } from '@lace-lib/navigation';
import type { OnboardingStartActionItem } from '@lace-lib/ui-toolkit';

export const useOnboardingStart = ({
  navigation,
}: StackScreenProps<StackRoutes.OnboardingStart>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { appConfig } = useConfig();
  const { trackEvent } = useAnalytics();
  const clearPendingCreateWallet = useDispatchLaceAction(
    'onboardingV2.clearPendingCreateWallet',
  );
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

  const handleCreateWallet = useCallback(() => {
    trackEvent('onboarding | new wallet | press');
    clearPendingCreateWallet();
    navigation.navigate(StackRoutes.OnboardingDesktopLogin);
  }, [clearPendingCreateWallet, navigation, trackEvent]);

  const handleRestoreWallet = useCallback(() => {
    trackEvent('onboarding | restore wallet | press');
    clearPendingCreateWallet();
    navigation.navigate(StackRoutes.OnboardingRestoreWallet);
  }, [clearPendingCreateWallet, navigation, trackEvent]);

  const handleConnectHardwareWallet = useCallback(() => {
    trackEvent('onboarding | hardware wallet | connect | press');
    navigation.navigate(StackRoutes.OnboardingHardware);
  }, [navigation, trackEvent]);

  const handleOpenPrivacyPolicy = useCallback(() => {
    trackEvent('onboarding | privacy policy | press');
    if (!appConfig?.privacyPolicyUrl) return;
    void openUrl({
      url: appConfig.privacyPolicyUrl,
      onError: _ => {
        // The error is thrown in the util file, do nothing here
      },
    });
  }, [appConfig?.privacyPolicyUrl, trackEvent]);

  const handleOpenTerms = useCallback(() => {
    trackEvent('onboarding | terms and conditions | press');
    if (!appConfig?.termsAndConditionsUrl) return;
    void openUrl({
      url: appConfig.termsAndConditionsUrl,
      onError: _ => {
        // The error is thrown in the util file, do nothing here
      },
    });
  }, [appConfig?.termsAndConditionsUrl, trackEvent]);

  const handleCookiePolicy = useCallback(() => {
    trackEvent('onboarding | cookie policy | press');
    if (!appConfig?.cookiePolicyUrl) return;
    void openUrl({
      url: appConfig.cookiePolicyUrl,
      onError: _ => {
        // The error is thrown in the util file, do nothing here
      },
    });
  }, [appConfig?.cookiePolicyUrl, trackEvent]);

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

  const loadedOnboardingOptions = useLoadModules(
    'addons.loadOnboardingOptions',
  ) as OnboardingOption[][] | undefined;
  const hasHardwareWalletOptions = useMemo(
    () => loadedOnboardingOptions?.flat().some(option => option.isHwDevice),
    [loadedOnboardingOptions],
  );

  const actions = useMemo<OnboardingStartActionItem[]>(() => {
    const items: OnboardingStartActionItem[] = [
      {
        icon: 'WalletAdd',
        title: t('onboarding.start.new-wallet.title'),
        description: t('onboarding.start.new-wallet-subtitle'),
        onPress: handleCreateWallet,
        testID: 'onboarding-start-create-wallet-button',
      },
      {
        icon: 'WalletCheck',
        title: t('onboarding.start.restore-wallet.title'),
        description: t('onboarding.start.restore-wallet.subtitle'),
        onPress: handleRestoreWallet,
        testID: 'onboarding-start-restore-wallet-button',
      },
    ];

    if (hasHardwareWalletOptions) {
      items.push({
        icon: 'HardwareWallet',
        title: t('onboarding.start.hardware-wallet.title'),
        description: t('onboarding.start.hardware-wallet.subtitle'),
        onPress: handleConnectHardwareWallet,
        testID: 'onboarding-start-hardware-wallet-button',
      });
    }

    return items;
  }, [
    t,
    handleCreateWallet,
    handleRestoreWallet,
    handleConnectHardwareWallet,
    hasHardwareWalletOptions,
  ]);

  return {
    theme,
    actions,
    handleOpenTerms,
    handleOpenPrivacyPolicy,
    handleCookiePolicy,
    isBiometricRequiredModalVisible,
  };
};
