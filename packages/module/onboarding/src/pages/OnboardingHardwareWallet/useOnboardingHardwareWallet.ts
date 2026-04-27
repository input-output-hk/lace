import { useTranslation } from '@lace-contract/i18n';
import {
  type HardwareOnboardingOption,
  type OnboardingOption,
} from '@lace-contract/onboarding-v2';
import { StackRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { useHwWalletDevicePicker } from '@lace-lib/util-hw/extension-ui';
import { useCallback } from 'react';

import { useLoadModules } from '../../hooks';

import type { StackScreenProps } from '@lace-lib/navigation';
import type { DeviceDescriptor } from '@lace-lib/util-hw';

export const useOnboardingHardwareWallet = ({
  navigation,
}: StackScreenProps<StackRoutes.OnboardingHardware>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const loadedOnboardingOptions = useLoadModules(
    'addons.loadOnboardingOptions',
  ) as OnboardingOption[][] | undefined;

  const handleDeviceMatched = useCallback(
    (matchedOption: HardwareOnboardingOption, usbDevice: DeviceDescriptor) => {
      navigation.navigate(StackRoutes.OnboardingDesktopLogin, {
        hardwareSetup: {
          optionId: matchedOption.id,
          device: usbDevice,
          derivationTypes: matchedOption.derivationTypes,
        },
      });
    },
    [navigation],
  );

  const { supportedDevices, handleConnect, isConnecting, error } =
    useHwWalletDevicePicker<HardwareOnboardingOption>({
      loadedOnboardingOptions,
      usbPickerMessage: t('onboarding.hardware-wallet.usb-picker.message'),
      usbPickerButtonLabel: t('onboarding.hardware-wallet.usb-picker.button'),
      onDeviceMatched: handleDeviceMatched,
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
