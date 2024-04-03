/* eslint-disable unicorn/no-useless-undefined */
import { useLocalStorage, useTimeSpentOnPage, useWalletManager } from '@hooks';
import { WalletSetupCreationStep, WalletSetupSelectAccountsStepRevamp } from '@lace/core';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import { Wallet } from '@lace/cardano';
import { WalletSetupLayout } from '@src/views/browser-view/components/Layout';
import { makeErrorDialog } from './makeErrorDialog';
import { StartOverDialog } from '@views/browser/features/wallet-setup/components/StartOverDialog';
import { TFunction, useTranslation } from 'react-i18next';
import { EnhancedAnalyticsOptInStatus, postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { config } from '@src/config';
import { walletRoutePaths } from '@routes/wallet-paths';
import { useAnalyticsContext } from '@providers';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { StepConnect } from './StepConnect';
import { WalletType } from '@cardano-sdk/web-extension';

const { CHAIN } = config();
export interface HardwareWalletFlowProps {
  onCancel: () => void;
}

const TOTAL_ACCOUNTS = 50;
const route = (path: FlowStep) => `${walletRoutePaths.setup.hardware}/${path}`;

type FlowStep = 'connect' | 'setup' | 'create';
type ErrorDialogCode = 'deviceDisconnected' | 'publicKeyExportRejected';

const ErrorDialog = makeErrorDialog<ErrorDialogCode>({
  deviceDisconnected: {
    title: 'browserView.onboarding.errorDialog.title',
    confirm: 'browserView.onboarding.errorDialog.cta',
    description: 'browserView.onboarding.errorDialog.messageDeviceDisconnected'
  },
  publicKeyExportRejected: {
    title: 'browserView.onboarding.errorDialog.title',
    confirm: 'browserView.onboarding.errorDialog.cta',
    description: 'browserView.onboarding.errorDialog.messagePublicKeyExportRejected'
  }
});

const makeWalletSetupCreateStepTranslations = (t: TFunction) => ({
  title: t('core.walletSetupCreateStep.title'),
  description: t('core.walletSetupCreateStep.description')
});

export const HardwareWalletFlow = ({ onCancel }: HardwareWalletFlowProps): React.ReactElement => {
  const history = useHistory();
  const { t } = useTranslation();
  const [connectedUsbDevice, setConnectedUsbDevice] = useState<USBDevice>();
  const [errorDialogCode, setErrorDialogCode] = useState<ErrorDialogCode>();
  const [isStartOverDialogVisible, setIsStartOverDialogVisible] = useState(false);
  const [connection, setConnection] = useState<Wallet.HardwareWalletConnection>();
  const { createHardwareWalletRevamped, saveHardwareWallet } = useWalletManager();
  const { updateEnteredAtTime } = useTimeSpentOnPage();
  const analytics = useAnalyticsContext();

  const walletSetupCreateStepTranslations = useMemo(() => makeWalletSetupCreateStepTranslations(t), [t]);

  useEffect(() => {
    updateEnteredAtTime();
  }, [history.location.pathname, updateEnteredAtTime]);

  useEffect(() => {
    const onHardwareWalletDisconnect = (event: USBConnectionEvent) => {
      if (event.device !== connectedUsbDevice || !connection) return;
      setErrorDialogCode('deviceDisconnected');
    };

    navigator.usb.addEventListener('disconnect', onHardwareWalletDisconnect);
    return () => {
      navigator.usb.removeEventListener('disconnect', onHardwareWalletDisconnect);
    };
  }, [connectedUsbDevice, connection]);

  const navigateTo = useCallback(
    (nexthPath: FlowStep) => {
      history.replace(route(nexthPath));
    },
    [history]
  );

  const onConnected = useCallback(
    (result?: Wallet.HardwareWalletConnection) => {
      if (result) {
        setConnection(result);
      }
      navigateTo('setup');
    },
    [navigateTo]
  );

  const [enhancedAnalyticsStatus] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );

  const handleCreateWallet = async (accountIndex: number, name: string) => {
    void analytics.sendEventToPostHog(postHogOnboardingActions.hw.SETUP_HW_WALLET_NEXT_CLICK);
    navigateTo('create');

    let cardanoWallet: Wallet.CardanoWallet;
    try {
      cardanoWallet = await createHardwareWalletRevamped({
        accountIndex,
        connection,
        name
      });
    } catch (error) {
      console.error('ERROR creating hardware wallet', { error });
      setErrorDialogCode('publicKeyExportRejected');
      throw error;
    }

    const deviceSpec = await Wallet.getDeviceSpec(connection);
    await analytics.sendEventToPostHog(postHogOnboardingActions.hw.DONE_GO_TO_WALLET, {
      /* eslint-disable camelcase */
      $set_once: {
        initial_hardware_wallet_model: deviceSpec.model,
        initial_firmware_version: deviceSpec?.firmwareVersion,
        initial_cardano_app_version: deviceSpec?.cardanoAppVersion
      },
      $set: { wallet_accounts_quantity: '1' }
      /* eslint-enable camelcase */
    });

    await saveHardwareWallet(cardanoWallet, CHAIN);
    if (enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.OptedIn) {
      await analytics.sendAliasEvent();
    }

    if (connection.type === WalletType.Ledger) {
      void connection.value.transport.close();
    }
  };

  const onRetry = () => {
    setErrorDialogCode(undefined);
    setConnection(undefined);
    navigateTo('connect');
  };

  const handleStartOver = () => {
    setIsStartOverDialogVisible(false);
    setConnection(undefined);
    navigateTo('connect');
  };

  return (
    <>
      {!!errorDialogCode && <ErrorDialog visible onRetry={onRetry} errorCode={errorDialogCode} />}
      <StartOverDialog
        visible={isStartOverDialogVisible}
        onStartOver={handleStartOver}
        onClose={() => setIsStartOverDialogVisible(false)}
      />
      <WalletSetupLayout>
        <Switch>
          <Route path={route('connect')}>
            <StepConnect onBack={onCancel} onConnected={onConnected} onUsbDeviceChange={setConnectedUsbDevice} />
          </Route>
          {!!connection && (
            <>
              <Route path={route('setup')}>
                <WalletSetupSelectAccountsStepRevamp
                  accounts={TOTAL_ACCOUNTS}
                  onBack={() => setIsStartOverDialogVisible(true)}
                  onSubmit={handleCreateWallet}
                />
              </Route>
              <Route path={route('create')}>
                <WalletSetupCreationStep translations={walletSetupCreateStepTranslations} isHardwareWallet />
              </Route>
            </>
          )}
          <Redirect from="/" to={route('connect')} />
        </Switch>
      </WalletSetupLayout>
    </>
  );
};
