// / <reference types="w3c-web-hid" />
/* eslint-disable max-statements */
/* eslint-disable react/no-multi-comp */
import { useWalletManager, useTimeSpentOnPage, useLocalStorage } from '@hooks';
import {
  WalletSetupAnalyticsStep,
  WalletSetupCreationStep,
  WalletSetupLegalStep,
  WalletSetupFinalStep,
  WalletSetupConnectHardwareWalletStep,
  WalletSetupSelectAccountsStep,
  WalletSetupWalletNameStep
} from '@lace/core';
import React, { useState, useCallback, useEffect } from 'react';
import { Switch, Route, useHistory, useLocation } from 'react-router-dom';
import { Wallet } from '@lace/cardano';
import { WalletSetupLayout } from '@src/views/browser-view/components/Layout';
import { PinExtension } from './PinExtension';
import { ErrorDialog } from './ErrorDialog';
import { StartOverDialog } from '@views/browser/features/wallet-setup/components/StartOverDialog';
import { useTranslation } from 'react-i18next';
import { AnalyticsConsentStatus, AnalyticsEventNames } from '@providers/AnalyticsProvider/analyticsTracker';
import { config } from '@src/config';
import { walletRoutePaths } from '@routes/wallet-paths';
import { isTrezorHWSupported } from '../helpers';
import { useAnalyticsContext } from '@providers';
import { ANALYTICS_ACCEPTANCE_LS_KEY } from '@providers/AnalyticsProvider/analyticsTracker/config';

const { WalletSetup: Events } = AnalyticsEventNames;

const { CHAIN } = config();
const {
  Cardano: { ChainIds },
  AVAILABLE_WALLETS
} = Wallet;
const DEFAULT_CHAIN_ID = ChainIds[CHAIN];

export interface HardwareWalletFlowProps {
  onCancel: () => void;
  onAppReload: () => void;
  sendAnalytics: (eventName: string, value?: number) => void;
}

type HardwareWalletStep = 'legal' | 'analytics' | 'connect' | 'accounts' | 'register' | 'create' | 'finish';

const TOTAL_ACCOUNTS = 50;

const route = (path: string) => `${walletRoutePaths.setup.hardware}/${path}`;

type HWErrorCode = 'common' | 'notDetected';

export const HardwareWalletFlow = ({
  onCancel,
  onAppReload,
  sendAnalytics
}: HardwareWalletFlowProps): React.ReactElement => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();
  const [isAnalyticsAccepted, setSsAnalyticsAccepted] = useState(false);
  const [isErrorDialogVisible, setIsErrorDialogVisible] = useState(false);
  const [hardwareWalletErrorCode, setHardwareWalletErrorCode] = useState<HWErrorCode>('common');
  const [isStartOverDialogVisible, setIsStartOverDialogVisible] = useState(false);
  const showStartOverDialog = () => setIsStartOverDialogVisible(true);
  const [walletCreated, setWalletCreated] = useState<Wallet.CardanoWalletByChain>();
  const [deviceConnection, setDeviceConnection] = useState<Wallet.DeviceConnection>();
  const [connectedDevice, setConnectedDevice] = useState<Wallet.HardwareWallets | undefined>();
  const [accountIndex, setAccountIndex] = useState<number>(0);
  const { createHardwareWallet, connectHardwareWallet, saveHardwareWallet } = useWalletManager();
  const { calculateTimeSpentOnPage, updateEnteredAtTime } = useTimeSpentOnPage();
  const analytics = useAnalyticsContext();

  useEffect(() => {
    updateEnteredAtTime();
  }, [location.pathname, updateEnteredAtTime]);

  const showHardwareWalletError = (errorCode: HWErrorCode) => {
    setHardwareWalletErrorCode(errorCode);
    setIsErrorDialogVisible(true);
  };

  const walletSetupLegalStepTranslations = {
    title: t('core.walletSetupLegalStep.title'),
    toolTipText: t('core.walletSetupLegalStep.toolTipText')
  };

  const walletSetupAnalyticsStepTranslations = {
    back: t('core.walletSetupAnalyticsStep.back'),
    agree: t('core.walletSetupAnalyticsStep.agree'),
    title: t('core.walletSetupAnalyticsStep.title'),
    description: t('core.walletSetupAnalyticsStep.description'),
    optionsTitle: t('core.walletSetupAnalyticsStep.optionsTitle'),
    allowOptout: t('core.walletSetupAnalyticsStep.allowOptout'),
    privacyPolicy: t('core.walletSetupAnalyticsStep.privacyPolicy'),
    collectPrivateKeys: t('core.walletSetupAnalyticsStep.collectPrivateKeys'),
    collectIp: t('core.walletSetupAnalyticsStep.collectIp'),
    personalData: t('core.walletSetupAnalyticsStep.personalData')
  };

  const walletSetupConnectHardwareWalletStepTranslations = {
    title: t('core.walletSetupConnectHardwareWalletStep.title'),
    subTitle: t('core.walletSetupConnectHardwareWalletStep.subTitle'),
    supportedDevices: t(
      `core.walletSetupConnectHardwareWalletStep.${isTrezorHWSupported() ? 'supportedDevicesFull' : 'supportedDevices'}`
    ),
    connectDevice: t('core.walletSetupConnectHardwareWalletStep.connectDevice')
  };

  const walletSetupFinalStepTranslations = {
    title: t('core.walletSetupFinalStep.title'),
    description: t('core.walletSetupFinalStep.description'),
    close: t('core.walletSetupFinalStep.close'),
    followTwitter: t('core.walletSetupFinalStep.followTwitter'),
    followYoutube: t('core.walletSetupFinalStep.followYoutube'),
    followDiscord: t('core.walletSetupFinalStep.followDiscord')
  };

  const walletSetupCreateStepTranslations = {
    title: t('core.walletSetupCreateStep.title'),
    description: t('core.walletSetupCreateStep.description')
  };

  const walletSetupWalletNameStepTranslations = {
    maxCharacters: t('core.walletSetupWalletNameStep.maxCharacters'),
    walletName: t('core.walletSetupWalletNameStep.walletName'),
    nameYourWallet: t('core.walletSetupWalletNameStep.nameYourWallet'),
    create: t('core.walletSetupWalletNameStep.create'),
    chooseName: t('core.walletSetupWalletNameStep.chooseName')
  };

  const navigateTo = useCallback(
    (nexthPath: string) => {
      history.replace(route(nexthPath));
    },
    [history]
  );

  const [, { updateLocalStorage: setDoesUserAllowAnalytics }] = useLocalStorage(
    ANALYTICS_ACCEPTANCE_LS_KEY,
    AnalyticsConsentStatus.REJECTED
  );

  const handleAnalyticsChoice = (isAccepted: boolean) => {
    setSsAnalyticsAccepted(isAccepted);
    analytics.toogleCookies(isAccepted);
    sendAnalytics(isAccepted ? Events.ANALYTICS_AGREE : Events.ANALYTICS_SKIP);
    navigateTo('connect');
  };

  const handleCreateWallet = async (name: string) => {
    try {
      const wallet = await createHardwareWallet({
        accountIndex,
        deviceConnection,
        name,
        chainId: DEFAULT_CHAIN_ID,
        connectedDevice
      });
      setWalletCreated(wallet);
      setDoesUserAllowAnalytics(
        isAnalyticsAccepted ? AnalyticsConsentStatus.ACCEPTED : AnalyticsConsentStatus.REJECTED
      );
      navigateTo('finish');
    } catch (error) {
      console.log('ERROR creating hardware wallet', { error });
      showHardwareWalletError('common');
    }
  };

  const handleConnect = async (model: Wallet.HardwareWallets) => {
    try {
      const connection = await connectHardwareWallet(model);
      setDeviceConnection(connection);
      setConnectedDevice(model);
    } catch (error) {
      console.log('ERROR connecting hardware wallet', error);
      if (error.innerError?.innerError?.message === 'The device is already open.') {
        setDeviceConnection(deviceConnection);
      } else {
        showHardwareWalletError('notDetected');
      }
    }
  };

  const handleFinishCreation = () => saveHardwareWallet(walletCreated, CHAIN);

  const onHardwareWalletDisconnect = useCallback((event: HIDConnectionEvent) => {
    if (event.device.opened) showHardwareWalletError('common');
  }, []);

  useEffect(() => {
    navigator.hid.addEventListener('disconnect', onHardwareWalletDisconnect);
    return () => {
      navigator.hid.removeEventListener('disconnect', onHardwareWalletDisconnect);
    };
  }, [onHardwareWalletDisconnect]);

  const hardwareWalletStepRenderFunctions: Record<HardwareWalletStep, () => JSX.Element> = {
    legal: () => (
      <WalletSetupLegalStep
        onBack={() => onCancel()}
        onNext={() => {
          sendAnalytics(Events.LEGAL_STUFF_NEXT, calculateTimeSpentOnPage());
          navigateTo('analytics');
        }}
        translations={walletSetupLegalStepTranslations}
        isHardwareWallet
      />
    ),
    analytics: () => (
      <WalletSetupAnalyticsStep
        onDeny={() => handleAnalyticsChoice(false)}
        onAccept={() => handleAnalyticsChoice(true)}
        onBack={() => navigateTo('legal')}
        translations={walletSetupAnalyticsStepTranslations}
        isHardwareWallet
      />
    ),
    connect: () => (
      <WalletSetupConnectHardwareWalletStep
        wallets={AVAILABLE_WALLETS}
        onBack={() => navigateTo('analytics')}
        onConnect={handleConnect}
        onNext={() => {
          sendAnalytics(Events.SELECT_MODEL_NEXT);
          navigateTo('accounts');
        }}
        isNextEnable={!!deviceConnection}
        translations={walletSetupConnectHardwareWalletStepTranslations}
        isHardwareWallet
      />
    ),
    accounts: () => (
      <WalletSetupSelectAccountsStep
        accounts={TOTAL_ACCOUNTS}
        onBack={showStartOverDialog}
        onSubmit={(account: number) => {
          sendAnalytics(Events.SELECT_ACCOUNT_NEXT);
          setAccountIndex(account);
          navigateTo('register');
        }}
        wallet={connectedDevice}
      />
    ),
    register: () => (
      <WalletSetupWalletNameStep
        onBack={showStartOverDialog}
        onNext={(name: string) => {
          sendAnalytics(Events.WALLET_NAME_NEXT);
          handleCreateWallet(name);
          navigateTo('create');
        }}
        translations={walletSetupWalletNameStepTranslations}
        isHardwareWallet
      />
    ),
    create: () => <WalletSetupCreationStep translations={walletSetupCreateStepTranslations} isHardwareWallet />,
    finish: () => (
      <WalletSetupFinalStep
        onFinish={async () => {
          sendAnalytics(Events.SETUP_FINISHED_NEXT);
          await handleFinishCreation();
          // Workaround to enable staking with Ledger right after the onboarding LW-5564
          window.location.reload();
        }}
        onRender={() => navigator.hid.removeEventListener('disconnect', onHardwareWalletDisconnect)}
        translations={walletSetupFinalStepTranslations}
        isHardwareWallet
      />
    )
  };

  const goBackToConnect = () => {
    /* eslint-disable unicorn/no-useless-undefined */
    setDeviceConnection(undefined);
    setConnectedDevice(undefined);
    setAccountIndex(0);
    setWalletCreated(undefined);
    /* eslint-enable unicorn/no-useless-undefined */
    history.replace(route('connect'));
  };

  const onRetry = () => {
    setIsErrorDialogVisible(false);
    goBackToConnect();
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
      <WalletSetupLayout prompt={location.pathname.endsWith('finish') ? <PinExtension /> : undefined}>
        <Switch>
          <Route path={route('analytics')}>{hardwareWalletStepRenderFunctions.analytics()}</Route>
          <Route path={route('connect')}>{hardwareWalletStepRenderFunctions.connect()}</Route>
          <Route path={route('accounts')}>{hardwareWalletStepRenderFunctions.accounts()}</Route>
          <Route path={route('register')}>{hardwareWalletStepRenderFunctions.register()}</Route>
          <Route path={route('create')}>{hardwareWalletStepRenderFunctions.create()}</Route>
          <Route path={route('finish')}>{hardwareWalletStepRenderFunctions.finish()}</Route>
          <Route>{hardwareWalletStepRenderFunctions.legal()}</Route>
        </Switch>
      </WalletSetupLayout>
    </>
  );
};
