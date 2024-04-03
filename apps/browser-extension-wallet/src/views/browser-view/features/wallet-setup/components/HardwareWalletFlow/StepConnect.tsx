/* eslint-disable unicorn/no-null */
import { UseWalletManager, useWalletManager } from '@hooks';
import { Wallet } from '@lace/cardano';
import { WalletSetupConnectHardwareWalletStepRevamp } from '@lace/core';
import React, { useCallback, useEffect, useState, VFC } from 'react';
import { TFunction, useTranslation } from 'react-i18next';

export const isTrezorHWSupported = (): boolean => process.env.USE_TREZOR_HW === 'true';

type ConnectionError = 'userGestureRequired' | 'devicePickerRejected' | 'deviceLocked' | 'cardanoAppNotOpen';

const connectionSubtitleErrorTranslationsMap: Record<ConnectionError, string> = {
  cardanoAppNotOpen: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.cardanoAppNotOpen',
  deviceLocked: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.deviceLocked',
  devicePickerRejected: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.devicePickerRejected',
  userGestureRequired: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.userGestureRequired'
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
  if (error.message === 'Timeout. Connecting too long.') return 'deviceLocked';
  if (error.message.includes('Cannot communicate with Ledger Cardano App')) return 'cardanoAppNotOpen';
  return null;
};

const threeSecondsTimeout = 3000;
const useConnectHardwareWalletRevampedWithTimeout = (connect: UseWalletManager['connectHardwareWalletRevamped']) =>
  useCallback(
    async (usbDevice: USBDevice) => {
      const result = await Promise.race([
        connect(usbDevice),
        // eslint-disable-next-line promise/avoid-new
        new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), threeSecondsTimeout))
      ]);

      if (result === 'timeout') {
        throw new Error('Timeout. Connecting too long.');
      }

      return result;
    },
    [connect]
  );

type Props = {
  onBack: () => void;
  onConnected: (result?: Wallet.HardwareWalletConnection) => void;
  onUsbDeviceChange: (usbDevice: USBDevice) => void;
};

export const StepConnect: VFC<Props> = ({ onBack, onConnected, onUsbDeviceChange }) => {
  const { t } = useTranslation();
  const [discoveryState, setDiscoveryState] = useState<'idle' | 'requested' | 'running'>('requested');
  const [connectionError, setConnectionError] = useState<ConnectionError | null>(null);
  const { requestHardwareWalletConnection, connectHardwareWalletRevamped } = useWalletManager();

  const translations = makeTranslations({ connectionError, t });
  const connect = useConnectHardwareWalletRevampedWithTimeout(connectHardwareWalletRevamped);

  const onRetry = useCallback(() => {
    setDiscoveryState('requested');
    setConnectionError(null);
  }, []);

  useEffect(() => {
    (async () => {
      if (discoveryState !== 'requested') return;

      setDiscoveryState('running');
      let connectionResult: Wallet.HardwareWalletConnection;
      try {
        const usbDevice = await requestHardwareWalletConnection({ ledgerOnly: !isTrezorHWSupported() });
        onUsbDeviceChange(usbDevice);
        connectionResult = await connect(usbDevice);
        onConnected(connectionResult);
        setDiscoveryState('idle');
      } catch (error) {
        setDiscoveryState('idle');
        console.error('ERROR connecting hardware wallet', error);

        if (error.innerError?.innerError?.message === 'The device is already open.') {
          onConnected();
          return;
        }

        const parsedConnectionError = parseConnectionError(error);
        if (parsedConnectionError) setConnectionError(parsedConnectionError);
      }
    })();
  }, [connect, discoveryState, requestHardwareWalletConnection, onUsbDeviceChange, onConnected]);

  return (
    <WalletSetupConnectHardwareWalletStepRevamp
      onBack={onBack}
      translations={translations}
      state={discoveryState === 'idle' && !!connectionError ? 'error' : 'loading'}
      onRetry={connectionError ? onRetry : undefined}
    />
  );
};
