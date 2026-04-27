import { HexBytes } from '@lace-sdk/util';
import { Psbt } from 'bitcoinjs-lib';

import type { DerivedAddress } from './address';
import type { BitcoinNetwork } from '@lace-contract/bitcoin-context';

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

type SerializedDto = Omit<UnsignedTransaction, 'context'> & {
  context: string;
};

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
