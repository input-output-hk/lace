import { supportedNetworkIds } from '@lace-contract/cardano-context';
import { UsbHardwareWalletId, WalletType } from '@lace-contract/wallet-repo';
import { ledgerUSBVendorId } from '@ledgerhq/devices';

import { LEDGER_ONBOARDING_OPTION_ID } from './const';

import type { AvailableAddons } from '.';
import type { ContextualLaceInit } from '@lace-contract/module';
import type {
  DeviceDescriptor,
  HwWalletConnector,
} from '@lace-contract/onboarding-v2';

const findLedgerConnector = async (
  loadModules: Parameters<
    ContextualLaceInit<HwWalletConnector, AvailableAddons>
  >[0]['loadModules'],
  blockchainName: string,
) => {
  const connectors =
    (await loadModules('addons.loadLedgerHwAccountConnector'))?.flat() ?? [];
  const connector = connectors.find(c => c.blockchainName === blockchainName);
  if (!connector) {
    throw new Error(`No hw account connector for ${blockchainName} on Ledger`);
  }
  return connector;
};

/** Resolve a pre-authorized Ledger USB device for v1 wallets whose IDs lack device info. */
const resolveUsbDevice = async (): Promise<DeviceDescriptor> => {
  const usbDevices = await navigator.usb.getDevices();
  const device = usbDevices.find(d => d.vendorId === ledgerUSBVendorId);
  if (!device) throw new Error('Ledger device disconnected or not authorized');
  return {
    vendorId: device.vendorId,
    productId: device.productId,
    serialNumber: device.serialNumber ?? null,
  };
};

const loadHwWalletConnector: ContextualLaceInit<
  HwWalletConnector,
  AvailableAddons
> = ({ loadModules }) => ({
  id: LEDGER_ONBOARDING_OPTION_ID,
  walletType: WalletType.HardwareLedger,
  createWallet: async (state, props) => {
    const connector = await findLedgerConnector(
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
      metadata: { name: 'Ledger', order: 0 },
      blockchainSpecific: {},
      type: WalletType.HardwareLedger,
      accounts,
    };
  },
  connectAccount: async (state, props) => {
    const connector = await findLedgerConnector(
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
