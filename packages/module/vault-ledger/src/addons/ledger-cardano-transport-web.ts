import { LedgerKeyAgent } from '@cardano-sdk/hardware-ledger';
import { CommunicationType, KeyPurpose } from '@cardano-sdk/key-management';
import { getUsbDeviceByDescriptor } from '@lace-lib/util-hw/extension';

import type { LedgerCardanoTransport } from '../ledger-cardano-transport';

export const ledgerCardanoTransportWeb: LedgerCardanoTransport = {
  getXpub: async (descriptor, accountIndex) => {
    const usbDevice = await getUsbDeviceByDescriptor(descriptor);
    const deviceConnection = await LedgerKeyAgent.establishDeviceConnection(
      CommunicationType.Web,
      usbDevice,
    );
    try {
      return await LedgerKeyAgent.getXpub({
        deviceConnection,
        communicationType: CommunicationType.Web,
        accountIndex,
        purpose: KeyPurpose.STANDARD,
      });
    } finally {
      await deviceConnection.transport?.close();
    }
  },
  createKeyAgent: async (props, dependencies) => {
    const usbDevice = await getUsbDeviceByDescriptor(props.descriptor);
    const deviceConnection = await LedgerKeyAgent.establishDeviceConnection(
      CommunicationType.Web,
      usbDevice,
    );
    return new LedgerKeyAgent(
      {
        accountIndex: props.accountIndex,
        chainId: props.chainId,
        communicationType: CommunicationType.Web,
        deviceConnection,
        extendedAccountPublicKey: props.extendedAccountPublicKey,
        purpose: props.purpose ?? KeyPurpose.STANDARD,
      },
      dependencies,
    );
  },
};
