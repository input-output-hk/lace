/* eslint-disable unicorn/no-null */
import * as KeyManagement from '@cardano-sdk/key-management';
import { DeviceConnection, HardwareWallets } from '../types';
import * as HardwareLedger from '../../../../../node_modules/@cardano-sdk/hardware-ledger/dist/cjs';
import * as HardwareTrezor from '../../../../../node_modules/@cardano-sdk/hardware-trezor/dist/cjs';
import { WalletType } from '@cardano-sdk/web-extension';
// Using nodejs CML version to satisfy the tests requirements, but this gets replaced by webpack to the browser version in the build

const isTrezorHWSupported = (): boolean => process.env.USE_TREZOR_HW === 'true';

const createEnumObject = <T extends string>(o: Array<T>) => o;
export const AVAILABLE_WALLETS = createEnumObject<HardwareWallets>(
  isTrezorHWSupported() ? [WalletType.Ledger, WalletType.Trezor] : [WalletType.Ledger]
);
const DEFAULT_COMMUNICATION_TYPE = KeyManagement.CommunicationType.Web;

// https://github.com/trezor/connect/blob/develop/docs/index.md#trezor-connect-manifest
export const manifest: KeyManagement.TrezorConfig['manifest'] = {
  appUrl: process.env.WEBSITE_URL,
  email: process.env.EMAIL_ADDRESS
};

const connectDevices: Record<HardwareWallets, () => Promise<DeviceConnection>> = {
  [WalletType.Ledger]: async () =>
    await HardwareLedger.LedgerKeyAgent.checkDeviceConnection(DEFAULT_COMMUNICATION_TYPE),
  ...(AVAILABLE_WALLETS.includes(WalletType.Trezor) && {
    [WalletType.Trezor]: async () => {
      const isTrezorInitialized = await HardwareTrezor.TrezorKeyAgent.initializeTrezorTransport({
        manifest,
        communicationType: DEFAULT_COMMUNICATION_TYPE
      });

      // initializeTrezorTransport would still succeed even when device is not connected
      await HardwareTrezor.TrezorKeyAgent.checkDeviceConnection(KeyManagement.CommunicationType.Web);

      return isTrezorInitialized;
    }
  })
};

export const connectDevice = async (model: HardwareWallets): Promise<DeviceConnection> => await connectDevices[model]();
