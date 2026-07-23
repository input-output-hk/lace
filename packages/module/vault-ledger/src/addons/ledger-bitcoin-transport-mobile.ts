import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import { AppClient } from 'ledger-bitcoin';

import { nativeSegWitWalletPolicy } from './ledger-bitcoin-wallet-policy';

import type { LedgerBitcoinTransport } from '../ledger-bitcoin-transport';
import type { DeviceDescriptor } from '@lace-lib/util-hw';

const assertBleDescriptor = (descriptor: DeviceDescriptor) => {
  if (descriptor.kind !== 'ble') {
    throw new Error('Expected BLE device descriptor on mobile');
  }
  return descriptor;
};

const withBitcoinApp = async <T>(
  descriptor: DeviceDescriptor,
  action: (app: AppClient) => Promise<T>,
): Promise<T> => {
  const transport = await TransportBLE.open(assertBleDescriptor(descriptor).id);
  try {
    return await action(new AppClient(transport));
  } finally {
    await transport.close();
  }
};

export const ledgerBitcoinTransportMobile: LedgerBitcoinTransport = {
  getMasterFingerprint: async descriptor =>
    withBitcoinApp(descriptor, async app => app.getMasterFingerprint()),
  getExtendedPubkey: async (descriptor, path) =>
    withBitcoinApp(descriptor, async app => app.getExtendedPubkey(path)),
  signPsbt: async (descriptor, props) =>
    withBitcoinApp(descriptor, async app => {
      const signatures = await app.signPsbt(
        props.psbtBase64,
        nativeSegWitWalletPolicy(props),
        null,
      );
      return signatures.map(([inputIndex, partialSignature]) => ({
        inputIndex,
        pubkey: partialSignature.pubkey,
        signature: partialSignature.signature,
      }));
    }),
};
