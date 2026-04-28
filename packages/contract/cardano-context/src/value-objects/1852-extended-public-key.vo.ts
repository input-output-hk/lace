import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import {
  InvalidStringError,
  assertIsBech32WithPrefix,
} from '@cardano-sdk/util';
import * as BaseEncoding from '@scure/base';

import type { Tagged } from 'type-fest';

const MAX_BECH32_LENGTH_LIMIT = 1023;
const bip32PublicKeyPrefix = 'acct_xvk';

export type Cip1852ExtendedAccountPublicKey = Tagged<
  `${string}1${string}`,
  'Cip1852ExtendedAccountPublicKey'
>;

export const Cip1852ExtendedAccountPublicKey = (
  value: string,
): Cip1852ExtendedAccountPublicKey => {
  try {
    assertIsBech32WithPrefix(value, [bip32PublicKeyPrefix]);
  } catch {
    throw new InvalidStringError(
      value,
      'Expected key to be a bech32 encoded string',
    );
  }

  return value as Cip1852ExtendedAccountPublicKey;
};

Cip1852ExtendedAccountPublicKey.fromBip32PublicKeyHex = (
  value: Bip32PublicKeyHex,
): Cip1852ExtendedAccountPublicKey => {
  const words = BaseEncoding.bech32.toWords(Buffer.from(value, 'hex'));
  return Cip1852ExtendedAccountPublicKey(
    BaseEncoding.bech32.encode(
      bip32PublicKeyPrefix,
      words,
      MAX_BECH32_LENGTH_LIMIT,
    ),
  );
};

Cip1852ExtendedAccountPublicKey.toBip32PublicKeyHex = (
  value: Cip1852ExtendedAccountPublicKey,
): Bip32PublicKeyHex => {
  const { words } = BaseEncoding.bech32.decode(value, MAX_BECH32_LENGTH_LIMIT);
  return Bip32PublicKeyHex(
    Buffer.from(BaseEncoding.bech32.fromWords(words)).toString('hex'),
  );
};
