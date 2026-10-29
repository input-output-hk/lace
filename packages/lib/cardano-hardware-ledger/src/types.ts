import type { TxOutputFormat } from '@cardano-foundation/ledgerjs-hw-app-cardano';
import type { Cardano } from '@lace-lib/cardano-core';
import type { SignTransactionContext } from '@lace-lib/cardano-key-management';
import type TransportNodeHid from '@ledgerhq/hw-transport-node-hid-noevents';
import type TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import type { HID } from 'node-hid';

export enum DeviceType {
  Ledger = 'Ledger',
}

export type LedgerTransportType = TransportNodeHid | TransportWebUSB;

export type LedgerDevice = HID | USBDevice;

/**
 * The LedgerTxTransformerContext type represents the additional context necessary for
 * transforming a Core transaction into a Ledger device compatible transaction.
 */
export type LedgerTxTransformerContext = SignTransactionContext & {
  /** The Cardano blockchain's network identifier (e.g., mainnet or testnet). */
  chainId: Cardano.ChainId;
  /** Non-hardened account in cip1852 */
  accountIndex: number;
  /** The outputs format in the same order as they appear in the transaction. */
  outputsFormat: Array<TxOutputFormat>;
  /** The collateral return output format. */
  collateralReturnFormat: TxOutputFormat | undefined;
};
