import { LedgerKeyAgent } from '@cardano-sdk/hardware-ledger';
import { CommunicationType, KeyPurpose } from '@cardano-sdk/key-management';
import {
  CardanoAccountId,
  type CardanoBip32AccountProps,
  getNetworkDetails,
} from '@lace-contract/cardano-context';

import type { AvailableAddons } from '.';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwAccountConnector } from '@lace-contract/onboarding-v2';
import type { DeviceDescriptor } from '@lace-lib/util-hw';

const getCardanoXpub = async (
  device: DeviceDescriptor,
  accountIndex: number,
) => {
  const { vendorId, productId } = device;
  const devices = await navigator.usb.getDevices();
  const usbDevice = devices.find(
    d => d.vendorId === vendorId && d.productId === productId,
  );
  if (!usbDevice) {
    throw new Error('Pre-authorized USB device not found');
  }
  const deviceConnection = await LedgerKeyAgent.establishDeviceConnection(
    CommunicationType.Web,
    usbDevice,
  );
  return LedgerKeyAgent.getXpub({
    deviceConnection,
    communicationType: CommunicationType.Web,
    accountIndex,
    purpose: KeyPurpose.STANDARD,
  });
};

const loadHwAccountConnector: ContextualLaceInit<
  HwAccountConnector[],
  AvailableAddons
> = () => [
  {
    blockchainName: 'Cardano',
    connectHardwareAccounts: async (state, props) => {
      const { device, accountIndex, accountName, walletId, targetNetworks } =
        props;
      const publicKey = await getCardanoXpub(device, accountIndex);

      return [...targetNetworks].map(targetNetworkId => {
        const { chainId, networkId, networkType } = getNetworkDetails(
          state,
          targetNetworkId,
        );

        return {
          networkType,
          blockchainNetworkId: networkId,
          accountType: 'HardwareLedger' as const,
          walletId,
          accountId: CardanoAccountId(
            walletId,
            accountIndex,
            chainId.networkMagic,
          ),
          blockchainName: 'Cardano',
          metadata: { name: accountName },
          blockchainSpecific: {
            chainId,
            accountIndex,
            extendedAccountPublicKey: publicKey,
            networkId,
          } satisfies CardanoBip32AccountProps,
        };
      });
    },
  },
];

export default loadHwAccountConnector;
