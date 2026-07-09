import { useTranslation } from '@lace-contract/i18n';
import { type HardwareOnboardingOption } from '@lace-contract/onboarding-v2';
import { HardwareWalletId } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useHwWalletDevicePicker } from '@lace-lib/util-hw/extension-ui';
import { useCallback, useState } from 'react';

import {
  useLoadedOnboardingOptions,
  useLoadModules,
  useLaceSelector,
} from '../../hooks';

import type { DeviceDescriptor, RequestHWConnection } from '@lace-lib/util-hw';

const requestHWConnectionFallback: RequestHWConnection = async () => {
  throw new Error('requestHWConnection not available');
};

export const useAddWalletHardware = () => {
  const { t } = useTranslation();
  const loadedOnboardingOptions = useLoadedOnboardingOptions();
  const allWallets = useLaceSelector('wallets.selectAll');
  const [alreadyPairedError, setAlreadyPairedError] = useState<
    string | undefined
  >();

  const [requestHWConnection = requestHWConnectionFallback] =
    useLoadModules('addons.loadRequestHWConnections') || [];

  const handleDeviceMatched = useCallback(
    (matchedOption: HardwareOnboardingOption, usbDevice: DeviceDescriptor) => {
      const hwWalletId = HardwareWalletId(usbDevice);
      const isAlreadyPaired = allWallets.some(w => w.walletId === hwWalletId);

      if (isAlreadyPaired) {
        setAlreadyPairedError(
          t('v2.account-details.add-wallet-hardware.error.already-paired'),
        );
        return;
      }

      NavigationControls.navigate(SheetRoutes.AddWalletHardwareSetup, {
        optionId: matchedOption.id,
        device: usbDevice,
        derivationTypes: matchedOption.derivationTypes,
      });
    },
    [allWallets, t],
  );

  const {
    supportedDevices,
    handleConnect: connectDevice,
    isConnecting,
    error,
  } = useHwWalletDevicePicker<HardwareOnboardingOption>({
    loadedOnboardingOptions,
    requestHWConnection,
    onDeviceMatched: handleDeviceMatched,
  });

  const handleConnect = useCallback(() => {
    setAlreadyPairedError(undefined);
    connectDevice();
  }, [connectDevice]);

  const handleClose = useCallback(() => {
    if (isConnecting) return;
    NavigationControls.closeSheet();
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
    error: alreadyPairedError ?? error,
    isError: !!(alreadyPairedError ?? error),
  };
};
