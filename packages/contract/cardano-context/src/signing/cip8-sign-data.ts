import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { HexBytes } from '@lace-sdk/util';

import type {
  CardanoKeyAgent,
  CardanoSignDataRequest,
  CardanoSignDataResult,
} from './types';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';

const ALGORITHM_EDDSA = -8;
const KEY_TYPE_OKP = 1;
const CURVE_ED25519 = 6;
const COSE_KEY_KTY = 1;
const COSE_KEY_KID = 2;
const COSE_KEY_ALG = 3;
const COSE_KEY_CRV = -1;
const COSE_KEY_X = -2;
const STAKE_KEY_DERIVATION_PATH = { role: 2, index: 0 };
const DREP_KEY_DERIVATION_PATH = { role: 3, index: 0 };

interface ResolveSigningContextParams {
  address: Cardano.Address;
  signWith: Cardano.PaymentAddress | Cardano.RewardAccount;
  knownAddresses: GroupedAddress[];
  dRepKeyHash: Ed25519KeyHashHex | undefined;
}

interface SigningContext {
  derivationPath: { role: number; index: number };
  isDRepSigning: boolean;
}

const resolveSigningContext = ({
  address,
  signWith,
  knownAddresses,
  dRepKeyHash,
}: ResolveSigningContextParams): SigningContext => {
  if (Cardano.isRewardAccount(signWith)) {
    const matchingAddress = knownAddresses.find(
      addr => addr.rewardAccount === signWith,
    );
    if (matchingAddress?.stakeKeyDerivationPath) {
      return {
        derivationPath: {
          role: matchingAddress.stakeKeyDerivationPath.role,
          index: matchingAddress.stakeKeyDerivationPath.index,
        },
        isDRepSigning: false,
      };
    }
    return {
      derivationPath: STAKE_KEY_DERIVATION_PATH,
      isDRepSigning: false,
    };
  }

  if (
    dRepKeyHash &&
    address.getType() === Cardano.AddressType.EnterpriseKey &&
    address.getProps().paymentPart?.hash === dRepKeyHash
  ) {
    return {
      derivationPath: DREP_KEY_DERIVATION_PATH,
      isDRepSigning: true,
    };
  }

  const matchingAddress = knownAddresses.find(
    addr => addr.address === signWith,
  );
  if (matchingAddress) {
    return {
      derivationPath: {
        role: matchingAddress.type,
        index: matchingAddress.index,
      },
      isDRepSigning: false,
    };
  }

  throw new Error(`Unknown signWith address: ${signWith}`);
};

const createProtectedHeaders = (
  signWithBytes: Uint8Array,
  isDRepSigning: boolean,
): Uint8Array => {
  const writer = new Serialization.CborWriter();
  if (isDRepSigning) {
    writer.writeStartMap(2);
    writer.writeInt(1);
    writer.writeInt(ALGORITHM_EDDSA);
    writer.writeTextString('address');
    writer.writeByteString(signWithBytes);
    return writer.encode();
  }
  writer.writeStartMap(3);
  writer.writeInt(1);
  writer.writeInt(ALGORITHM_EDDSA);
  writer.writeInt(4);
  writer.writeByteString(signWithBytes);
  writer.writeTextString('address');
  writer.writeByteString(signWithBytes);
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

export interface Cip8SignDataParams {
  keyAgent: CardanoKeyAgent;
  request: CardanoSignDataRequest;
  knownAddresses: GroupedAddress[];
  dRepKeyHash?: Ed25519KeyHashHex;
}

/** Signs data per CIP-8 by constructing COSE structures without WASM. */
export const cip8SignData = async ({
  keyAgent,
  request,
  knownAddresses,
  dRepKeyHash,
}: Cip8SignDataParams): Promise<CardanoSignDataResult> => {
  const address = Cardano.Address.fromString(request.signWith);
  if (!address) {
    throw new Error(`Invalid address: ${request.signWith}`);
  }

  const { derivationPath, isDRepSigning } = resolveSigningContext({
    address,
    signWith: request.signWith,
    knownAddresses,
    dRepKeyHash,
  });

  const signWithBytes = isDRepSigning
    ? Buffer.from(address.getProps().paymentPart!.hash, 'hex')
    : Buffer.from(address.toBytes(), 'hex');

  const protectedHeadersBytes = createProtectedHeaders(
    signWithBytes,
    isDRepSigning,
  );
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
  const coseKey = createCoseKey(signWithBytes, publicKeyBytes);

  return {
    signature: HexBytes(HexBlob.fromBytes(coseSign1)),
    key: HexBytes(HexBlob.fromBytes(coseKey)),
  };
};
