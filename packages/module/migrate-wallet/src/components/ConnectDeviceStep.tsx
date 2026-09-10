import { useTranslation } from '@lace-contract/i18n';
import { getHwBlockchainSupportForWalletType } from '@lace-contract/onboarding-v2';
import { Column, CustomIcons, spacing, Text } from '@lace-lib/ui-toolkit';
import {
  useHwBlockchainSelection,
  useHwWalletDevicePicker,
} from '@lace-lib/util-hw/extension-ui';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLoadModules } from '../hooks';

import { WaitingBlock } from './WaitingBlock';
import { wizardText } from './wizard-styles';
import { WizardFrame } from './WizardFrame';
import { OPTION_CARD_GAP, WizardOptionCard } from './WizardOptionCard';

import type { HardwareOnboardingOption } from '@lace-contract/onboarding-v2';
import type { CustomIconName } from '@lace-lib/ui-toolkit';
import type {
  DeviceDescriptor,
  HardwareErrorCategory,
  RequestHWConnection,
} from '@lace-lib/util-hw';
import type { HardwareIntegrationId } from '@lace-lib/util-hw';
import type { HwBlockchainSelectionProceedParams } from '@lace-lib/util-hw/extension-ui';
import type { BlockchainName } from '@lace-lib/util-store';

const requestHWConnectionFallback: RequestHWConnection = async () => {
  throw new Error('requestHWConnection not available');
};

/** The device's brand mark, when the bundle actually ships one for it. */
const customIcon = (logo?: string): CustomIconName | undefined =>
  logo !== undefined && logo in CustomIcons
    ? (logo as CustomIconName)
    : undefined;

/**
 * Vault modules label their devices in caps ("LEDGER") because the shared
 * onboarding template renders a wordmark and never prints the name. Title-case
 * it for the fallback so it does not shout inside a sentence-case wizard.
 */
const titleCase = (name: string): string =>
  name.charAt(0) + name.slice(1).toLowerCase();

/**
 * A device's brand wordmark, scaled into a fixed box so a 3:1 Ledger mark and a
 * 4:1 Trezor mark still line up with each other. The SVGs fill from
 * `theme.text.primary`, so they follow the active theme without help.
 */
const DeviceWordmark = ({ logo }: { logo: CustomIconName }) => {
  const Logo = CustomIcons[logo];
  return (
    <View style={styles.wordmark}>
      {/* xMin, not the default xMid: the marks have different aspect ratios, so
          centring them inside a shared box would stagger their left edges down
          the list. */}
      <Logo
        width={WORDMARK_WIDTH}
        height={WORDMARK_HEIGHT}
        preserveAspectRatio="xMinYMid meet"
      />
    </View>
  );
};

type BlockchainSelectionContext = {
  walletType: HardwareOnboardingOption['walletType'];
  derivationTypes: HardwareOnboardingOption['derivationTypes'];
  device?: DeviceDescriptor;
};

export interface HwDeviceReadyParams {
  optionId: HardwareIntegrationId;
  walletType: HardwareOnboardingOption['walletType'];
  device?: DeviceDescriptor;
  derivationTypes: HardwareOnboardingOption['derivationTypes'];
  blockchainName: BlockchainName;
}

interface ConnectDeviceStepProps {
  onDeviceReady: (params: HwDeviceReadyParams) => void;
  onCancel: () => void;
  stepLabel?: string;
  stepProgress?: number;
  onBack?: () => void;
  /**
   * The device family, when the wallet being connected to already exists and
   * its type says which one. The brand list is then not a question worth
   * asking: the connector is resolved from the WALLET's type, so a different
   * brand picked here would not be honoured anyway — it would only let the user
   * pick wrong and reach a confusing failure. Omitted while ONBOARDING a new
   * hardware wallet, where the user genuinely is telling us what they own.
   */
  walletType?: HardwareOnboardingOption['walletType'];
  /**
   * A device problem raised AFTER this screen handed off — the destination
   * probe's, which sends the user back here rather than to a dead end. Shown
   * until the picker has an answer of its own from a fresh attempt.
   */
  carriedError?: string;
}

export const ConnectDeviceStep = ({
  carriedError,
  onDeviceReady,
  onCancel,
  stepLabel,
  stepProgress,
  onBack,
  walletType,
}: ConnectDeviceStepProps) => {
  const { t } = useTranslation();

  const allOnboardingOptions = useLoadModules('addons.loadOnboardingOptions');
  // Narrowed before the picker sees them, so device matching cannot resolve to
  // another family either.
  const loadedOnboardingOptions = useMemo(
    () =>
      walletType === undefined
        ? allOnboardingOptions
        : allOnboardingOptions?.map(group =>
            group.filter(
              option =>
                (option as HardwareOnboardingOption).walletType === walletType,
            ),
          ),
    [allOnboardingOptions, walletType],
  );
  const loadedHwBlockchainSupport = useLoadModules(
    'addons.loadHwBlockchainSupport',
  );
  const [requestHWConnection = requestHWConnectionFallback] =
    useLoadModules('addons.loadRequestHWConnections') || [];

  const handleProceed = useCallback(
    ({
      optionId,
      blockchainName,
      context,
    }: HwBlockchainSelectionProceedParams<BlockchainSelectionContext>) => {
      onDeviceReady({
        optionId,
        blockchainName,
        walletType: context.walletType,
        device: context.device,
        derivationTypes: context.derivationTypes,
      });
    },
    [onDeviceReady],
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

  // Both entry points — a matched USB device and an air-gapped option picked
  // from the list — narrow to Cardano and hand the same context on.
  const proceedWithOption = useCallback(
    (option: HardwareOnboardingOption, device?: DeviceDescriptor) => {
      chooseBlockchainOrProceed({
        blockchains: getHwBlockchainSupportForWalletType(
          loadedHwBlockchainSupport,
          option.walletType,
        ).filter(b => b.blockchainName === 'Cardano'),
        context: {
          walletType: option.walletType,
          derivationTypes: option.derivationTypes,
          device,
        },
      });
    },
    [loadedHwBlockchainSupport, chooseBlockchainOrProceed],
  );

  const handleDeviceError = useCallback((_category: HardwareErrorCategory) => {
    // Errors are displayed via the error state from the picker hook.
  }, []);

  const {
    supportedDevices,
    handleConnect: connectDevice,
    handleSelectDevice: selectDevice,
    isConnecting,
    error,
  } = useHwWalletDevicePicker<HardwareOnboardingOption>({
    loadedOnboardingOptions,
    requestHWConnection,
    onDeviceMatched: proceedWithOption,
    onDeviceError: handleDeviceError,
    onAirGappedSelected: proceedWithOption,
  });

  const isSupportLoaded = loadedHwBlockchainSupport !== undefined;

  // The single family this step is restricted to, once its options have
  // loaded — used to name the device in the copy instead of listing brands.
  const knownDevice =
    walletType !== undefined && supportedDevices.length === 1
      ? supportedDevices[0]
      : undefined;

  const connectInstructionKey =
    knownDevice?.logo === 'Ledger'
      ? 'migrate-wallet.connect-device.known-device-ledger'
      : 'migrate-wallet.connect-device.known-device';

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

  const handleBack = useCallback(() => {
    if (isSelectingBlockchain) {
      resetBlockchainSelection();
      return;
    }
    onCancel();
  }, [isSelectingBlockchain, resetBlockchainSelection, onCancel]);

  if (isSelectingBlockchain) {
    return (
      <WizardFrame
        stepLabel={stepLabel}
        stepProgress={stepProgress}
        title={t('migrate-wallet.connect-device.title')}
        backLabel={t('v2.generic.btn.back')}
        onBack={handleBack}
        secondaryLabel={t('app.cancel')}
        onSecondary={onCancel}
        testID="migrate-wallet-connect-device-blockchain">
        <Column gap={spacing.L}>
          <Text.S variant="tertiary" style={wizardText.smallLine}>
            {t('onboarding.hardware-wallet.select-blockchain.subtitle')}
          </Text.S>
          <Column gap={OPTION_CARD_GAP}>
            {blockchainDevices.map(device => {
              const logo = customIcon(device.logo);
              const Logo = logo && CustomIcons[logo];
              return (
                <WizardOptionCard
                  key={device.id}
                  title={device.name}
                  leading={Logo && <Logo width={24} height={24} />}
                  onPress={() => {
                    handleSelectBlockchain(device.id);
                  }}
                  testID={`migrate-wallet-blockchain-${device.id}`}
                />
              );
            })}
          </Column>
        </Column>
      </WizardFrame>
    );
  }

  if (isConnecting) {
    return (
      <WizardFrame
        stepLabel={stepLabel}
        stepProgress={stepProgress}
        title={t('migrate-wallet.connect-device.title')}
        backLabel={onBack ? t('migrate-wallet.nav.back') : undefined}
        onBack={onBack}
        secondaryLabel={t('app.cancel')}
        onSecondary={onCancel}
        testID="migrate-wallet-connect-device">
        <WaitingBlock
          messages={[t('migrate-wallet.connect-device.scanning')]}
        />
      </WizardFrame>
    );
  }

  return (
    <WizardFrame
      stepLabel={stepLabel}
      stepProgress={stepProgress}
      title={t('migrate-wallet.connect-device.title')}
      primaryLabel={
        supportedDevices.length > 0
          ? t('migrate-wallet.connect-device.connect')
          : undefined
      }
      onPrimary={supportedDevices.length > 0 ? handleConnect : undefined}
      primaryDisabled={!isSupportLoaded}
      backLabel={onBack ? t('migrate-wallet.nav.back') : undefined}
      onBack={onBack}
      secondaryLabel={t('app.cancel')}
      onSecondary={onCancel}
      testID="migrate-wallet-connect-device">
      <Column gap={spacing.L}>
        <Text.S variant="tertiary" style={wizardText.smallLine}>
          {/* Known family: the only thing left to do is plug it in, and the
              primary Connect button below is that one gesture. WebUSB needs a
              user gesture, so this cannot be done for them on mount. Ledger
              additionally needs the Cardano app open — the connect gesture
              succeeds without it, so this is the only place to say so. */}
          {knownDevice
            ? t(connectInstructionKey, { device: titleCase(knownDevice.name) })
            : t('onboarding.hardware-wallet.select-device')}
        </Text.S>
        <Column gap={OPTION_CARD_GAP}>
          {(knownDevice ? [] : supportedDevices).map(device => {
            const wordmark = customIcon(device.logo);
            return (
              <WizardOptionCard
                key={device.id}
                // The wordmark already spells the brand; printing the name
                // beside it would set the same word twice.
                title={wordmark ? undefined : titleCase(device.name)}
                accessibilityLabel={titleCase(device.name)}
                description={device.models.join(', ')}
                leading={wordmark && <DeviceWordmark logo={wordmark} />}
                onPress={() => {
                  handleSelectDevice(device.id);
                }}
                testID={`migrate-wallet-hw-${device.id}`}
              />
            );
          })}
        </Column>
        {/* The picker's own message, which names the problem — a locked
            device, an app that is not open — the way onboarding and
            add-account report it. */}
        {(error ?? carriedError) !== undefined && (
          <Text.S variant="negative" testID="migrate-wallet-hw-error">
            {error ?? carriedError}
          </Text.S>
        )}
      </Column>
    </WizardFrame>
  );
};

const WORDMARK_WIDTH = 92;
const WORDMARK_HEIGHT = 26;

const styles = StyleSheet.create({
  wordmark: {
    width: WORDMARK_WIDTH,
    height: WORDMARK_HEIGHT,
    justifyContent: 'center',
  },
});
