import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { StackRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { useHwWalletDevicePicker } from '@lace-lib/util-hw/extension-ui';
import { useCallback } from 'react';

import { useLoadModules } from '../../hooks';

import type { HardwareOnboardingOption } from '@lace-contract/onboarding-v2';
import type { StackScreenProps } from '@lace-lib/navigation';
import type {
  DeviceDescriptor,
  HardwareErrorCategory,
  RequestHWConnection,
} from '@lace-lib/util-hw';

const requestHWConnectionFallback: RequestHWConnection = async () => {
  throw new Error('requestHWConnection not available');
};

export const useOnboardingHardwareWallet = ({
  navigation,
}: StackScreenProps<StackRoutes.OnboardingHardware>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { trackEvent } = useAnalytics();

  const loadedOnboardingOptions = useLoadModules(
    'addons.loadOnboardingOptions',
  );

  const [requestHWConnection = requestHWConnectionFallback] =
    useLoadModules('addons.loadRequestHWConnections') || [];

  const handleDeviceMatched = useCallback(
    (matchedOption: HardwareOnboardingOption, usbDevice: DeviceDescriptor) => {
      trackEvent('onboarding | hardware wallet | device | matched', {
        walletType: matchedOption.walletType,
        derivationTypeCount: matchedOption.derivationTypes?.length ?? 0,
      });
      navigation.navigate(StackRoutes.OnboardingDesktopLogin, {
        hardwareSetup: {
          optionId: matchedOption.id,
          walletType: matchedOption.walletType,
          device: usbDevice,
          derivationTypes: matchedOption.derivationTypes,
        },
      });
    },
    [navigation, trackEvent],
  );

  const handleDeviceError = useCallback(
    (category: HardwareErrorCategory) => {
      trackEvent('onboarding | hardware wallet | device | error', { category });
    },
    [trackEvent],
  );

  const { supportedDevices, handleConnect, isConnecting, error } =
    useHwWalletDevicePicker<HardwareOnboardingOption>({
      loadedOnboardingOptions,
      requestHWConnection,
      onDeviceMatched: handleDeviceMatched,
      onDeviceError: handleDeviceError,
    });

  const handleBackPress = useCallback(() => {
    if (isConnecting) return;
    navigation.goBack();
  }, [isConnecting, navigation]);

  return {
    theme,
    title: t('onboarding.hardware-wallet.title'),
    subtitle: t('onboarding.hardware-wallet.subtitle'),
    supportedDevices,
    instructionText: t('onboarding.hardware-wallet.instructions'),
    onBackPress: handleBackPress,
    onConnect: handleConnect,
    connectButtonLabel: t('onboarding.hardware-wallet.connect-button'),
    isConnecting,
    error,
  };
};
