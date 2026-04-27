import { useTranslation } from '@lace-contract/i18n';
import { type HardwareOnboardingOption } from '@lace-contract/onboarding-v2';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useHwWalletDevicePicker } from '@lace-lib/util-hw/extension-ui';
import { useCallback } from 'react';

import { useLoadedOnboardingOptions } from '../../hooks';

import type { DeviceDescriptor } from '@lace-lib/util-hw';

export const useAddWalletHardware = () => {
  const { t } = useTranslation();

  const loadedOnboardingOptions = useLoadedOnboardingOptions();

  const handleDeviceMatched = useCallback(
    (matchedOption: HardwareOnboardingOption, usbDevice: DeviceDescriptor) => {
      NavigationControls.sheets.navigate(SheetRoutes.AddWalletHardwareSetup, {
        optionId: matchedOption.id,
        device: usbDevice,
        derivationTypes: matchedOption.derivationTypes,
      });
    },
    [],
  );

  const { supportedDevices, handleConnect, isConnecting, error } =
    useHwWalletDevicePicker<HardwareOnboardingOption>({
      loadedOnboardingOptions,
      usbPickerMessage: t(
        'v2.account-details.add-wallet-hardware.usb-picker.message',
      ),
      usbPickerButtonLabel: t(
        'v2.account-details.add-wallet-hardware.usb-picker.button',
      ),
      onDeviceMatched: handleDeviceMatched,
    });

  const handleClose = useCallback(() => {
    if (isConnecting) return;
    NavigationControls.sheets.close();
  }, [isConnecting]);

  return {
    title: t('v2.account-details.add-wallet-hardware.title'),
    subtitle: t('v2.account-details.add-wallet-hardware.subtitle'),
    supportedDevices,
    instructionText: t('v2.account-details.add-wallet-hardware.instructions'),
    onBackPress: handleClose,
    onConnect: handleConnect,
    connectButtonLabel: t(
      'v2.account-details.add-wallet-hardware.connect-button',
    ),
    isConnecting,
    error,
  };
};
