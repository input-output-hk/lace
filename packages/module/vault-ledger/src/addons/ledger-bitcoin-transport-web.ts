import { getUsbDeviceByDescriptor } from '@lace-lib/util-hw/extension';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { AppClient } from 'ledger-bitcoin';

import { nativeSegWitWalletPolicy } from './ledger-bitcoin-wallet-policy';

import type { LedgerBitcoinTransport } from '../ledger-bitcoin-transport';
import type { DeviceDescriptor } from '@lace-lib/util-hw';

const withBitcoinApp = async <T>(
  descriptor: DeviceDescriptor,
  action: (app: AppClient) => Promise<T>,
): Promise<T> => {
  const usbDevice = await getUsbDeviceByDescriptor(descriptor);
  const transport = await TransportWebUSB.open(usbDevice);
  try {
    return await action(new AppClient(transport));
  } finally {
    await transport.close();
  }
};

export const ledgerBitcoinTransportWeb: LedgerBitcoinTransport = {
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
