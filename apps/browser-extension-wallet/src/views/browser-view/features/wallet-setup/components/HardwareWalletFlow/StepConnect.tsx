/* eslint-disable unicorn/no-null */
import { UseWalletManager, useWalletManager } from '@hooks';
import { Wallet } from '@lace/cardano';
import { WalletSetupConnectHardwareWalletStepRevamp } from '@lace/core';
import type { TranslationKey } from '@lace/translation';
import { TFunction } from 'i18next';
import React, { useCallback, useEffect, useState, VFC } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import { postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';

export const isTrezorHWSupported = (): boolean => process.env.USE_TREZOR_HW === 'true';

const requestHardwareWalletConnection = (): Promise<USBDevice> =>
  navigator.usb.requestDevice({
    filters: isTrezorHWSupported() ? Wallet.supportedHwUsbDescriptors : Wallet.ledgerDescriptors
  });

const threeSecondsTimeout = 3000;
const timeoutErrorMessage = 'Timeout. Connecting too long.';

const isTimeoutError = (error: Error): boolean => error.message === timeoutErrorMessage;

const useConnectHardwareWalletWithTimeout = (connect: UseWalletManager['connectHardwareWalletRevamped']) =>
  useCallback(
    async (usbDevice: USBDevice) => {
      const result = await Promise.race([
        connect(usbDevice),
        new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), threeSecondsTimeout))
      ]);

      if (result === 'timeout') {
        throw new Error(timeoutErrorMessage);
      }

      return result;
    },
    [connect]
  );

type ConnectionError =
  | 'userGestureRequired'
  | 'devicePickerRejected'
  | 'deviceLocked'
  | 'deviceBusy'
  | 'cardanoAppNotOpen'
  | 'generic';

const connectionSubtitleErrorTranslationsMap: Record<ConnectionError, TranslationKey> = {
  cardanoAppNotOpen: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.cardanoAppNotOpen',
  deviceLocked: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.deviceLocked',
  deviceBusy: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.deviceBusy',
  devicePickerRejected: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.devicePickerRejected',
  userGestureRequired: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.userGestureRequired',
  generic: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.generic'
};

const makeTranslations = ({ connectionError, t }: { connectionError: ConnectionError; t: TFunction }) => ({
  title: t('core.walletSetupConnectHardwareWalletStepRevamp.title'),
  subTitle: isTrezorHWSupported()
    ? t('core.walletSetupConnectHardwareWalletStepRevamp.subTitle')
    : t('core.walletSetupConnectHardwareWalletStepRevamp.subTitleLedgerOnly'),
  errorMessage: connectionError ? t(connectionSubtitleErrorTranslationsMap[connectionError]) : '',
  errorCta: t('core.walletSetupConnectHardwareWalletStepRevamp.errorCta')
});

const parseConnectionError = (error: Error): ConnectionError | null => {
  if (error instanceof DOMException) {
    if (error.message.includes('user gesture')) return 'userGestureRequired';
    if (error.message.includes('No device selected')) return 'devicePickerRejected';
  }
  if (isTimeoutError(error)) return 'deviceBusy';
  if (error.message.includes('Cannot communicate with Ledger Cardano App')) {
    if (error.message.includes('General error 0x5515')) return 'deviceLocked';
    if (error.message.includes('General error 0x6e01')) return 'cardanoAppNotOpen';
  }
  return 'generic';
};

enum DiscoveryState {
  Idle = 'Idle',
  Requested = 'Requested',
  Running = 'Running'
}

type StepConnectProps = {
  onBack: () => void;
  onConnected: (result?: Wallet.HardwareWalletConnection) => void;
  onUsbDeviceChange: (usbDevice: USBDevice) => void;
};

export const StepConnect: VFC<StepConnectProps> = ({ onBack, onConnected, onUsbDeviceChange }) => {
  const { t } = useTranslation();
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>(DiscoveryState.Requested);
  const [connectionError, setConnectionError] = useState<ConnectionError | null>(null);
  const { connectHardwareWalletRevamped } = useWalletManager();
  const analytics = useAnalyticsContext();

  const translations = makeTranslations({ connectionError, t });
  const connect = useConnectHardwareWalletWithTimeout(connectHardwareWalletRevamped);

  const onRetry = useCallback(() => {
    setDiscoveryState(DiscoveryState.Requested);
    setConnectionError(null);
    void analytics.sendEventToPostHog(postHogOnboardingActions.hw?.CONNECT_HW_TRY_AGAIN_CLICK);
  }, [analytics]);

  useEffect(() => {
    (async () => {
      if (discoveryState !== DiscoveryState.Requested) return;

      setDiscoveryState(DiscoveryState.Running);
      let connectionResult: Wallet.HardwareWalletConnection;
      try {
        void analytics.sendEventToPostHog(postHogOnboardingActions.hw?.CONNECT_HW_VIEW);
        const usbDevice = await requestHardwareWalletConnection();
        onUsbDeviceChange(usbDevice);
        connectionResult = await connect(usbDevice);
        onConnected(connectionResult);
        void analytics.sendEventToPostHog(postHogOnboardingActions.hw?.HW_POPUP_CONNECT_CLICK);
        setDiscoveryState(DiscoveryState.Idle);
      } catch (error) {
        setDiscoveryState(DiscoveryState.Idle);
        console.error('ERROR connecting hardware wallet', error);

        if (error.innerError?.innerError?.message === 'The device is already open.') {
          onConnected();
          return;
        }

        setConnectionError(parseConnectionError(error));
      }
    })();
  }, [connect, discoveryState, onUsbDeviceChange, onConnected, analytics]);

  return (
    <WalletSetupConnectHardwareWalletStepRevamp
      onBack={onBack}
      translations={translations}
      state={discoveryState === DiscoveryState.Idle && !!connectionError ? 'error' : 'loading'}
      onRetry={connectionError ? onRetry : undefined}
    />
  );
};
