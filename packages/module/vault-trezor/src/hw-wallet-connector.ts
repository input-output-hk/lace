import { supportedNetworkIds } from '@lace-contract/cardano-context';
import { UsbHardwareWalletId, WalletType } from '@lace-contract/wallet-repo';

import {
  TREZOR_ONBOARDING_OPTION_ID,
  TREZOR_USB_PRODUCT_ID,
  TREZOR_USB_VENDOR_ID,
} from './const';

import type { AvailableAddons } from '.';
import type { ContextualLaceInit } from '@lace-contract/module';
import type {
  DeviceDescriptor,
  HwWalletConnector,
} from '@lace-contract/onboarding-v2';

/** Resolve a pre-authorized Trezor USB device for v1 wallets whose IDs lack device info. */
const resolveUsbDevice = async (): Promise<DeviceDescriptor> => {
  const usbDevices = await navigator.usb.getDevices();
  const device = usbDevices.find(
    d =>
      d.vendorId === TREZOR_USB_VENDOR_ID &&
      d.productId === TREZOR_USB_PRODUCT_ID,
  );
  if (!device) throw new Error('Trezor device disconnected or not authorized');
  return {
    vendorId: device.vendorId,
    productId: device.productId,
    serialNumber: device.serialNumber ?? null,
  };
};

const findTrezorConnector = async (
  loadModules: Parameters<
    ContextualLaceInit<HwWalletConnector, AvailableAddons>
  >[0]['loadModules'],
  blockchainName: string,
) => {
  const connectors =
    (await loadModules('addons.loadTrezorHwAccountConnector'))?.flat() ?? [];
  const connector = connectors.find(c => c.blockchainName === blockchainName);
  if (!connector) {
    throw new Error(`No hw account connector for ${blockchainName} on Trezor`);
  }
  return connector;
};

const loadHwWalletConnector: ContextualLaceInit<
  HwWalletConnector,
  AvailableAddons
> = ({ loadModules }) => ({
  id: TREZOR_ONBOARDING_OPTION_ID,
  walletType: WalletType.HardwareTrezor,
  createWallet: async (state, props) => {
    const connector = await findTrezorConnector(
      loadModules,
      props.blockchainName,
    );
    const walletId = UsbHardwareWalletId(props.device);
    const accounts = await connector.connectHardwareAccounts(state, {
      walletId,
      device: props.device,
      accountIndex: props.accountIndex,
      accountName: `Account #${props.accountIndex}`,
      derivationType: props.derivationType,
      targetNetworks: new Set(supportedNetworkIds.keys()),
    });
    return {
      walletId,
      metadata: {
        name: 'Trezor',
        order: 0,
        derivationType: props.derivationType,
      },
      blockchainSpecific: {},
      type: WalletType.HardwareTrezor,
      accounts,
    };
  },
  connectAccount: async (state, props) => {
    const connector = await findTrezorConnector(
      loadModules,
      props.blockchainName,
    );
    const device = props.device ?? (await resolveUsbDevice());
    return connector.connectHardwareAccounts(state, {
      walletId: props.walletId,
      device,
      accountIndex: props.accountIndex,
      accountName: props.accountName,
      derivationType: props.derivationType,
      targetNetworks: props.targetNetworks,
    });
  },
});

export default loadHwWalletConnector;
