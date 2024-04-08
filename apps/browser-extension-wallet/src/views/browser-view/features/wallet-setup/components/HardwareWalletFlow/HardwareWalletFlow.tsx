/* eslint-disable unicorn/no-useless-undefined */
import { useTimeSpentOnPage } from '@hooks';
import { WalletSetupSelectAccountsStepRevamp } from '@lace/core';
import React, { useCallback, useEffect, useState } from 'react';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import { Wallet } from '@lace/cardano';
import { WalletSetupLayout } from '@src/views/browser-view/components/Layout';
import { makeErrorDialog } from './makeErrorDialog';
import { StartOverDialog } from '@views/browser/features/wallet-setup/components/StartOverDialog';
import { walletRoutePaths } from '@routes/wallet-paths';
import { StepConnect } from './StepConnect';
import { WalletType } from '@cardano-sdk/web-extension';
import { StepCreate, WalletData } from './StepCreate';

export interface HardwareWalletFlowProps {
  onCancel: () => void;
}

const TOTAL_ACCOUNTS = 50;
const route = (path: FlowStep) => `${walletRoutePaths.setup.hardware}/${path}`;

enum FlowStep {
  Connect = 'Connect',
  Setup = 'Setup',
  Create = 'Create'
}

enum ErrorDialogCode {
  DeviceDisconnected = 'DeviceDisconnected',
  PublicKeyExportRejected = 'PublicKeyExportRejected',
  Generic = 'Generic'
}

const commonErrorDialogTranslationKeys = {
  title: 'browserView.onboarding.errorDialog.title',
  confirm: 'browserView.onboarding.errorDialog.cta'
};
const ErrorDialog = makeErrorDialog<ErrorDialogCode>({
  [ErrorDialogCode.DeviceDisconnected]: {
    ...commonErrorDialogTranslationKeys,
    description: 'browserView.onboarding.errorDialog.messageDeviceDisconnected'
  },
  [ErrorDialogCode.PublicKeyExportRejected]: {
    ...commonErrorDialogTranslationKeys,
    description: 'browserView.onboarding.errorDialog.messagePublicKeyExportRejected'
  },
  [ErrorDialogCode.Generic]: {
    ...commonErrorDialogTranslationKeys,
    description: 'browserView.onboarding.errorDialog.messageGeneric'
  }
});

export const HardwareWalletFlow = ({ onCancel }: HardwareWalletFlowProps): React.ReactElement => {
  const history = useHistory();
  const [connectedUsbDevice, setConnectedUsbDevice] = useState<USBDevice>();
  const [errorDialogCode, setErrorDialogCode] = useState<ErrorDialogCode>();
  const [isStartOverDialogVisible, setIsStartOverDialogVisible] = useState(false);
  const [connection, setConnection] = useState<Wallet.HardwareWalletConnection>();
  const [walletData, setWalletData] = useState<WalletData>();
  const { updateEnteredAtTime } = useTimeSpentOnPage();

  useEffect(() => {
    updateEnteredAtTime();
  }, [history.location.pathname, updateEnteredAtTime]);

  useEffect(() => {
    const onHardwareWalletDisconnect = (event: USBConnectionEvent) => {
      if (event.device !== connectedUsbDevice || !connection) return;
      setErrorDialogCode(ErrorDialogCode.DeviceDisconnected);
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
      navigateTo(FlowStep.Setup);
    },
    [navigateTo]
  );

  const closeConnection = () => {
    if (connection.type === WalletType.Ledger) {
      void connection.value.transport.close();
    }
  };

  const onAccountAndNameSubmit = async (accountIndex: number, name: string) => {
    setWalletData({
      accountIndex,
      name
    });
    navigateTo(FlowStep.Create);
  };

  const cleanupConnectionState = () => {
    setConnection(undefined);
    navigateTo(FlowStep.Connect);
    closeConnection();
  };

  const onRetry = () => {
    setErrorDialogCode(undefined);
    cleanupConnectionState();
  };

  const handleStartOver = () => {
    setIsStartOverDialogVisible(false);
    cleanupConnectionState();
  };

  const onWalletCreateError = (error: Error) => {
    let errorCode: ErrorDialogCode = ErrorDialogCode.Generic;

    const ledgerPkRejection =
      error.message.includes('Failed to export extended account public key') &&
      error.message.includes('Action rejected by user');
    const trezorPkRejection = error.message.includes('Trezor transport failed');
    if (ledgerPkRejection || trezorPkRejection) {
      errorCode = ErrorDialogCode.PublicKeyExportRejected;
    }

    setErrorDialogCode(errorCode);
    closeConnection();
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
          <Route path={route(FlowStep.Connect)}>
            <StepConnect onBack={onCancel} onConnected={onConnected} onUsbDeviceChange={setConnectedUsbDevice} />
          </Route>
          {!!connection && (
            <>
              <Route path={route(FlowStep.Setup)}>
                <WalletSetupSelectAccountsStepRevamp
                  accounts={TOTAL_ACCOUNTS}
                  onBack={() => setIsStartOverDialogVisible(true)}
                  onSubmit={onAccountAndNameSubmit}
                />
              </Route>
              <Route path={route(FlowStep.Create)}>
                <StepCreate connection={connection} onError={onWalletCreateError} walletData={walletData} />
              </Route>
            </>
          )}
          <Redirect from="/" to={route(FlowStep.Connect)} />
        </Switch>
      </WalletSetupLayout>
    </>
  );
};
