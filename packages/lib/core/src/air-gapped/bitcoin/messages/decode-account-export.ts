import { BitcoinUrType } from '../ur-types';

import { decodeCryptoAccount } from './crypto-account';
import { decodeCryptoHdKey } from './crypto-hdkey';

import type { DecodedHdKey } from './crypto-hdkey';

/** A reassembled UR account-export message: its type and tagged CBOR body. */
export interface AccountExportMessage {
  urType: string;
  cbor: Uint8Array;
}

/**
 * Decodes an exported account public key from either a crypto-hdkey or a
 * crypto-account UR message, dispatching on the UR type. For crypto-account the
 * single-key native-segwit (wpkh) descriptor is selected.
 *
 * @throws if the UR type is neither crypto-hdkey nor crypto-account.
 */
export const decodeAccountExport = ({
  urType,
  cbor,
}: AccountExportMessage): DecodedHdKey => {
  switch (urType) {
    case BitcoinUrType.Hdkey:
      return decodeCryptoHdKey(cbor);
    case BitcoinUrType.Account:
      return decodeCryptoAccount(cbor);
    default:
      throw new Error(`unsupported account-export UR type: ${urType}`);
  }
};
