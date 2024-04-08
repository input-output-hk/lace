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

const initializeTrezor = () =>
  HardwareTrezor.TrezorKeyAgent.initializeTrezorTransport({
    manifest,
    communicationType: DEFAULT_COMMUNICATION_TYPE
  });

const connectDevices: Record<HardwareWallets, () => Promise<DeviceConnection>> = {
  [WalletType.Ledger]: async () =>
    await HardwareLedger.LedgerKeyAgent.checkDeviceConnection(DEFAULT_COMMUNICATION_TYPE),
  ...(AVAILABLE_WALLETS.includes(WalletType.Trezor) && {
    [WalletType.Trezor]: async () => await initializeTrezor()
  })
};

export const connectDevice = async (model: HardwareWallets): Promise<DeviceConnection> => await connectDevices[model]();

type Descriptor = Partial<USBDevice>;
type DescriptorEntries<T extends Descriptor> = [keyof T, T[keyof T]][];
const isDeviceDescribedBy = (device: USBDevice, descriptors: Descriptor[]) =>
  descriptors.some((descriptor) =>
    (Object.entries(descriptor) as DescriptorEntries<Descriptor>).every(([key, value]) => device[key] === value)
  );

const ledgerNanoSProductId = 4117;
const ledgerNanoSPlusProductId = 20_501;
const ledgerNanoXProductId = 16_401;
export const ledgerDescriptors = [ledgerNanoSProductId, ledgerNanoSPlusProductId, ledgerNanoXProductId].map(
  (productId) => ({
    vendorId: ledgerUSBVendorId,
    productId
  })
);

// eslint-disable-next-line unicorn/number-literal-case
const trezorModelTProductId = 0x53_c1;
const trezorDescriptors = TREZOR_USB_DESCRIPTORS.filter(({ productId }) => productId === trezorModelTProductId);
export const supportedHwUsbDescriptors = [...ledgerDescriptors, ...trezorDescriptors];

export const connectDeviceRevamped = async (usbDevice: USBDevice): Promise<HardwareWalletConnection> => {
  if (isDeviceDescribedBy(usbDevice, ledgerDescriptors)) {
    return {
      type: WalletType.Ledger,
      value: await HardwareLedger.LedgerKeyAgent.establishDeviceConnection(DEFAULT_COMMUNICATION_TYPE, usbDevice)
    };
  }
  if (isTrezorHWSupported() && isDeviceDescribedBy(usbDevice, trezorDescriptors)) {
    await initializeTrezor();
    return {
      type: WalletType.Trezor
    };
  }

  throw new Error('Could not recognize the device');
};

const invalidDeviceError = new Error('Invalid device type');

export const getHwExtendedAccountPublicKey = async (
  walletType: HardwareWallets,
  accountIndex: number,
  ledgerConnection?: LedgerConnection
): Promise<Bip32PublicKeyHex> => {
  if (walletType === WalletType.Ledger) {
    return HardwareLedger.LedgerKeyAgent.getXpub({
      communicationType: DEFAULT_COMMUNICATION_TYPE,
      deviceConnection: ledgerConnection,
      accountIndex
    });
  }
  if (isTrezorHWSupported() && walletType === WalletType.Trezor) {
    return HardwareTrezor.TrezorKeyAgent.getXpub({
      communicationType: DEFAULT_COMMUNICATION_TYPE,
      accountIndex
    });
  }
  throw invalidDeviceError;
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

  throw invalidDeviceError;
};

type SoftwareVersion = {
  major: number;
  minor: number;
  patch: number;
};

const parseStringVersion = (version: string) => {
  const [major, minor, patch] = version.split('.').map((n) => Number.parseInt(n, 10));
  return {
    major,
    minor,
    patch
  };
};

export const getDeviceSoftwareVersion = async (type: HardwareWallets): Promise<SoftwareVersion> => {
  if (type === WalletType.Ledger) {
    const connection = await HardwareLedger.LedgerKeyAgent.establishDeviceConnection(DEFAULT_COMMUNICATION_TYPE);
    const { cardanoAppVersion } = await getDeviceSpec({
      type,
      value: connection
    });
    return parseStringVersion(cardanoAppVersion);
  }
  if (isTrezorHWSupported() && type === WalletType.Trezor) {
    // To allow checks once the app is refreshed. It won't affect the user flow
    // TODO: Smarter Trezor initialization logic after onboarding revamp LW-9808
    // TODO: Reuse getDeviceSpec to get version
    await initializeTrezor();
    const features = await HardwareTrezor.TrezorKeyAgent.checkDeviceConnection(DEFAULT_COMMUNICATION_TYPE);
    return {
      major: features.major_version,
      minor: features.minor_version,
      patch: features.patch_version
    };
  }

  throw invalidDeviceError;
};
