import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { HexBytes } from '@lace-sdk/util';

import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { CardanoKeyAgent } from '@lace-contract/cardano-context';
import type {
  CardanoSignDataRequest,
  CardanoSignDataResult,
} from '@lace-contract/cardano-context';

const ALGORITHM_EDDSA = -8;
const KEY_TYPE_OKP = 1;
const CURVE_ED25519 = 6;
const COSE_KEY_KTY = 1;
const COSE_KEY_KID = 2;
const COSE_KEY_ALG = 3;
const COSE_KEY_CRV = -1;
const COSE_KEY_X = -2;
const STAKE_KEY_DERIVATION_PATH = { role: 2, index: 0 };

const getDerivationPath = (
  signWith: Cardano.PaymentAddress | Cardano.RewardAccount,
  knownAddresses: GroupedAddress[],
): { role: number; index: number } => {
  if (Cardano.isRewardAccount(signWith)) {
    const matchingAddress = knownAddresses.find(
      addr => addr.rewardAccount === signWith,
    );
    if (matchingAddress?.stakeKeyDerivationPath) {
      return {
        role: matchingAddress.stakeKeyDerivationPath.role,
        index: matchingAddress.stakeKeyDerivationPath.index,
      };
    }
    return STAKE_KEY_DERIVATION_PATH;
  }

  const matchingAddress = knownAddresses.find(
    addr => addr.address === signWith,
  );
  if (matchingAddress) {
    return {
      role: matchingAddress.type,
      index: matchingAddress.index,
    };
  }

  return { role: 0, index: 0 };
};

const createProtectedHeaders = (addressBytes: Uint8Array): Uint8Array => {
  const writer = new Serialization.CborWriter();
  writer.writeStartMap(3);
  writer.writeInt(1);
  writer.writeInt(ALGORITHM_EDDSA);
  writer.writeInt(4);
  writer.writeByteString(addressBytes);
  writer.writeTextString('address');
  writer.writeByteString(addressBytes);
  return writer.encode();
};

const createSigStructure = (
  protectedHeadersBytes: Uint8Array,
  payloadBytes: Uint8Array,
): Uint8Array => {
  const writer = new Serialization.CborWriter();
  writer.writeStartArray(4);
  writer.writeTextString('Signature1');
  writer.writeByteString(protectedHeadersBytes);
  writer.writeByteString(new Uint8Array(0));
  writer.writeByteString(payloadBytes);
  return writer.encode();
};

const createCoseSign1 = (
  protectedHeadersBytes: Uint8Array,
  payloadBytes: Uint8Array,
  signatureBytes: Uint8Array,
): Uint8Array => {
  const writer = new Serialization.CborWriter();
  writer.writeStartArray(4);
  writer.writeByteString(protectedHeadersBytes);
  writer.writeStartMap(1);
  writer.writeTextString('hashed');
  writer.writeBoolean(false);
  writer.writeByteString(payloadBytes);
  writer.writeByteString(signatureBytes);
  return writer.encode();
};

const createCoseKey = (
  addressBytes: Uint8Array,
  publicKeyBytes: Uint8Array,
): Uint8Array => {
  const writer = new Serialization.CborWriter();
  writer.writeStartMap(5);
  writer.writeInt(COSE_KEY_KTY);
  writer.writeInt(KEY_TYPE_OKP);
  writer.writeInt(COSE_KEY_KID);
  writer.writeByteString(addressBytes);
  writer.writeInt(COSE_KEY_ALG);
  writer.writeInt(ALGORITHM_EDDSA);
  writer.writeInt(COSE_KEY_CRV);
  writer.writeInt(CURVE_ED25519);
  writer.writeInt(COSE_KEY_X);
  writer.writeByteString(publicKeyBytes);
  return writer.encode();
};

/** Signs data per CIP-8 by constructing COSE structures without WASM. */
export const cip8SignData = async (
  keyAgent: CardanoKeyAgent,
  request: CardanoSignDataRequest,
  knownAddresses: GroupedAddress[],
): Promise<CardanoSignDataResult> => {
  const address = Cardano.Address.fromString(request.signWith);
  if (!address) {
    throw new Error(`Invalid address: ${request.signWith}`);
  }

  const addressBytes = Buffer.from(address.toBytes(), 'hex');
  const derivationPath = getDerivationPath(request.signWith, knownAddresses);

  const protectedHeadersBytes = createProtectedHeaders(addressBytes);
  const payloadBytes = Buffer.from(request.payload, 'hex');
  const sigStructure = createSigStructure(protectedHeadersBytes, payloadBytes);

  const { signature, publicKey } = await keyAgent.signBlob(
    derivationPath,
    HexBlob.fromBytes(sigStructure),
  );

  const signatureBytes = Buffer.from(signature, 'hex');
  const coseSign1 = createCoseSign1(
    protectedHeadersBytes,
    payloadBytes,
    signatureBytes,
  );
  const publicKeyBytes = Buffer.from(publicKey, 'hex');
  const coseKey = createCoseKey(addressBytes, publicKeyBytes);

  return {
    signature: HexBytes(HexBlob.fromBytes(coseSign1)),
    key: HexBytes(HexBlob.fromBytes(coseKey)),
  };
};
