import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { getHwBlockchainSupportForWalletType } from '@lace-contract/onboarding-v2';
import { StackRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import {
  useHwBlockchainSelection,
  useHwWalletDevicePicker,
} from '@lace-lib/util-hw/extension-ui';
import { useCallback } from 'react';

import { useLoadModules } from '../../hooks';

import type { HardwareOnboardingOption } from '@lace-contract/onboarding-v2';
import type { StackScreenProps } from '@lace-lib/navigation';
import type {
  DeviceDescriptor,
  HardwareErrorCategory,
  HardwareIntegrationId,
  RequestHWConnection,
} from '@lace-lib/util-hw';
import type { HwBlockchainSelectionProceedParams } from '@lace-lib/util-hw/extension-ui';
import type { BlockchainName } from '@lace-lib/util-store';

const requestHWConnectionFallback: RequestHWConnection = async () => {
  throw new Error('requestHWConnection not available');
};

type BlockchainSelectionContext = {
  walletType: HardwareOnboardingOption['walletType'];
  derivationTypes: HardwareOnboardingOption['derivationTypes'];
  device?: DeviceDescriptor;
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
  const loadedHwBlockchainSupport = useLoadModules(
    'addons.loadHwBlockchainSupport',
  );

  const [requestHWConnection = requestHWConnectionFallback] =
    useLoadModules('addons.loadRequestHWConnections') || [];

  const proceedToSetup = useCallback(
    (params: {
      optionId: HardwareIntegrationId;
      walletType: HardwareOnboardingOption['walletType'];
      device?: DeviceDescriptor;
      derivationTypes: HardwareOnboardingOption['derivationTypes'];
      blockchainName: BlockchainName;
    }) => {
      navigation.navigate(StackRoutes.OnboardingDesktopLogin, {
        hardwareSetup: params,
      });
    },
    [navigation],
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
        walletType: context.walletType,
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
      trackEvent('onboarding | hardware wallet | device | matched', {
        walletType: matchedOption.walletType,
        derivationTypeCount: matchedOption.derivationTypes?.length ?? 0,
      });
      const blockchains = getHwBlockchainSupportForWalletType(
        loadedHwBlockchainSupport,
        matchedOption.walletType,
      );
      chooseBlockchainOrProceed({
        blockchains,
        context: {
          walletType: matchedOption.walletType,
          derivationTypes: matchedOption.derivationTypes,
          device: usbDevice,
        },
      });
    },
    [trackEvent, loadedHwBlockchainSupport, chooseBlockchainOrProceed],
  );

  const handleDeviceError = useCallback(
    (category: HardwareErrorCategory) => {
      trackEvent('onboarding | hardware wallet | device | error', { category });
    },
    [trackEvent],
  );

  const handleAirGappedSelected = useCallback(
    (option: HardwareOnboardingOption) => {
      trackEvent('onboarding | hardware wallet | device | matched', {
        walletType: option.walletType,
        derivationTypeCount: option.derivationTypes?.length ?? 0,
      });
      const blockchains = getHwBlockchainSupportForWalletType(
        loadedHwBlockchainSupport,
        option.walletType,
      );
      chooseBlockchainOrProceed({
        blockchains,
        context: {
          walletType: option.walletType,
          derivationTypes: option.derivationTypes,
        },
      });
    },
    [trackEvent, loadedHwBlockchainSupport, chooseBlockchainOrProceed],
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
    onDeviceError: handleDeviceError,
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

  const handleBackPress = useCallback(() => {
    if (isConnecting) return;
    if (isSelectingBlockchain) {
      resetBlockchainSelection();
      return;
    }
    navigation.goBack();
  }, [
    isConnecting,
    navigation,
    isSelectingBlockchain,
    resetBlockchainSelection,
  ]);

  if (isSelectingBlockchain) {
    return {
      theme,
      title: t('onboarding.hardware-wallet.title'),
      subtitle: t('onboarding.hardware-wallet.select-blockchain.subtitle'),
      supportedDevices: blockchainDevices,
      instructionText: t(
        'onboarding.hardware-wallet.select-blockchain.instructions',
      ),
      onBackPress: handleBackPress,
      onConnect: handleBackPress,
      onSelectDevice: handleSelectBlockchain,
      connectButtonLabel: t('v2.generic.btn.back'),
      isConnecting,
      error: null,
    };
  }

  return {
    theme,
    title: t('onboarding.hardware-wallet.title'),
    subtitle: t('onboarding.hardware-wallet.subtitle'),
    supportedDevices,
    instructionText: t('onboarding.hardware-wallet.select-device'),
    onBackPress: handleBackPress,
    onConnect: handleConnect,
    onSelectDevice: handleSelectDevice,
    connectButtonLabel: t('onboarding.hardware-wallet.connect-button'),
    isConnecting,
    error,
  };
};
