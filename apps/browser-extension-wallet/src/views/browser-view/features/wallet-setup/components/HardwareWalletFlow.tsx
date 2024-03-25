// / <reference types="w3c-web-hid" />
/* eslint-disable max-statements */
/* eslint-disable react/no-multi-comp */
import { useWalletManager, useTimeSpentOnPage, useLocalStorage } from '@hooks';
import { WalletSetupSelectAccountsStepRevamp, WalletSetupConnectHardwareWalletStepRevamp } from '@lace/core';
import React, { useState, useCallback, useEffect } from 'react';
import { Switch, Route, useHistory, useLocation, Redirect } from 'react-router-dom';
import { Wallet } from '@lace/cardano';
import { WalletSetupLayout } from '@src/views/browser-view/components/Layout';
import { ErrorDialog, HWErrorCode } from './ErrorDialog';
import { StartOverDialog } from '@views/browser/features/wallet-setup/components/StartOverDialog';
import { useTranslation } from 'react-i18next';
import { EnhancedAnalyticsOptInStatus, postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { config } from '@src/config';
import { walletRoutePaths } from '@routes/wallet-paths';
import { getHWPersonProperties, isTrezorHWSupported } from '../helpers';
import { useAnalyticsContext } from '@providers';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { SendOnboardingAnalyticsEvent } from '../types';
import { WalletType } from '@cardano-sdk/web-extension';

const { CHAIN } = config();
const { AVAILABLE_WALLETS } = Wallet;
export interface HardwareWalletFlowProps {
  onCancel: () => void;
  onAppReload: () => void;
  sendAnalytics: SendOnboardingAnalyticsEvent;
}

type HardwareWalletStep = 'connect' | 'setup';

const TOTAL_ACCOUNTS = 50;

const route = (path: string) => `${walletRoutePaths.setup.hardware}/${path}`;

export const HardwareWalletFlow = ({
  onCancel,
  onAppReload,
  sendAnalytics
}: HardwareWalletFlowProps): React.ReactElement => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();
  const [isErrorDialogVisible, setIsErrorDialogVisible] = useState(false);
  const [hardwareWalletErrorCode, setHardwareWalletErrorCode] = useState<HWErrorCode>('common');
  const [isStartOverDialogVisible, setIsStartOverDialogVisible] = useState(false);
  const showStartOverDialog = () => setIsStartOverDialogVisible(true);
  const [walletCreated, setWalletCreated] = useState<Wallet.CardanoWallet>();
  const [deviceConnection, setDeviceConnection] = useState<Wallet.DeviceConnection>();
  const [connectedDevice, setConnectedDevice] = useState<Wallet.HardwareWallets | undefined>();
  const [accountIndex, setAccountIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createHardwareWallet, connectHardwareWallet, saveHardwareWallet } = useWalletManager();
  const { updateEnteredAtTime } = useTimeSpentOnPage();
  const analytics = useAnalyticsContext();

  useEffect(() => {
    updateEnteredAtTime();
  }, [location.pathname, updateEnteredAtTime]);

  const showHardwareWalletError = (errorCode: HWErrorCode) => {
    setHardwareWalletErrorCode(errorCode);
    setIsErrorDialogVisible(true);
  };

  const walletSetupConnectHardwareWalletStepTranslations = {
    title: t('core.walletSetupConnectHardwareWalletStep.title'),
    subTitle: t(`core.walletSetupConnectHardwareWalletStep.${isTrezorHWSupported() ? 'subTitleFull' : 'subTitle'}`),
    supportedDevices: t(
      `core.walletSetupConnectHardwareWalletStep.${isTrezorHWSupported() ? 'supportedDevicesFull' : 'supportedDevices'}`
    ),
    connectDevice: t(
      `core.walletSetupConnectHardwareWalletStep.${isTrezorHWSupported() ? 'connectDeviceFull' : 'connectDevice'}`
    )
  };

  const navigateTo = useCallback(
    (nexthPath: string) => {
      history.replace(route(nexthPath));
    },
    [history]
  );

  const [enhancedAnalyticsStatus] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );

  const handleCreateWallet = async (name: string) => {
    try {
      const cardanoWallet = await createHardwareWallet({
        accountIndex,
        deviceConnection,
        name,
        connectedDevice
      });
      setWalletCreated(cardanoWallet);
    } catch (error) {
      console.error('ERROR creating hardware wallet', { error });
      showHardwareWalletError('common');
    }
  };

  const handleConnect = async (model: Wallet.HardwareWallets) => {
    try {
      const connection = await connectHardwareWallet(model);
      setDeviceConnection(connection);
      setConnectedDevice(model);
    } catch (error) {
      console.error('ERROR connecting hardware wallet', error);
      if (error.innerError?.innerError?.message === 'The device is already open.') {
        setDeviceConnection(deviceConnection);
      } else {
        showHardwareWalletError(model === WalletType.Trezor ? 'notDetectedTrezor' : 'notDetectedLedger');
      }
    }
  };

  const handleFinishCreation = () => saveHardwareWallet(walletCreated, CHAIN);

  const handleGoToMyWalletClick = async () => {
    try {
      const posthogProperties = await getHWPersonProperties(connectedDevice, deviceConnection);
      await sendAnalytics(postHogOnboardingActions.hw.DONE_GO_TO_WALLET, {
        ...posthogProperties,
        // eslint-disable-next-line camelcase
        $set: { wallet_accounts_quantity: '1' }
      });
    } catch {
      console.error('We were not able to send the analytics event');
    } finally {
      await handleFinishCreation();
      if (enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.OptedIn) {
        await analytics.sendAliasEvent();
      }

      // Check if app reloading workaround can be removed with this in LW-9970
      if (connectedDevice !== WalletType.Trezor && typeof deviceConnection === 'object') {
        deviceConnection.transport.close();
      }
    }
  };

  const onHardwareWalletDisconnect = useCallback((event: HIDConnectionEvent) => {
    if (event.device.opened) showHardwareWalletError('common');
  }, []);

  useEffect(() => {
    navigator.hid.addEventListener('disconnect', onHardwareWalletDisconnect);
    return () => {
      navigator.hid.removeEventListener('disconnect', onHardwareWalletDisconnect);
    };
  }, [onHardwareWalletDisconnect]);

  const handleEnterWallet = async (account: number, name: string) => {
    sendAnalytics(postHogOnboardingActions.hw.SETUP_HW_WALLET_NEXT_CLICK);
    setAccountIndex(account);
    setIsSubmitting(true);
    await handleCreateWallet(name);
    setIsSubmitting(false);
    await handleGoToMyWalletClick();
  };

  const hardwareWalletStepRenderFunctions: Record<HardwareWalletStep, () => JSX.Element> = {
    connect: () => (
      <WalletSetupConnectHardwareWalletStepRevamp
        wallets={AVAILABLE_WALLETS}
        onBack={onCancel}
        onConnect={handleConnect}
        onNext={() => {
          analytics.sendEventToPostHog(postHogOnboardingActions.hw.CONNECT_HW_NEXT_CLICK);
          navigateTo('setup');
        }}
        isNextEnable={!!deviceConnection}
        translations={walletSetupConnectHardwareWalletStepTranslations}
        isHardwareWallet
      />
    ),
    setup: () => (
      <WalletSetupSelectAccountsStepRevamp
        accounts={TOTAL_ACCOUNTS}
        isNextLoading={isSubmitting}
        onBack={showStartOverDialog}
        onSubmit={handleEnterWallet}
        wallet={connectedDevice}
      />
    )
  };

  const goBackToConnect = () => {
    /* eslint-disable unicorn/no-useless-undefined */
    setDeviceConnection(undefined);
    setConnectedDevice(undefined);
    setAccountIndex(0);
    setWalletCreated(undefined);
    history.replace(route('connect'));
  };

  const onRetry = () => {
    setIsErrorDialogVisible(false);
    goBackToConnect();
    // TODO: Remove this workaround with full app reload when SDK allows to connect Hardware Wallet for the 2nd time.
    onAppReload();
  };

  const handleStartOver = () => {
    setIsStartOverDialogVisible(false);
    goBackToConnect();
    // TODO: Remove this workaround with full app reload when SDK allows to connect Hardware Wallet for the 2nd time.
    onAppReload();
  };

  return (
    <>
      <ErrorDialog visible={isErrorDialogVisible} onRetry={onRetry} errorCode={hardwareWalletErrorCode} />
      <StartOverDialog
        visible={isStartOverDialogVisible}
        onStartOver={handleStartOver}
        onClose={() => setIsStartOverDialogVisible(false)}
      />
      <WalletSetupLayout>
        <Switch>
          <Route path={route('connect')}>{hardwareWalletStepRenderFunctions.connect()}</Route>
          <Route path={route('setup')}>{hardwareWalletStepRenderFunctions.setup()}</Route>
          <Redirect from="/" to={route('connect')} />
        </Switch>
      </WalletSetupLayout>
    </>
  );
};
