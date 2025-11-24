import { WalletSetupSelectAccountsStepRevamp } from '@lace/core';
import React, { VFC, useState } from 'react';
import { useHardwareWallet } from '@views/browser/features/multi-wallet/hardware-wallet/context';
import { useAnalyticsContext } from '@providers';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { TrezorDerivationTypeSelector } from '@src/components/TrezorDerivationTypeSelector';
import { WalletType } from '@cardano-sdk/web-extension';
import { DerivationType, Wallet } from '@lace/cardano';

const TOTAL_ACCOUNTS = 50;

// Utility function to determine device type from USB device
/* eslint-disable consistent-return */
const getDeviceTypeFromUsbDevice = (usbDevice: USBDevice | undefined): WalletType | undefined => {
  if (!usbDevice) {
    return undefined;
  }

  // Check if it's a Ledger device
  const isLedgerDevice = Wallet.ledgerDescriptors.some((descriptor: Record<string, unknown>) =>
    Object.entries(descriptor).every(([key, value]) => usbDevice[key as keyof USBDevice] === value)
  );
  if (isLedgerDevice) {
    return WalletType.Ledger;
  }

  // Check if it's a Trezor device
  const isTrezorDevice = Wallet.trezorDescriptors.some((descriptor: Record<string, unknown>) =>
    Object.entries(descriptor).every(([key, value]) => usbDevice[key as keyof USBDevice] === value)
  );
  if (isTrezorDevice) {
    return WalletType.Trezor;
  }

  return undefined;
};
/* eslint-enable consistent-return */

export const Setup: VFC = () => {
  const analytics = useAnalyticsContext();
  const { postHogActions } = useWalletOnboarding();
  const { back, next, onNameAndAccountChange, connection, connectedUsbDevice } = useHardwareWallet();
  const [derivationType, setDerivationType] = useState<DerivationType>('ICARUS');

  const getContentBeforeAccountSelector = () => {
    const deviceTypeFromUsb = getDeviceTypeFromUsbDevice(connectedUsbDevice);
    const deviceTypeFromConnection = connection?.type;
    const deviceType = deviceTypeFromConnection || deviceTypeFromUsb;

    return deviceType === WalletType.Trezor ? (
      <TrezorDerivationTypeSelector value={derivationType} onChange={setDerivationType} />
    ) : undefined;
  };

  return (
    <WalletSetupSelectAccountsStepRevamp
      accounts={TOTAL_ACCOUNTS}
      onBack={back}
      onSubmit={(accountIndex, name) => {
        void analytics.sendEventToPostHog(postHogActions.hardware.ENTER_WALLET);
        onNameAndAccountChange({ accountIndex, name, derivationType });
        next();
      }}
      onSelectedAccountChange={() => {
        void analytics.sendEventToPostHog(postHogActions.hardware.SETUP_HW_ACCOUNT_NO_CLICK);
      }}
      contentBeforeAccountSelector={getContentBeforeAccountSelector()}
    />
  );
};
