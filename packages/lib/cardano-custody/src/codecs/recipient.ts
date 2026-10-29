// Ported from Biglup/cardano-account-custody-contract offchain/src/data.ts at
// revision b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for
// Lace: recipients stay Plutus address data instead of bech32, credentials
// decode only from their two canonical constructors, and conversion to an
// address takes the account's network explicitly.

import { Cardano } from '@cardano-sdk/core';

import { isHash28Hex } from '../hex';
import { fail, ok } from '../result';

import {
  bytes,
  constr,
  expectBytes,
  expectConstr,
  expectConstrIndex,
  expectInt,
  fieldPath,
  unknownAlternative,
} from './plutus-data';

import type { CustodyResult } from '../result';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import type { HexBlob } from '@cardano-sdk/util';

/**
 * A payment or stake credential as the script context presents it. The hash
 * is not length-checked when decoded from chain; see the state violations.
 */
interface CustodyCredential {
  readonly type: Cardano.CredentialType;
  readonly hash: HexBlob;
}

type CustodyStakeCredential =
  | {
      readonly certificateIndex: bigint;
      readonly kind: 'pointer';
      readonly slot: bigint;
      readonly transactionIndex: bigint;
    }
  | { readonly credential: CustodyCredential; readonly kind: 'inline' };

/**
 * A grant recipient: a Plutus V3 address, which carries no network id. It
 * becomes a Cardano address only together with the account's network.
 */
export interface CustodyRecipient {
  readonly paymentCredential: CustodyCredential;
  readonly stakeCredential?: CustodyStakeCredential;
}

interface CustodyUnsupportedRecipientAddress {
  readonly code: 'unsupported-recipient-address';
  readonly addressType: Cardano.AddressType;
}

interface CustodyUnrepresentableRecipient {
  readonly code: 'unrepresentable-recipient';
  readonly recipient: CustodyRecipient;
}

const credentialFrom = (credential: Cardano.Credential): CustodyCredential => ({
  type: credential.type,
  hash: credential.hash as string as HexBlob,
});

/**
 * The recipient form of a Shelley payment address. Base, enterprise and
 * pointer addresses have one; reward and Byron addresses do not.
 */
export const custodyRecipientFromAddress = (
  address: Cardano.Address,
): CustodyResult<CustodyRecipient, CustodyUnsupportedRecipientAddress> => {
  const base = address.asBase();
  if (base) {
    return ok({
      paymentCredential: credentialFrom(base.getPaymentCredential()),
      stakeCredential: {
        kind: 'inline',
        credential: credentialFrom(base.getStakeCredential()),
      },
    });
  }
  const enterprise = address.asEnterprise();
  if (enterprise) {
    return ok({
      paymentCredential: credentialFrom(enterprise.getPaymentCredential()),
    });
  }
  const pointer = address.asPointer();
  if (pointer) {
    const { slot, txIndex, certIndex } = pointer.getStakePointer();
    return ok({
      paymentCredential: credentialFrom(pointer.getPaymentCredential()),
      stakeCredential: {
        kind: 'pointer',
        slot,
        transactionIndex: BigInt(txIndex),
        certificateIndex: BigInt(certIndex),
      },
    });
  }
  return fail({
    code: 'unsupported-recipient-address',
    addressType: address.getType(),
  });
};

const isPointerIndex = (value: bigint): boolean =>
  value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Whether a recipient names an address Cardano can encode: 28-byte credential
 * hashes and, for a pointer, non-negative indices that fit a pointer address.
 */
export const isRepresentableRecipient = (
  recipient: CustodyRecipient,
): boolean => {
  if (!isHash28Hex(recipient.paymentCredential.hash)) return false;
  const stake = recipient.stakeCredential;
  if (!stake) return true;
  if (stake.kind === 'inline') return isHash28Hex(stake.credential.hash);
  return (
    stake.slot >= 0n &&
    isPointerIndex(stake.transactionIndex) &&
    isPointerIndex(stake.certificateIndex)
  );
};

const toCardanoCredential = (
  credential: CustodyCredential,
): Cardano.Credential => ({
  type: credential.type,
  hash: credential.hash as string as Hash28ByteBase16,
});

/** The address of a recipient the caller has checked is representable. */
export const addressOfRepresentableRecipient = (
  recipient: CustodyRecipient,
  networkId: Cardano.NetworkId,
): Cardano.Address => {
  const payment = toCardanoCredential(recipient.paymentCredential);
  const stake = recipient.stakeCredential;
  if (!stake) {
    return Cardano.EnterpriseAddress.fromCredentials(
      networkId,
      payment,
    ).toAddress();
  }
  if (stake.kind === 'inline') {
    return Cardano.BaseAddress.fromCredentials(
      networkId,
      payment,
      toCardanoCredential(stake.credential),
    ).toAddress();
  }
  // PointerAddress.fromCredentials mistypes a script payment credential as a
  // base address, so the pointer address is assembled from its parts.
  return new Cardano.Address({
    type:
      payment.type === Cardano.CredentialType.ScriptHash
        ? Cardano.AddressType.PointerScript
        : Cardano.AddressType.PointerKey,
    networkId,
    paymentPart: payment,
    pointer: {
      slot: stake.slot,
      txIndex: Cardano.TxIndex(Number(stake.transactionIndex)),
      certIndex: Cardano.CertIndex(Number(stake.certificateIndex)),
    },
  });
};

/** The address a recipient stands for on the given network. */
export const custodyRecipientToAddress = (
  recipient: CustodyRecipient,
  networkId: Cardano.NetworkId,
): CustodyResult<Cardano.Address, CustodyUnrepresentableRecipient> =>
  isRepresentableRecipient(recipient)
    ? ok(addressOfRepresentableRecipient(recipient, networkId))
    : fail({ code: 'unrepresentable-recipient', recipient });

/** A value two recipients share exactly when their Plutus data is equal. */
export const recipientKey = (recipient: CustodyRecipient): string => {
  const credentialKey = ({ type, hash }: CustodyCredential) =>
    `${type}:${hash}`;
  const stake = recipient.stakeCredential;
  const stakeKey = !stake
    ? 'none'
    : stake.kind === 'inline'
    ? `inline:${credentialKey(stake.credential)}`
    : `pointer:${stake.slot}:${stake.transactionIndex}:${stake.certificateIndex}`;
  return `${credentialKey(recipient.paymentCredential)}/${stakeKey}`;
};

const CREDENTIAL_CONSTRUCTOR: Record<Cardano.CredentialType, number> = {
  [Cardano.CredentialType.KeyHash]: 0,
  [Cardano.CredentialType.ScriptHash]: 1,
};

const encodeCredential = (credential: CustodyCredential): Cardano.PlutusData =>
  constr(CREDENTIAL_CONSTRUCTOR[credential.type], [bytes(credential.hash)]);

const decodeCredential = (
  data: Cardano.PlutusData,
  path: string,
): CustodyCredential => {
  const index = expectConstrIndex(data, path, 'a credential');
  const type =
    index === 0n
      ? Cardano.CredentialType.KeyHash
      : index === 1n
      ? Cardano.CredentialType.ScriptHash
      : unknownAlternative(path, 'a key or script credential', index);
  const [hash] = expectConstr(
    data,
    { index: Number(index), arity: 1 },
    { path, what: 'a credential' },
  );
  return { type, hash: expectBytes(hash, fieldPath(path, 'hash'), 'a hash') };
};

const encodeStakeCredential = (
  stake: CustodyStakeCredential,
): Cardano.PlutusData =>
  stake.kind === 'inline'
    ? constr(0, [encodeCredential(stake.credential)])
    : constr(1, [stake.slot, stake.transactionIndex, stake.certificateIndex]);

const decodeStakeCredential = (
  data: Cardano.PlutusData,
  path: string,
): CustodyStakeCredential => {
  const index = expectConstrIndex(data, path, 'a stake credential');
  if (index === 0n) {
    const [credential] = expectConstr(
      data,
      { index: 0, arity: 1 },
      { path, what: 'an inline stake credential' },
    );
    return {
      kind: 'inline',
      credential: decodeCredential(credential, fieldPath(path, 'credential')),
    };
  }
  if (index !== 1n) {
    return unknownAlternative(
      path,
      'an inline or pointer stake credential',
      index,
    );
  }
  const [slot, transactionIndex, certificateIndex] = expectConstr(
    data,
    { index: 1, arity: 3 },
    { path, what: 'a stake pointer' },
  );
  return {
    kind: 'pointer',
    slot: expectInt(slot, fieldPath(path, 'slot'), 'a slot'),
    transactionIndex: expectInt(
      transactionIndex,
      fieldPath(path, 'transactionIndex'),
      'a transaction index',
    ),
    certificateIndex: expectInt(
      certificateIndex,
      fieldPath(path, 'certificateIndex'),
      'a certificate index',
    ),
  };
};

/** `Address { payment_credential, stake_credential: Option<StakeCredential> }`. */
export const encodeRecipient = (
  recipient: CustodyRecipient,
): Cardano.PlutusData =>
  constr(0, [
    encodeCredential(recipient.paymentCredential),
    recipient.stakeCredential
      ? constr(0, [encodeStakeCredential(recipient.stakeCredential)])
      : constr(1),
  ]);

export const decodeRecipient = (
  data: Cardano.PlutusData,
  path: string,
): CustodyRecipient => {
  const [payment, optionalStake] = expectConstr(
    data,
    { index: 0, arity: 2 },
    { path, what: 'an address' },
  );
  const paymentCredential = decodeCredential(
    payment,
    fieldPath(path, 'paymentCredential'),
  );
  const stakePath = fieldPath(path, 'stakeCredential');
  const option = expectConstrIndex(optionalStake, stakePath, 'an option');
  if (option === 1n) {
    expectConstr(
      optionalStake,
      { index: 1, arity: 0 },
      { path: stakePath, what: 'None' },
    );
    return { paymentCredential };
  }
  if (option !== 0n) {
    return unknownAlternative(stakePath, 'Some or None', option);
  }
  const [stake] = expectConstr(
    optionalStake,
    { index: 0, arity: 1 },
    { path: stakePath, what: 'Some' },
  );
  return {
    paymentCredential,
    stakeCredential: decodeStakeCredential(stake, stakePath),
  };
};
