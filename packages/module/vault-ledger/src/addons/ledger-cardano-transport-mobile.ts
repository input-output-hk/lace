import { LedgerKeyAgent } from '@cardano-sdk/hardware-ledger';
import { CommunicationType, KeyPurpose } from '@cardano-sdk/key-management';
import { openLedgerBleDeviceConnection } from '@lace-lib/util-hw/mobile';

import type { LedgerCardanoTransport } from '../ledger-cardano-transport';
import type { DeviceDescriptor } from '@lace-lib/util-hw';

const assertBleDescriptor = (descriptor: DeviceDescriptor) => {
  if (descriptor.kind !== 'ble') {
    throw new Error('Expected BLE device descriptor on mobile');
  }
  return descriptor;
};

/**
 * `CommunicationType.Web` is hardcoded because `@cardano-sdk/key-management`
 * has no `Ble` enum value. The SDK never inspects communicationType once a
 * `deviceConnection` is supplied, so signing and xpub fetching work; only
 * the SDK's automatic reconnect-on-disconnect path would call WebUSB and
 * fail on mobile. Manual re-pair is the recovery story today.
 */
export const ledgerCardanoTransportMobile: LedgerCardanoTransport = {
  getXpub: async (descriptor, accountIndex) => {
    const deviceConnection = await openLedgerBleDeviceConnection(
      assertBleDescriptor(descriptor),
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
    const deviceConnection = await openLedgerBleDeviceConnection(
      assertBleDescriptor(props.descriptor),
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
