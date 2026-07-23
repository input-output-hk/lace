import { HexBytes } from '@lace-lib/util';
import { Psbt } from 'bitcoinjs-lib';

import type { DerivedAddress } from './address';
import type {
  BitcoinNetwork,
  BitcoinUnsignedTxDto,
} from '@lace-contract/bitcoin-context';

export type UnsignedTransaction = {
  context: Psbt;
  toAddress: string;
  amount: number;
  fee: number;
  vBytes: number;
  signers: DerivedAddress[];
  network?: BitcoinNetwork;
};

export type SignedTransaction = {
  context: Psbt;
  hex: string;
};

/**
 * Wire form of UnsignedTransaction. Intersecting with the contract's
 * BitcoinUnsignedTxDto makes the compiler reject any drift between what
 * this module serializes and what the vault signers decode.
 */
type SerializedDto = BitcoinUnsignedTxDto &
  Omit<UnsignedTransaction, 'context'>;

export interface SignedBitcoinTransactionDto {
  network: string;
  hex: string;
}

/**
 * Converts the transaction into a hex-encoded string.
 */
export const encodeUnsignedTxToString = (tx: UnsignedTransaction): HexBytes => {
  const dto: SerializedDto = {
    ...tx,
    context: tx.context.toHex(),
  };
  return HexBytes.fromUTF8(JSON.stringify(dto));
};

/**
 * Converts the hex-encoded string back into the usable UnsignedTransaction object.
 */
export const decodeUnsignedTxFromString = (
  encodedString: HexBytes,
): UnsignedTransaction => {
  const jsonString = HexBytes.toUTF8(encodedString);
  const dto = JSON.parse(jsonString) as SerializedDto;
  return {
    ...dto,
    context: Psbt.fromHex(dto.context),
  };
};
