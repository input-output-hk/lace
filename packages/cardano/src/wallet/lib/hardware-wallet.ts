/* eslint-disable unicorn/no-null */
import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import * as KeyManagement from '@cardano-sdk/key-management';
import { HardwareWalletConnection, DeviceConnection, HardwareWallets, LedgerConnection } from '../types';
import * as HardwareLedger from '@cardano-sdk/hardware-ledger';
import * as HardwareTrezor from '@cardano-sdk/hardware-trezor';
import { WalletType } from '@cardano-sdk/web-extension';
import { ledgerUSBVendorId } from '@ledgerhq/devices';
import { TREZOR_USB_DESCRIPTORS } from '@trezor/transport';

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
    [WalletType.Trezor]: async () =>
      await HardwareTrezor.TrezorKeyAgent.initializeTrezorTransport({
        manifest,
        communicationType: DEFAULT_COMMUNICATION_TYPE
      })
  })
};

export const connectDevice = async (model: HardwareWallets): Promise<DeviceConnection> => await connectDevices[model]();

type Descriptor = Partial<USBDevice>;
type DescriptorEntries<T extends Descriptor> = [keyof T, T[keyof T]][];
const isDeviceDescribedBy = (device: USBDevice, ...descriptors: Descriptor[]) =>
  descriptors.some((descriptor) =>
    (Object.entries(descriptor) as DescriptorEntries<Descriptor>).every(([key, value]) => device[key] === value)
  );

export const ledgerDescriptor = { vendorId: ledgerUSBVendorId };
// eslint-disable-next-line unicorn/numeric-separators-style, unicorn/number-literal-case
const trezorModelTProductId = 0x53c1;
const trezorDescriptors = TREZOR_USB_DESCRIPTORS.filter(({ productId }) => productId === trezorModelTProductId);
export const supportedHwUsbDescriptors = [ledgerDescriptor, ...trezorDescriptors];

export const connectDeviceRevamped = async (usbDevice: USBDevice): Promise<HardwareWalletConnection> => {
  if (isDeviceDescribedBy(usbDevice, ledgerDescriptor)) {
    return {
      type: WalletType.Ledger,
      value: await HardwareLedger.LedgerKeyAgent.establishDeviceConnection(DEFAULT_COMMUNICATION_TYPE, usbDevice)
    };
  }
  if (isTrezorHWSupported() && isDeviceDescribedBy(usbDevice, ...trezorDescriptors)) {
    await HardwareTrezor.TrezorKeyAgent.initializeTrezorTransport({
      manifest,
      communicationType: DEFAULT_COMMUNICATION_TYPE
    });
    return {
      type: WalletType.Trezor
    };
  }

  throw new Error('Could not recognize the device');
};

export const getHwExtendedAccountPublicKey = async (
  walletType: HardwareWallets,
  accountIndex: number,
  deviceConnection?: LedgerConnection
): Promise<Bip32PublicKeyHex> => {
  if (walletType === WalletType.Ledger) {
    return HardwareLedger.LedgerKeyAgent.getXpub({
      communicationType: DEFAULT_COMMUNICATION_TYPE,
      deviceConnection,
      accountIndex
    });
  }
  if (isTrezorHWSupported() && walletType === WalletType.Trezor) {
    return HardwareTrezor.TrezorKeyAgent.getXpub({
      communicationType: DEFAULT_COMMUNICATION_TYPE,
      accountIndex
    });
  }
  throw new Error('Invalid device type');
};

type DeviceSpec = {
  model: string;
  firmwareVersion?: string;
  cardanoAppVersion?: string;
};

const makeVersion = (major: number, minor: number, patch: number) => `${major}.${minor}.${patch}`;

export const getDeviceSpec = async (connection: HardwareWalletConnection): Promise<DeviceSpec> => {
  if (connection.type === WalletType.Ledger) {
    const { version } = await connection.value.getVersion();
    return {
      model: connection.value.transport.deviceModel.id,
      cardanoAppVersion: makeVersion(version.major, version.minor, version.patch)
    };
  }
  if (isTrezorHWSupported() && connection.type === WalletType.Trezor) {
    // TODO: Remove these hardcoded specs once we have a logic that will prevent additional interaction with 3rd party Trezor Connect popup
    const hardcodeTrezorSpec = true;
    if (hardcodeTrezorSpec) {
      return {
        model: 'Trezor model T'
      };
    }

    const features = await HardwareTrezor.TrezorKeyAgent.checkDeviceConnection(DEFAULT_COMMUNICATION_TYPE);
    return {
      model: `${WalletType.Trezor} model ${features.model}`,
      firmwareVersion: makeVersion(features.major_version, features.minor_version, features.patch_version)
    };
  }

  throw new Error('Invalid device type');
};
