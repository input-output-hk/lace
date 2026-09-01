import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { HexBytes } from '@lace-lib/util';

import type {
  CardanoKeyAgent,
  CardanoSignDataRequest,
  CardanoSignDataResult,
} from './types';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';

/**
 * The `signWith` identifier is well-formed but this account holds no key for
 * it: a foreign or script DRep, or an address outside the known set. Callers
 * map this to CIP-30 DataSignError ProofGeneration (code 1).
 */
export class UnknownSignWithError extends Error {
  public constructor(info: string) {
    super(info);
    this.name = 'UnknownSignWithError';
  }
}

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
    // An unmatched reward account must refuse, never fall back to stake key
    // 0: a substitute-key signature cannot verify against the requested
    // credential and misattributes consent.
    if (!matchingAddress) {
      throw new UnknownSignWithError(
        `Unknown signWith reward account: ${signWith}`,
      );
    }
    if (matchingAddress.stakeKeyDerivationPath) {
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

  throw new UnknownSignWithError(`Unknown signWith address: ${signWith}`);
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

export interface ResolveSignDataContextParams {
  signWith: Cardano.PaymentAddress | Cardano.RewardAccount;
  knownAddresses: GroupedAddress[];
  dRepKeyHash?: Ed25519KeyHashHex;
}

/**
 * Resolves the signer a CIP-8 request maps to, without signing. The single
 * classification authority: pre-consent gates and the signing path both use
 * it, so a request refused up front can never sign later (and vice versa).
 *
 * @throws UnknownSignWithError when this account holds no key for `signWith`.
 */
export const resolveSignDataContext = ({
  signWith,
  knownAddresses,
  dRepKeyHash,
}: ResolveSignDataContextParams): SigningContext & {
  address: Cardano.Address;
} => {
  const address = Cardano.Address.fromString(signWith);
  if (!address) {
    throw new UnknownSignWithError(`Invalid address: ${signWith}`);
  }
  return {
    address,
    ...resolveSigningContext({
      address,
      signWith,
      knownAddresses,
      dRepKeyHash,
    }),
  };
};

export interface Cip8SignDataParams {
  /**
   * Only signBlob is required: COSE assembly happens here, so any signer able
   * to sign the Sig_structure bytes (in-memory or hardware) can be plugged in.
   */
  keyAgent: Pick<CardanoKeyAgent, 'signBlob'>;
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
  const { address, derivationPath, isDRepSigning } = resolveSignDataContext({
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
