import { Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import {
  CardanoCustodyDeviceKeyMismatchError,
  checkCardanoCustodySignDataRequest,
  checkCardanoCustodySignRequest,
  signCardanoCustodyDataWithWords,
  signCardanoCustodyTransactionWithWords,
} from '@lace-contract/cardano-context';
import {
  isCustodyDataOrigin,
  serializeCustodyRequestedGrantScope,
} from '@lace-lib/cardano-custody';
import { RemoteSignerError } from '@lace-lib/passkey';

import { RemoteSignerResultError } from '../cardano-remote-signer-factory';
import { PasskeyWalletMismatchError } from '../passkey-wallet-mismatch-error';

import { CardanoCustodyUnsupportedSignerError } from './cardano-custody-errors';
import { vkeyWitnessSetOf } from './cardano-custody-witnesses';

import type { RemoteSignerRequester } from '../cardano-remote-signer-factory';
import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  CardanoCustodyDataPurpose as ContextCardanoCustodyDataPurpose,
  CardanoCustodyDeviceBinding,
} from '@lace-contract/cardano-context';
import type {
  CustodyAccountRecord,
  CustodyRequestedGrantScope,
} from '@lace-lib/cardano-custody';
import type {
  PasskeyKeySource,
  SignerRequestPayloads,
} from '@lace-lib/passkey';

/**
 * A grant an owner operation issues, as the app declares it to the device:
 * the hosted signer refuses a transaction that issues any other grant, or
 * leaves one it issues undeclared. A replacement declares only its new
 * grant. Recipients are bech32 payment addresses on the account network.
 */
export type CardanoCustodyRequestedGrantScope = CustodyRequestedGrantScope;

/** What a device signs: one finalized, unsigned custody transaction. */
export type CardanoCustodyDeviceSignRequest = {
  /** Unsigned transaction CBOR; the device signs its body hash. */
  transaction: HexBlob;
  /** The output of every input, reference input and collateral input. */
  resolvedInputs: readonly Cardano.Utxo[];
  accountRecord: CustodyAccountRecord;
  chainId: Cardano.ChainId;
  /** The device key that must sign; any other key never signs. */
  device: CardanoCustodyDeviceBinding;
  /** The grants an owner operation issues. */
  requestedScopes?: readonly CardanoCustodyRequestedGrantScope[];
  /**
   * The account's grant UTxOs, at most 16. The consent reads from them who
   * holds a grant the operation revokes and which devices hold grants, and
   * labels both as reported by the app: the chain is not consulted.
   */
  grantUtxos?: readonly Cardano.Utxo[];
  /**
   * What the metadata under each label the transaction carries means, by
   * decimal label, such as `{ 674: 'Payment reference for your subscription' }`.
   * The consent shows each beside the metadata read from the bytes, labelled
   * as reported by the app; a label the transaction does not carry is
   * refused.
   */
  metadataMeanings?: Readonly<Record<string, string>>;
};

/**
 * What a custody data signature is for, as the device's consent names it:
 * signing in to the requesting site, or linking the custody account to the
 * user's account there.
 */
export type CardanoCustodyDataPurpose = ContextCardanoCustodyDataPurpose;

/** What a device signs to prove that it controls a custody account. */
export type CardanoCustodyDeviceSignDataRequest = {
  /** The bytes to sign, as hex: a challenge the verifying site issued. */
  payload: HexBlob;
  purpose: CardanoCustodyDataPurpose;
  accountRecord: CustodyAccountRecord;
  /** The account's control UTxO, whose state must list the device. */
  controlUtxo: Cardano.Utxo;
  chainId: Cardano.ChainId;
  /** The device key that must sign; any other key never signs. */
  device: CardanoCustodyDeviceBinding;
};

/**
 * A CIP-30 `DataSignature` by a custody device key, with the origin it is
 * for: the COSE_Sign1, whose protected header binds the custody account
 * address, the site origin and the purpose, and the COSE_Key of the device
 * key, both in CBOR hex.
 */
export type CardanoCustodyDataSignature = {
  signature: HexBlob;
  key: HexBlob;
  /**
   * The origin of the site the signature is for, as `scheme://host[:port]`:
   * the requesting site as the hosted signer saw it, or the local signer's
   * own origin. Only that site accepts the signature.
   */
  origin: string;
};

/**
 * Signs custody transactions, and data that proves control of a custody
 * account, with one passkey's custody device key. A transaction signature
 * answers transaction witness set CBOR holding only the device key's vkey
 * witness, never a whole transaction: the caller verifies the witness and
 * merges it into its own copy.
 *
 * Implementations reject when the user declines, when the passkey derives
 * another key than `device.keyHash`, and when the signer refuses the request;
 * a refusal carries the signer's `code`, such as `custody-device-not-listed`.
 * Both SDK implementations sign data; a signer without `signData` cannot
 * prove control.
 */
export interface CardanoCustodyDeviceSigner {
  signTransaction(request: CardanoCustodyDeviceSignRequest): Promise<HexBlob>;
  signData?(
    request: CardanoCustodyDeviceSignDataRequest,
  ): Promise<CardanoCustodyDataSignature>;
}

const unspentOutputCbor = ([input, output]: Cardano.Utxo): string =>
  Serialization.TransactionUnspentOutput.fromCore([
    { txId: input.txId, index: input.index },
    output,
  ]).toCbor();

/** The request in the `sign-cardano-custody-tx` protocol payload shape. */
const custodySignPayloadOf = ({
  transaction,
  resolvedInputs,
  accountRecord,
  chainId,
  device,
  requestedScopes,
  grantUtxos,
  metadataMeanings,
}: CardanoCustodyDeviceSignRequest) => ({
  serializedTx: transaction,
  chainId: { networkId: chainId.networkId, networkMagic: chainId.networkMagic },
  device: {
    extendedAccountPublicKey: device.extendedAccountPublicKey,
    index: device.index,
  },
  resolvedInputs: resolvedInputs.map(unspentOutputCbor),
  accountRecord,
  ...(requestedScopes && {
    requestedScopes: requestedScopes.map(serializeCustodyRequestedGrantScope),
  }),
  ...(grantUtxos && { grantUtxos: grantUtxos.map(unspentOutputCbor) }),
  ...(metadataMeanings && { metadataMeanings: { ...metadataMeanings } }),
});

/** The request in the `sign-cardano-custody-data` protocol payload shape. */
const custodySignDataPayloadOf = ({
  payload,
  purpose,
  accountRecord,
  controlUtxo,
  chainId,
  device,
}: CardanoCustodyDeviceSignDataRequest) => ({
  chainId: { networkId: chainId.networkId, networkMagic: chainId.networkMagic },
  device: {
    extendedAccountPublicKey: device.extendedAccountPublicKey,
    index: device.index,
  },
  accountRecord,
  controlUtxo: unspentOutputCbor(controlUtxo),
  payload,
  purpose,
});

export type CreateLocalCardanoCustodyDeviceSignerProps = {
  /** The passkey whose words derive the device key. */
  keySource: PasskeyKeySource;
  /**
   * The origin data signatures bind, as `scheme://host[:port]` exactly as a
   * browser serializes it: the app's own origin, such as `location.origin`,
   * since the app is the site that verifies them. Without it, `signData`
   * refuses before any ceremony.
   */
  origin?: string;
  /** POSIX milliseconds now; defaults to the system clock. */
  now?: () => number;
};

/**
 * Refuses a device bound to another channel or credential than the key
 * source's passkey.
 */
const assertLocalChannel = (
  keySource: PasskeyKeySource,
  { channel }: CardanoCustodyDeviceBinding,
): void => {
  const credential = keySource.credentialRef();
  if (
    channel.type !== 'local' ||
    (credential &&
      (credential.credentialId !== channel.credentialId ||
        credential.rpId !== channel.rpId))
  ) {
    throw new PasskeyWalletMismatchError();
  }
};

/**
 * Refuses a request whose account public key and index derive another key
 * than the binding names.
 */
const assertBoundKey = (
  device: CardanoCustodyDeviceBinding,
  derivedKeyHash: Ed25519KeyHashHex,
): void => {
  if (derivedKeyHash !== device.keyHash.toLowerCase()) {
    throw new CardanoCustodyDeviceKeyMismatchError(
      device.keyHash,
      derivedKeyHash,
    );
  }
};

/**
 * A device signer for a passkey this app holds itself. The app is the only
 * consent surface in local mode, so the signer first runs the hosted
 * signer's custody checks on the exact bytes and context, and refuses the
 * same requests before any ceremony with the hosted signer's codes: a
 * `CardanoCustodyRequestRefusedError`, or an error whose `code` is
 * `malformed-request`, which a data request without a serialized `origin`
 * also gets. Each signature then takes one fresh passkey assertion: the
 * device key is derived from its words and checked against `device.keyHash`
 * before it signs. Data signatures bind `origin`.
 *
 * It refuses a device bound to another channel or credential with
 * {@link PasskeyWalletMismatchError}.
 */
export const createLocalCardanoCustodyDeviceSigner = ({
  keySource,
  origin,
  now = Date.now,
}: CreateLocalCardanoCustodyDeviceSignerProps): Required<CardanoCustodyDeviceSigner> => ({
  signTransaction: async request => {
    assertLocalChannel(keySource, request.device);
    const check = await checkCardanoCustodySignRequest(
      custodySignPayloadOf(request),
      { now: now() },
    );
    assertBoundKey(request.device, check.device.keyHash);
    const witness = await keySource.withPasskeyMnemonic(async words =>
      signCardanoCustodyTransactionWithWords({
        words,
        txId: check.txId,
        deviceIndex: check.device.index,
        expectedKeyHash: check.device.keyHash,
        contractVersion: check.identity.contractVersion,
        networkMagic: check.chainId.networkMagic,
      }),
    );
    return vkeyWitnessSetOf([witness]);
  },
  signData: async request => {
    assertLocalChannel(keySource, request.device);
    const check = await checkCardanoCustodySignDataRequest(
      custodySignDataPayloadOf(request),
      { origin },
    );
    assertBoundKey(request.device, check.device.keyHash);
    const signed = await keySource.withPasskeyMnemonic(async words =>
      signCardanoCustodyDataWithWords({
        words,
        address: check.identity.address,
        origin: check.origin,
        purpose: check.purpose,
        payload: check.payload,
        deviceIndex: check.device.index,
        expectedKeyHash: check.device.keyHash,
        contractVersion: check.identity.contractVersion,
        networkMagic: check.chainId.networkMagic,
      }),
    );
    return { ...signed, origin: check.origin };
  },
});

/**
 * The signer answers a request kind it does not serve with this code. An
 * `unexpected` answer is a failure of a kind it does serve, such as a
 * WebAuthn error, so it is passed through rather than read as missing
 * support.
 */
const UNSUPPORTED_REQUEST_CODE = 'unsupported-request';

/**
 * Sends a custody request to the hosted signer, turning the answer of a
 * signer that does not serve custody requests into
 * {@link CardanoCustodyUnsupportedSignerError}.
 */
export const requestCustodySigner = async <
  Kind extends
    | 'cardano-custody-public-key'
    | 'sign-cardano-custody-data'
    | 'sign-cardano-custody-tx',
>(
  signer: RemoteSignerRequester,
  kind: Kind,
  payload: SignerRequestPayloads[Kind],
): Promise<unknown> => {
  try {
    return await signer.request(kind, payload);
  } catch (error) {
    if (
      error instanceof RemoteSignerError &&
      error.code === UNSUPPORTED_REQUEST_CODE
    ) {
      throw new CardanoCustodyUnsupportedSignerError(error.code);
    }
    throw error;
  }
};

const HEX_PATTERN = /^(?:[\da-f]{2})+$/i;

const hexField = (result: unknown, field: string): HexBlob => {
  const value =
    typeof result === 'object' && result !== null && field in result
      ? (result as Record<string, unknown>)[field]
      : undefined;
  if (typeof value !== 'string' || !HEX_PATTERN.test(value)) {
    throw new RemoteSignerResultError();
  }
  return HexBlob(value.toLowerCase());
};

/** The origin a hosted signer says its data signature binds. */
const originField = (result: unknown): string => {
  const value =
    typeof result === 'object' && result !== null && 'origin' in result
      ? result.origin
      : undefined;
  if (!isCustodyDataOrigin(value)) throw new RemoteSignerResultError();
  return value;
};

/**
 * A device signer backed by the hosted Lace signer page, such as the
 * `RemotePasskeySigner` from `createRemotePasskeySigner`. The page shows the
 * custody consent, derives the device key from a fresh assertion and checks
 * it against the requested device before it signs. A data signature binds
 * the origin of this app as the page saw it.
 *
 * It refuses a device bound to a local passkey with
 * {@link PasskeyWalletMismatchError}, and a signer that does not support
 * custody requests, or custody data requests, with
 * {@link CardanoCustodyUnsupportedSignerError}.
 */
export const createRemoteCardanoCustodyDeviceSigner = (
  signer: RemoteSignerRequester,
): Required<CardanoCustodyDeviceSigner> => ({
  signTransaction: async request => {
    if (request.device.channel.type !== 'hosted') {
      throw new PasskeyWalletMismatchError();
    }
    const result = await requestCustodySigner(
      signer,
      'sign-cardano-custody-tx',
      custodySignPayloadOf(request),
    );
    return hexField(result, 'witnessSet');
  },
  signData: async request => {
    if (request.device.channel.type !== 'hosted') {
      throw new PasskeyWalletMismatchError();
    }
    const result = await requestCustodySigner(
      signer,
      'sign-cardano-custody-data',
      custodySignDataPayloadOf(request),
    );
    return {
      signature: hexField(result, 'signature'),
      key: hexField(result, 'key'),
      origin: originField(result),
    };
  },
});
