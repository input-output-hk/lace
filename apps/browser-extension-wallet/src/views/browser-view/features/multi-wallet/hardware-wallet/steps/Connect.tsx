/* eslint-disable unicorn/no-null */
import { Wallet } from '@lace/cardano';
import { ConnectionError, parseConnectionError, WalletSetupConnectHardwareWalletStepRevamp } from '@lace/core';
import { TranslationKey } from '@lace/translation';
import { TFunction } from 'i18next';
import React, { useCallback, useEffect, useState, VFC } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import { useHardwareWallet } from '../context';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { logger } from '@lace/common';

export const isTrezorHWSupported = (): boolean => process.env.USE_TREZOR_HW === 'true';

const requestHardwareWalletConnection = (): Promise<USBDevice> =>
  navigator.usb.requestDevice({
    filters: isTrezorHWSupported() ? Wallet.supportedHwUsbDescriptors : Wallet.ledgerDescriptors
  });

const connectionSubtitleErrorTranslationsMap: Partial<Record<ConnectionError, TranslationKey>> = {
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

enum DiscoveryState {
  Idle = 'Idle',
  Requested = 'Requested',
  Running = 'Running'
}

export const Connect: VFC = () => {
  const { t } = useTranslation();
  const { postHogActions } = useWalletOnboarding();
  const { back, connect, next } = useHardwareWallet();
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>(DiscoveryState.Requested);
  const [connectionError, setConnectionError] = useState<ConnectionError | null>(null);
  const analytics = useAnalyticsContext();

  const translations = makeTranslations({ connectionError, t });

  const onRetry = useCallback(() => {
    setDiscoveryState(DiscoveryState.Requested);
    setConnectionError(null);
    void analytics.sendEventToPostHog(postHogActions.hardware.CONNECT_HW_TRY_AGAIN_CLICK);
  }, [analytics, postHogActions.hardware.CONNECT_HW_TRY_AGAIN_CLICK]);

  useEffect(() => {
    (async () => {
      if (discoveryState !== DiscoveryState.Requested) return;

      setDiscoveryState(DiscoveryState.Running);
      try {
        void analytics.sendEventToPostHog(postHogActions.hardware.CONNECT_HW_VIEW);
        const usbDevice = await requestHardwareWalletConnection();
        void analytics.sendEventToPostHog(postHogActions.hardware.HW_POPUP_CONNECT_CLICK);
        await connect(usbDevice);
        setDiscoveryState(DiscoveryState.Idle);
        next();
      } catch (error) {
        setDiscoveryState(DiscoveryState.Idle);
        logger.error('ERROR connecting hardware wallet', error);
        setConnectionError(parseConnectionError(error));
      }
    })();
  }, [connect, discoveryState, analytics, next, postHogActions.hardware]);

  return (
    <WalletSetupConnectHardwareWalletStepRevamp
      onBack={back}
      translations={translations}
      state={discoveryState === DiscoveryState.Idle && !!connectionError ? 'error' : 'loading'}
      onRetry={connectionError ? onRetry : undefined}
    />
  );
};
