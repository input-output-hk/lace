import { COSEKey, Label, Int } from '@emurgo/cardano-message-signing-nodejs';
import type { Cip30DataSignature } from '@cardano-sdk/dapp-connector';
import { Ed25519PublicKeyHex } from '@cardano-sdk/crypto';

export const coseKeyToRaw = (coseKey: Cip30DataSignature['key']): Ed25519PublicKeyHex => {
  const parsedKey = COSEKey.from_bytes(Buffer.from(coseKey, 'hex'));
  // eslint-disable-next-line no-magic-numbers
  const rawKeyLabelX = Label.new_int(Int.new_i32(-2));
  const keyCbor = parsedKey.header(rawKeyLabelX);
  const keyBytes = keyCbor?.as_bytes();
  keyCbor?.free();
  rawKeyLabelX.free();
  parsedKey.free();
  if (!keyBytes) {
    throw new Error('expected COSE key with label "x" (-2)');
  }
  // eslint-disable-next-line new-cap
  return Ed25519PublicKeyHex(Buffer.from(keyBytes).toString('hex'));
};
