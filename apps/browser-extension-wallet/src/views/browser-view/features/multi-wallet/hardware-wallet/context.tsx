/* eslint-disable unicorn/no-useless-undefined */
import { Wallet } from '@lace/cardano';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useWalletManager } from '@hooks';
import { ErrorDialogCode, WalletConnectStep } from './types';
import { WalletConflictError, WalletType } from '@cardano-sdk/web-extension';
import { walletRoutePaths } from '@routes';
import { useWrapWithTimeout } from './useWrapWithTimeout';
import { useAnalyticsContext } from '@providers';
import { getWalletAccountsQtyString } from '@utils/get-wallet-count-string';
import { firstValueFrom } from 'rxjs';
import { isHdWallet } from '../isHdWallet';
import { useWalletOnboarding } from '../walletOnboardingContext';

type WalletData = {
  accountIndex: number;
  name: string;
};
type OnNameAndAccountChange = ({ accountIndex, name }: WalletData) => void;

interface State {
  back: () => void;
  connect: (usbDevice: USBDevice) => Promise<void>;
  createWallet: () => Promise<void>;
  errorDialogCode: ErrorDialogCode;
  isStartOverDialogVisible: boolean;
  next: () => void;
  onErrorDialogRetry: () => void;
  onNameAndAccountChange: OnNameAndAccountChange;
  onStartOverDialogAction: (confirmed: boolean) => void;
  step: WalletConnectStep;
}

interface HardwareWalletProviderProps {
  children: (state: State) => React.ReactNode;
}

// eslint-disable-next-line unicorn/no-null
const HardwareWalletContext = createContext<State>(null);

export const useHardwareWallet = (): State => {
  const state = useContext(HardwareWalletContext);
  if (state === null) throw new Error('HardwareWalletContext not defined');
  return state;
};

export const HardwareWalletProvider = ({ children }: HardwareWalletProviderProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const history = useHistory();
  const { aliasEventRequired, mergeEventRequired } = useWalletOnboarding();
  const { postHogActions, setFormDirty } = useWalletOnboarding();
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

  const closeConnection = useCallback(() => {
    if (connection.type === WalletType.Ledger) {
      void connection.value.transport.close();
    }
  }, [connection]);

  const next = useCallback(() => {
    switch (step) {
      case WalletConnectStep.Connect: {
        setStep(WalletConnectStep.Setup);
        setFormDirty(true);
        break;
      }
      case WalletConnectStep.Setup: {
        setStep(WalletConnectStep.Create);
        break;
      }
      case WalletConnectStep.Create: {
        closeConnection();
        history.push(walletRoutePaths.assets);
        break;
      }
    }
  }, [closeConnection, history, setFormDirty, step]);

  const back = useCallback(() => {
    switch (step) {
      case WalletConnectStep.Connect: {
        history.push(walletRoutePaths.newWallet.root);
        break;
      }
      case WalletConnectStep.Setup:
      case WalletConnectStep.Create: {
        if (isStartOverDialogVisible) {
          closeConnection();
          setStep(WalletConnectStep.Connect);
          setFormDirty(false);
        } else {
          setIsStartOverDialogVisible(true);
        }
        break;
      }
    }
  }, [closeConnection, history, isStartOverDialogVisible, setFormDirty, step]);

  const cleanupConnectionState = useCallback(() => {
    setConnection(undefined);
    setStep(WalletConnectStep.Connect);
    closeConnection();
  }, [closeConnection]);

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
    await analytics.sendEventToPostHog(postHogActions.hardware.WALLET_ADDED, {
      /* eslint-disable camelcase */
      $set_once: {
        initial_hardware_wallet_model: deviceSpec.model,
        initial_firmware_version: deviceSpec?.firmwareVersion,
        initial_cardano_app_version: deviceSpec?.cardanoAppVersion
      },
      $set: { wallet_accounts_quantity: await getWalletAccountsQtyString(walletRepository) }
      /* eslint-enable camelcase */
    });

    if (aliasEventRequired) {
      await analytics.sendAliasEvent();
    }

    if (mergeEventRequired) {
      await analytics.sendMergeEvent(cardanoWallet.source.account.extendedAccountPublicKey);
    }

    await saveHardwareWallet(cardanoWallet);

    if (await isHdWallet(cardanoWallet.wallet)) {
      await analytics.sendEventToPostHog(postHogActions.hardware.HD_WALLET);
    }
  }, [
    aliasEventRequired,
    mergeEventRequired,
    analytics,
    closeConnection,
    connection,
    createHardwareWalletRevamped,
    postHogActions.hardware.HD_WALLET,
    postHogActions.hardware.WALLET_ADDED,
    saveHardwareWallet,
    walletData,
    walletRepository
  ]);

  const value = useMemo(
    () => ({
      back,
      connect,
      createWallet,
      errorDialogCode,
      isStartOverDialogVisible,
      next,
      onErrorDialogRetry,
      onNameAndAccountChange,
      onStartOverDialogAction,
      step
    }),
    [
      back,
      connect,
      createWallet,
      errorDialogCode,
      isStartOverDialogVisible,
      next,
      onErrorDialogRetry,
      onNameAndAccountChange,
      onStartOverDialogAction,
      step
    ]
  );

  return <HardwareWalletContext.Provider value={value}>{children(value)}</HardwareWalletContext.Provider>;
};
