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
  appUrl: process.env.WEBSITE_URL as unknown as string,
  email: process.env.EMAIL_ADDRESS as unknown as string
};

const initializeTrezor = () =>
  HardwareTrezor.TrezorKeyAgent.initializeTrezorTransport({
    manifest,
    communicationType: DEFAULT_COMMUNICATION_TYPE
  });

const connectDevices: Partial<Record<HardwareWallets, () => Promise<DeviceConnection>>> = {
  [WalletType.Ledger]: async () =>
    await HardwareLedger.LedgerKeyAgent.checkDeviceConnection(DEFAULT_COMMUNICATION_TYPE),
  ...(AVAILABLE_WALLETS.includes(WalletType.Trezor) && {
    [WalletType.Trezor]: async () => await initializeTrezor()
  })
};

export const connectDevice = async (model: HardwareWallets): Promise<DeviceConnection> =>
  await connectDevices[model]?.();

type Descriptor = Partial<USBDevice>;
type DescriptorEntries<T extends Descriptor> = [keyof T, T[keyof T]][];
const isDeviceDescribedBy = (device: USBDevice, descriptors: Descriptor[]) =>
  descriptors.some((descriptor) =>
    (Object.entries(descriptor) as DescriptorEntries<Descriptor>).every(([key, value]) => device[key] === value)
  );

export const ledgerDescriptors = [{ vendorId: ledgerUSBVendorId }];

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
      accountIndex,
      purpose: KeyManagement.KeyPurpose.STANDARD
    });
  }
  if (isTrezorHWSupported() && walletType === WalletType.Trezor) {
    return HardwareTrezor.TrezorKeyAgent.getXpub({
      communicationType: DEFAULT_COMMUNICATION_TYPE,
      accountIndex,
      purpose: KeyManagement.KeyPurpose.STANDARD
    });
  }
  throw invalidDeviceError;
};

type DeviceSpec = {
  model?: string;
  firmwareVersion?: string;
  cardanoAppVersion?: string;
};

const makeVersion = (major: number, minor: number, patch: number) => `${major}.${minor}.${patch}`;

export const getDeviceSpec = async (connection: HardwareWalletConnection): Promise<DeviceSpec> => {
  if (connection.type === WalletType.Ledger && typeof connection.value !== 'undefined') {
    const { version } = await connection.value.getVersion();
    return {
      model: connection.value.transport.deviceModel?.id,
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

export const initConnectionAndGetSoftwareVersion = async (type: HardwareWallets): Promise<SoftwareVersion> => {
  if (type === WalletType.Ledger) {
    const connection = await HardwareLedger.LedgerKeyAgent.establishDeviceConnection(DEFAULT_COMMUNICATION_TYPE);
    const { version } = await connection.getVersion();
    return version;
  }
  if (isTrezorHWSupported() && type === WalletType.Trezor) {
    // To allow checks once the app is refreshed. It won't affect the user flow
    // TODO: Smarter Trezor initialization logic after onboarding revamp LW-9808
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
