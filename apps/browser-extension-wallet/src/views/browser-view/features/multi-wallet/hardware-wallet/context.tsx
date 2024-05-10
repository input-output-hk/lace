/* eslint-disable unicorn/no-useless-undefined */
import { Wallet } from '@lace/cardano';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useWalletManager } from '@hooks';
import { Providers, ErrorDialogCode } from './types';
import { WalletConflictError, WalletType } from '@cardano-sdk/web-extension';
import { walletRoutePaths } from '@routes';
import { useWrapWithTimeout } from './useWrapWithTimeout';
import { postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { getWalletAccountsQtyString } from '@utils/get-wallet-count-string';
import { firstValueFrom } from 'rxjs';

type WalletData = {
  accountIndex: number;
  name: string;
};
type OnNameAndAccountChange = ({ accountIndex, name }: WalletData) => void;

interface State {
  back: () => void;
  next: () => void;
  connect: (usbDevice: USBDevice) => Promise<void>;
  onNameAndAccountChange: OnNameAndAccountChange;
  createWallet: () => Promise<void>;
  errorDialogCode: ErrorDialogCode;
  onErrorDialogRetry: () => void;
  isStartOverDialogVisible: boolean;
  onStartOverDialogAction: (confirmed: boolean) => void;
}

interface HardwareWalletProviderProps {
  children: (state: State) => React.ReactNode;
  providers: Providers;
}

// eslint-disable-next-line unicorn/no-null
const HardwareWalletContext = createContext<State>(null);

export const useHardwareWallet = (): State => {
  const state = useContext(HardwareWalletContext);
  if (state === null) throw new Error('HardwareWalletContext not defined');
  return state;
};

enum WalletConnectStep {
  Connect = 'Connect',
  Setup = 'Setup',
  Create = 'Create'
}

export const HardwareWalletProvider = ({ children, providers }: HardwareWalletProviderProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const history = useHistory();
  const { connectHardwareWalletRevamped, createHardwareWalletRevamped, saveHardwareWallet, walletRepository } =
    useWalletManager();
  const [step, setStep] = useState<WalletConnectStep>(WalletConnectStep.Connect);
  const [connectedUsbDevice, setConnectedUsbDevice] = useState<USBDevice>();
  const [errorDialogCode, setErrorDialogCode] = useState<ErrorDialogCode>();
  const [isStartOverDialogVisible, setIsStartOverDialogVisible] = useState(false);
  const [connection, setConnection] = useState<Wallet.HardwareWalletConnection>();
  const [walletData, setWalletData] = useState<WalletData>();

  useEffect(() => {
    (async () => {
      if (walletData?.name) return;
      const wallets = await firstValueFrom(walletRepository.wallets$);
      const name = `Wallet ${wallets.length + 1}`;
      setWalletData((prevState) => ({ ...prevState, name }));
    })();
  }, [walletData?.name, walletRepository]);

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

  const next = useCallback(() => {
    switch (step) {
      case WalletConnectStep.Connect: {
        setStep(WalletConnectStep.Setup);
        history.push(walletRoutePaths.newWallet.hardware.setup);
        providers.shouldShowConfirmationDialog$.next(true);
        break;
      }
      case WalletConnectStep.Setup: {
        setStep(WalletConnectStep.Create);
        history.push(walletRoutePaths.newWallet.hardware.create);
        break;
      }
      case WalletConnectStep.Create: {
        history.push(walletRoutePaths.assets);
        break;
      }
    }
  }, [history, providers.shouldShowConfirmationDialog$, step]);

  const back = useCallback(() => {
    switch (step) {
      case WalletConnectStep.Connect: {
        history.push(walletRoutePaths.newWallet.root);
        break;
      }
      case WalletConnectStep.Setup:
      case WalletConnectStep.Create: {
        if (isStartOverDialogVisible) {
          setStep(WalletConnectStep.Connect);
          history.push(walletRoutePaths.newWallet.hardware.connect);
          providers.shouldShowConfirmationDialog$.next(false);
        } else {
          setIsStartOverDialogVisible(true);
        }
        break;
      }
    }
  }, [history, isStartOverDialogVisible, providers.shouldShowConfirmationDialog$, step]);

  const closeConnection = useCallback(() => {
    if (connection.type === WalletType.Ledger) {
      void connection.value.transport.close();
    }
  }, [connection]);

  const cleanupConnectionState = useCallback(() => {
    setConnection(undefined);
    setStep(WalletConnectStep.Connect);
    history.push(walletRoutePaths.newWallet.hardware.connect);
    closeConnection();
  }, [closeConnection, history]);

  const onErrorDialogRetry = useCallback(() => {
    setErrorDialogCode(undefined);
    cleanupConnectionState();
  }, [cleanupConnectionState]);

  const onStartOverDialogAction = useCallback(
    (confirmed: boolean) => {
      if (confirmed) cleanupConnectionState();
      setIsStartOverDialogVisible(false);
    },
    [cleanupConnectionState]
  );

  const connectDevice = useWrapWithTimeout(connectHardwareWalletRevamped);

  const connect = useCallback(
    async (usbDevice: USBDevice) => {
      try {
        setConnectedUsbDevice(usbDevice);
        const connectionResult = await connectDevice(usbDevice);
        setConnection(connectionResult);
      } catch (error) {
        if (error.innerError?.innerError?.message !== 'The device is already open.') {
          throw error;
        }
      }
    },
    [connectDevice]
  );

  const onNameAndAccountChange: OnNameAndAccountChange = useCallback(({ accountIndex, name }) => {
    setWalletData({ accountIndex, name });
  }, []);

  const createWallet = useCallback(async () => {
    let cardanoWallet: Wallet.CardanoWallet;
    try {
      cardanoWallet = await createHardwareWalletRevamped({
        connection,
        ...walletData
      });
    } catch (error) {
      console.error('ERROR creating hardware wallet', { error });

      const walletDuplicatedError = error instanceof WalletConflictError;
      if (!walletDuplicatedError) {
        let errorCode: ErrorDialogCode = ErrorDialogCode.Generic;
        const ledgerPkRejection =
          error.message.includes('Failed to export extended account public key') &&
          error.message.includes('Action rejected by user');
        const trezorPkRejection = error.message.includes('Trezor transport failed');
        if (ledgerPkRejection || trezorPkRejection) {
          errorCode = ErrorDialogCode.PublicKeyExportRejected;
        }
        setErrorDialogCode(errorCode);
      }
      closeConnection();
      throw error;
    }

    const deviceSpec = await Wallet.getDeviceSpec(connection);
    await analytics.sendEventToPostHog(postHogMultiWalletActions.hw.WALLET_ADDED, {
      /* eslint-disable camelcase */
      $set_once: {
        initial_hardware_wallet_model: deviceSpec.model,
        initial_firmware_version: deviceSpec?.firmwareVersion,
        initial_cardano_app_version: deviceSpec?.cardanoAppVersion
      },
      $set: { wallet_accounts_quantity: await getWalletAccountsQtyString(walletRepository) }
      /* eslint-enable camelcase */
    });
    await analytics.sendMergeEvent(cardanoWallet.source.account.extendedAccountPublicKey);

    await saveHardwareWallet(cardanoWallet);
    await analytics.sendAliasEvent();
  }, [
    analytics,
    closeConnection,
    connection,
    createHardwareWalletRevamped,
    saveHardwareWallet,
    walletData,
    walletRepository
  ]);

  const value = useMemo<State>(
    () => ({
      back,
      next,
      connect,
      createWallet,
      onNameAndAccountChange,
      errorDialogCode,
      onErrorDialogRetry,
      isStartOverDialogVisible,
      onStartOverDialogAction
    }),
    [
      back,
      next,
      connect,
      createWallet,
      onNameAndAccountChange,
      errorDialogCode,
      onErrorDialogRetry,
      isStartOverDialogVisible,
      onStartOverDialogAction
    ]
  );

  return <HardwareWalletContext.Provider value={value}>{children(value)}</HardwareWalletContext.Provider>;
};
