import type { GroupedAddress } from '../types';
import type { Cardano } from '@lace-lib/cardano-core';
import type * as Crypto from '@lace-lib/cardano-crypto';
import type { HexBlob } from '@lace-lib/util/common';

export type CoseSign1CborHex = HexBlob;
export type CoseKeyCborHex = HexBlob;

export interface Cip8SignDataContext {
  knownAddresses: GroupedAddress[];
  signWith: Cardano.PaymentAddress | Cardano.RewardAccount;
  payload: HexBlob;
}

export interface Cip8SignResult {
  publicKey: Crypto.Ed25519PublicKeyHex;
  signature: Crypto.Ed25519SignatureHex;
}
