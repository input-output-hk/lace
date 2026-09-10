import { useTranslation } from '@lace-contract/i18n';
import {
  getHwBlockchainSupportForWalletType,
  type HardwareOnboardingOption,
} from '@lace-contract/onboarding-v2';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  useHwBlockchainSelection,
  useHwWalletDevicePicker,
} from '@lace-lib/util-hw/extension-ui';
import { useCallback } from 'react';

import { useLoadedOnboardingOptions, useLoadModules } from '../../hooks';

import type {
  DeviceDescriptor,
  HardwareIntegrationId,
  RequestHWConnection,
} from '@lace-lib/util-hw';
import type { HwBlockchainSelectionProceedParams } from '@lace-lib/util-hw/extension-ui';
import type { BlockchainName } from '@lace-lib/util-store';

const requestHWConnectionFallback: RequestHWConnection = async () => {
  throw new Error('requestHWConnection not available');
};

type BlockchainSelectionContext = {
  derivationTypes: HardwareOnboardingOption['derivationTypes'];
  device?: DeviceDescriptor;
};

/**
 * Drives the add-hardware-wallet sheet. Known devices are not rejected up
 * front: a device already paired for one blockchain or network can still add
 * accounts it does not have yet, so duplicate detection happens after the
 * connector runs, where the creation side effect merges new accounts into
 * the existing wallet and only fully duplicate attempts fail.
 */
export const useAddWalletHardware = () => {
  const { t } = useTranslation();
  const loadedOnboardingOptions = useLoadedOnboardingOptions();
  const loadedHwBlockchainSupport = useLoadModules(
    'addons.loadHwBlockchainSupport',
  );

  const [requestHWConnection = requestHWConnectionFallback] =
    useLoadModules('addons.loadRequestHWConnections') || [];

  const proceedToSetup = useCallback(
    (params: {
      optionId: HardwareIntegrationId;
      device?: DeviceDescriptor;
      derivationTypes: HardwareOnboardingOption['derivationTypes'];
      blockchainName: BlockchainName;
    }) => {
      NavigationControls.navigate(SheetRoutes.AddWalletHardwareSetup, params);
    },
    [],
  );

  const handleProceed = useCallback(
    ({
      optionId,
      blockchainName,
      context,
    }: HwBlockchainSelectionProceedParams<BlockchainSelectionContext>) => {
      proceedToSetup({
        optionId,
        blockchainName,
        device: context.device,
        derivationTypes: context.derivationTypes,
      });
    },
    [proceedToSetup],
  );

  const {
    isSelectingBlockchain,
    blockchainDevices,
    handleSelectBlockchain,
    resetBlockchainSelection,
    chooseBlockchainOrProceed,
  } = useHwBlockchainSelection<BlockchainSelectionContext>({
    onProceed: handleProceed,
  });

  const handleDeviceMatched = useCallback(
    (matchedOption: HardwareOnboardingOption, usbDevice: DeviceDescriptor) => {
      const blockchains = getHwBlockchainSupportForWalletType(
        loadedHwBlockchainSupport,
        matchedOption.walletType,
      );
      chooseBlockchainOrProceed({
        blockchains,
        context: {
          derivationTypes: matchedOption.derivationTypes,
          device: usbDevice,
        },
      });
    },
    [loadedHwBlockchainSupport, chooseBlockchainOrProceed],
  );

  const handleAirGappedSelected = useCallback(
    (option: HardwareOnboardingOption) => {
      const blockchains = getHwBlockchainSupportForWalletType(
        loadedHwBlockchainSupport,
        option.walletType,
      );
      chooseBlockchainOrProceed({
        blockchains,
        fallbackOptionId: option.id,
        context: { derivationTypes: option.derivationTypes },
      });
    },
    [loadedHwBlockchainSupport, chooseBlockchainOrProceed],
  );

  const {
    supportedDevices,
    handleConnect: connectDevice,
    handleSelectDevice: selectDevice,
    isConnecting,
    error,
  } = useHwWalletDevicePicker<HardwareOnboardingOption>({
    loadedOnboardingOptions,
    requestHWConnection,
    onDeviceMatched: handleDeviceMatched,
    onAirGappedSelected: handleAirGappedSelected,
  });

  const isSupportLoaded = loadedHwBlockchainSupport !== undefined;

  /**
   * A scan started before the hw-blockchain-support addons resolve would have
   * its match dropped (no blockchains to choose from or proceed with), so
   * device selection waits for them.
   */
  const handleConnect = useCallback(() => {
    if (!isSupportLoaded) return;
    connectDevice();
  }, [isSupportLoaded, connectDevice]);

  const handleSelectDevice = useCallback(
    (deviceId: string) => {
      if (!isSupportLoaded) return;
      selectDevice(deviceId);
    },
    [isSupportLoaded, selectDevice],
  );

  const handleClose = useCallback(() => {
    if (isConnecting) return;
    NavigationControls.closeSheet();
  }, [isConnecting]);

  if (isSelectingBlockchain) {
    return {
      title: t('v2.account-details.add-wallet-hardware.title'),
      subtitle: t(
        'v2.account-details.add-wallet-hardware.select-blockchain.subtitle',
      ),
      supportedDevices: blockchainDevices,
      instructionText: t(
        'v2.account-details.add-wallet-hardware.select-blockchain.instructions',
      ),
      onBackPress: resetBlockchainSelection,
      onConnect: resetBlockchainSelection,
      onSelectDevice: handleSelectBlockchain,
      connectButtonLabel: t('v2.generic.btn.back'),
      isConnecting,
      error: undefined,
      isError: false,
    };
  }

  return {
    title: t('v2.account-details.add-wallet-hardware.title'),
    subtitle: t('v2.account-details.add-wallet-hardware.subtitle'),
    supportedDevices,
    instructionText: t('v2.account-details.add-wallet-hardware.instructions'),
    onBackPress: handleClose,
    onConnect: handleConnect,
    onSelectDevice: handleSelectDevice,
    connectButtonLabel: t(
      'v2.account-details.add-wallet-hardware.connect-button',
    ),
    isConnecting,
    error,
    isError: !!error,
  };
};
