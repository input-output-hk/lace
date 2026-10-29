import { Cardano, Serialization, util } from '@lace-lib/cardano-core';
import * as Crypto from '@lace-lib/cardano-crypto';
import { ComposableError } from '@lace-lib/util/common';

import { DREP_KEY_DERIVATION_PATH, STAKE_KEY_DERIVATION_PATH } from '../util';

import {
  ALGORITHM_EDDSA,
  COSE_HEADER_ALG,
  createCoseKeyCbor,
  createCoseSign1Cbor,
  createSigStructureCbor,
} from './coseUtils';

import type {
  AccountKeyDerivationPath,
  GroupedAddress,
  KeyAgent,
  KeyRole,
  MessageSender,
} from '../types';
import type { Cip8SignDataContext } from './types';
import type { Cip30DataSignature } from '@lace-lib/cardano-dapp-connector';
import type { HexBlob } from '@lace-lib/util/common';

export interface Cip30SignDataRequest {
  knownAddresses: GroupedAddress[];
  signWith: Cardano.PaymentAddress | Cardano.RewardAccount;
  payload: HexBlob;
  sender?: MessageSender;
}

export enum Cip30DataSignErrorCode {
  ProofGeneration = 1,
  AddressNotPK = 2,
  UserDeclined = 3,
}

export class Cip30DataSignError<
  InnerError = unknown,
> extends ComposableError<InnerError> {
  constructor(
    public readonly code: Cip30DataSignErrorCode,
    public readonly info: string,
    innerError?: InnerError,
  ) {
    super(`DataSignError code: ${code}`, innerError);
  }
}

export const getAddressBytes = (
  signWith: Cardano.PaymentAddress | Cardano.RewardAccount,
): Buffer => {
  const address = Cardano.Address.fromString(signWith);

  if (!address) {
    throw new Cip30DataSignError(
      Cip30DataSignErrorCode.AddressNotPK,
      'Invalid address',
    );
  }

  return Buffer.from(address.toBytes(), 'hex');
};

const isPaymentAddress = (
  signWith: Cardano.PaymentAddress | Cardano.RewardAccount,
): signWith is Cardano.PaymentAddress => signWith.startsWith('addr');

const getDerivationPath = async (
  signWith: Cardano.PaymentAddress | Cardano.RewardAccount,
  knownAddresses: GroupedAddress[],
  dRepKeyHash: Crypto.Ed25519KeyHashHex,
) => {
  const isRewardAccount = signWith.startsWith('stake');

  if (isRewardAccount) {
    const knownRewardAddress = knownAddresses.find(
      ({ rewardAccount }) => rewardAccount === signWith,
    );

    if (!knownRewardAddress)
      throw new Cip30DataSignError(
        Cip30DataSignErrorCode.ProofGeneration,
        'Unknown reward address',
      );

    return (
      knownRewardAddress.stakeKeyDerivationPath || STAKE_KEY_DERIVATION_PATH
    );
  }

  if (isPaymentAddress(signWith)) {
    const drepAddr = Cardano.Address.fromString(signWith);
    if (
      drepAddr?.getType() === Cardano.AddressType.EnterpriseKey &&
      drepAddr?.getProps().paymentPart?.hash === dRepKeyHash
    ) {
      return DREP_KEY_DERIVATION_PATH;
    }
  }

  const knownAddress = knownAddresses.find(
    ({ address }) => address === signWith,
  );

  if (!knownAddress) {
    throw new Cip30DataSignError(
      Cip30DataSignErrorCode.ProofGeneration,
      'Unknown address',
    );
  }

  return {
    index: knownAddress.index,
    role: knownAddress.type as number as KeyRole,
  };
};

// COSE header label of the key identifier (RFC 8152).
const COSE_HEADER_KID = 4;

/**
 * The protected headers of a CIP-30 data signature: the algorithm, the key
 * identifier and the CIP-8 `address` header, all three naming the signing
 * address, in the order the COSE library this signature was first produced
 * with wrote them.
 */
export const createProtectedHeadersWithKeyIdCbor = (
  addressBytes: Uint8Array,
): Uint8Array => {
  const writer = new Serialization.CborWriter();
  writer.writeStartMap(3);
  writer.writeInt(COSE_HEADER_ALG);
  writer.writeInt(ALGORITHM_EDDSA);
  writer.writeInt(COSE_HEADER_KID);
  writer.writeByteString(addressBytes);
  writer.writeTextString('address');
  writer.writeByteString(addressBytes);
  return writer.encode();
};

const signSigStructure = (
  keyAgent: KeyAgent,
  derivationPath: AccountKeyDerivationPath,
  sigStructure: Uint8Array,
) => {
  try {
    return keyAgent.signBlob(derivationPath, util.bytesToHex(sigStructure));
  } catch (error) {
    throw new Cip30DataSignError(
      Cip30DataSignErrorCode.UserDeclined,
      'Failed to sign',
      error,
    );
  }
};

/**
 * Sign data with 1 address.
 * Using CIP-0008 signature structure, with COSE headers/parameters as described in CIP-0030.
 * The COSE structures are written with the CBOR writer; no WASM is involved.
 *
 * @throws {Cip30DataSignError}
 */
export const cip30signData = async (
  keyAgent: KeyAgent,
  { knownAddresses, signWith, payload }: Cip8SignDataContext,
): Promise<Cip30DataSignature> => {
  const dRepKeyHash = Crypto.Ed25519PublicKey.fromHex(
    await keyAgent.derivePublicKey(DREP_KEY_DERIVATION_PATH),
  )
    .hash()
    .hex();

  const addressBytes = getAddressBytes(signWith);
  const derivationPath = await getDerivationPath(
    signWith,
    knownAddresses,
    dRepKeyHash,
  );

  const protectedHeaders = createProtectedHeadersWithKeyIdCbor(addressBytes);
  const payloadBytes = Buffer.from(payload, 'hex');
  const { signature, publicKey } = await signSigStructure(
    keyAgent,
    derivationPath,
    createSigStructureCbor(protectedHeaders, payloadBytes),
  );

  return {
    key: util.bytesToHex(createCoseKeyCbor(addressBytes, publicKey)),
    signature: util.bytesToHex(
      createCoseSign1Cbor(
        protectedHeaders,
        payloadBytes,
        Buffer.from(signature, 'hex'),
        false,
      ),
    ),
  };
};
