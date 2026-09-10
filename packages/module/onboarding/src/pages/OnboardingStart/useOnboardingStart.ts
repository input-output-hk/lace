import { useAnalytics } from '@lace-contract/analytics';
import { useConfig, useUICustomisation } from '@lace-contract/app';
import { FeatureFlagKey } from '@lace-contract/feature';
import { useTranslation } from '@lace-contract/i18n';
import { clearPendingCreateWalletSecrets } from '@lace-contract/onboarding-v2';
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

// The host create/import ceremony occludes the guest for its whole duration and
// hands focus back to the guest window on settle (ADR 36; there is no host→guest
// completion push). On success the first wallet projects and the app navigates
// to Home within a couple of seconds, tearing down this page; when the guest
// regains focus with no navigation following within this window, the ceremony
// was cancelled or failed, so the overlay is dismissed.
const SETTING_UP_HIDE_GRACE_MS = 5000;

export const useOnboardingStart = ({
  navigation,
}: StackScreenProps<StackRoutes.OnboardingStart>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { appConfig } = useConfig();
  const { trackEvent } = useAnalytics();
  const requestCreateWalletCeremony = useDispatchLaceAction(
    'vault.createWalletCeremonyRequested',
  );
  const requestImportWalletCeremony = useDispatchLaceAction(
    'vault.importWalletCeremonyRequested',
  );
  // Whether the device has ANY form of authentication (PIN, passcode, biometrics)
  // Use this for enforcement checks
  const isDeviceAuthAvailable = useLaceSelector(
    'authenticationPrompt.selectDeviceAuthAvailable',
  );
  const loadedFeatures = useLaceSelector('features.selectLoadedFeatures');

  const [isBiometricRequiredModalVisible, setIsBiometricRequiredModalVisible] =
    useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const isMobile = Platform.OS !== 'web';
  const enforceBiometricFlag = loadedFeatures?.featureFlags?.find(
    flag => flag.key === FeatureFlagKey('ENFORCE_BIOMETRIC_REQUIREMENT'),
  ) as { payload?: { enabled?: boolean } } | undefined;
  const shouldEnforceBiometric =
    isMobile && enforceBiometricFlag?.payload?.enabled === true;

  // Cleared here rather than in the ceremony side effect: the buffer is a
  // module singleton in this process, and on the extension side effects run in
  // the service worker, where the clear would miss it and leave the previous
  // attempt's phrase staged.
  const handleCreateWallet = useCallback(() => {
    trackEvent('onboarding | new wallet | press');
    clearPendingCreateWalletSecrets();
    setIsSettingUp(true);
    requestCreateWalletCeremony({ origin: 'onboarding' });
  }, [requestCreateWalletCeremony, trackEvent]);

  const handleRestoreWallet = useCallback(() => {
    trackEvent('onboarding | restore wallet | press');
    clearPendingCreateWalletSecrets();
    setIsSettingUp(true);
    requestImportWalletCeremony({ origin: 'onboarding' });
  }, [requestImportWalletCeremony, trackEvent]);

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

  // Dismiss the "setting up" overlay once the guest window regains focus after
  // the host ceremony closes, unless navigation to Home tears down this page
  // first (success). Guarded to a single timer so repeated focus events while
  // the overlay is up don't stack.
  useEffect(() => {
    // React Native's global `window` has no DOM event methods; there the
    // navigation-focus effect below is what dismisses the overlay.
    if (!isSettingUp || typeof window?.addEventListener !== 'function') return;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const handleWindowFocus = () => {
      if (hideTimer !== undefined) return;
      hideTimer = setTimeout(() => {
        setIsSettingUp(false);
      }, SETTING_UP_HIDE_GRACE_MS);
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      if (hideTimer !== undefined) clearTimeout(hideTimer);
    };
  }, [isSettingUp]);

  // The in-process vault arm routes the ceremony to its own stack page while
  // this screen stays mounted underneath, so regaining navigation focus means
  // the user came back and the ceremony is over. The host arm runs the ceremony
  // in a separate window and never blurs this screen, leaving it unaffected.
  useEffect(
    () =>
      navigation.addListener('focus', () => {
        setIsSettingUp(false);
      }),
    [navigation],
  );

  const loadedOnboardingOptions = useLoadModules(
    'addons.loadOnboardingOptions',
  ) as OnboardingOption[][] | undefined;
  const hasHardwareWalletOptions = useMemo(
    () => loadedOnboardingOptions?.flat().some(option => option.isHwDevice),
    [loadedOnboardingOptions],
  );

  const entryCustomisations = useUICustomisation(
    'addons.loadOnboardingEntryUICustomisations',
  );
  const entryOptions = useMemo(
    () =>
      entryCustomisations.flatMap(
        customisation => customisation.EntryOptions ?? [],
      ),
    [entryCustomisations],
  );

  const vaultCapabilities = useLoadModules('addons.loadVaultCapabilities')?.[0];

  const actions = useMemo<OnboardingStartActionItem[]>(() => {
    const items: OnboardingStartActionItem[] = [];

    if (vaultCapabilities?.create) {
      items.push({
        icon: 'WalletAdd',
        title: t('onboarding.start.new-wallet.title'),
        description: t('onboarding.start.new-wallet-subtitle'),
        onPress: handleCreateWallet,
        testID: 'onboarding-start-create-wallet-button',
      });
    }

    if (vaultCapabilities?.import) {
      items.push({
        icon: 'WalletCheck',
        title: t('onboarding.start.restore-wallet.title'),
        description: t('onboarding.start.restore-wallet.subtitle'),
        onPress: handleRestoreWallet,
        testID: 'onboarding-start-restore-wallet-button',
      });
    }

    // Between restore and hardware: module-contributed entries are alternatives
    // to restoring, so they belong next to it rather than after the hardware card.
    items.push(
      ...entryOptions.map(option => ({
        icon: option.icon as OnboardingStartActionItem['icon'],
        title: t(option.titleKey),
        description: t(option.descriptionKey),
        onPress: () => {
          option.onPress('onboarding');
        },
        testID: `onboarding-start-${option.id}-button`,
      })),
    );

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
    entryOptions,
    vaultCapabilities,
  ]);

  return {
    theme,
    actions,
    handleOpenTerms,
    handleOpenPrivacyPolicy,
    handleCookiePolicy,
    isBiometricRequiredModalVisible,
    isSettingUp,
  };
};
