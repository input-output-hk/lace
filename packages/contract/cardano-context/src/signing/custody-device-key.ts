import { Cardano } from '@cardano-sdk/core';
import { Ed25519PublicKeyHex, Ed25519SignatureHex } from '@cardano-sdk/crypto';
import { KeyPurpose, KeyRole } from '@cardano-sdk/key-management';
import { HexBlob } from '@cardano-sdk/util';
import {
  custodyDataSigStructure,
  custodyDeviceAccountIndex,
  deriveCustodyDeviceKey,
  encodeCustodyDataSignature,
} from '@lace-lib/cardano-custody';
import { hashEd25519PublicKey } from '@lace-lib/core';

import { createCardanoKeyAgentFromMnemonic } from './cardano-key-agent';

import type { CardanoVkeyWitness } from './vkey-witnesses';
import type { Bip32PublicKeyHex, Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  CustodyContractVersion,
  CustodyDataSignature,
  CustodyDataSignaturePayload,
} from '@lace-lib/cardano-custody';

/**
 * Which CIP-1854 account holds the custody device keys: the contract version
 * and the network decide it, so a testnet key never matches a Mainnet one.
 */
type CardanoCustodyDeviceAccount = {
  contractVersion: CustodyContractVersion;
  networkMagic: Cardano.NetworkMagic;
};

/**
 * The derived custody device key is not the expected one. The message is
 * fixed because the hosted signer forwards it to the dApp, and the derived
 * hash would link the passkey to its custody accounts without the user's
 * consent to share its custody key. Local callers read both hashes from the
 * properties.
 */
export class CardanoCustodyDeviceKeyMismatchError extends Error {
  public readonly code = 'custody-device-key-mismatch' as const;
  public constructor(
    readonly expectedKeyHash: Ed25519KeyHashHex,
    readonly derivedKeyHash: Ed25519KeyHashHex,
  ) {
    super('The custody device key does not match the expected key hash.');
    this.name = 'CardanoCustodyDeviceKeyMismatchError';
  }
}

type DeriveCardanoCustodyAccountPublicKeyFromWordsProps =
  CardanoCustodyDeviceAccount & {
    words: readonly string[];
  };

/** The words and the one device key of them that may sign. */
type CardanoCustodyDeviceSigning = CardanoCustodyDeviceAccount & {
  words: readonly string[];
  /** Payment key index `i` of m/1854'/1815'/a'/0/i. */
  deviceIndex: number;
  /** Hash the derived device key must have; any other key never signs. */
  expectedKeyHash: Ed25519KeyHashHex;
};

type SignCardanoCustodyTransactionWithWordsProps =
  CardanoCustodyDeviceSigning & {
    /** The transaction id: the body hash the witness signs. */
    txId: Cardano.TransactionId;
  };

/**
 * The words, the device key, and what the signature binds: the custody
 * account address, the site origin and the purpose, over the payload.
 */
type SignCardanoCustodyDataWithWordsProps = CardanoCustodyDeviceSigning &
  CustodyDataSignaturePayload;

const createCustodyKeyAgent = async ({
  words,
  contractVersion,
  networkMagic,
}: CardanoCustodyDeviceAccount & { words: readonly string[] }) =>
  createCardanoKeyAgentFromMnemonic({
    accountIndex: custodyDeviceAccountIndex(contractVersion, networkMagic),
    // The account index already separates networks; the key itself does not
    // depend on the chain the agent is created for.
    chainId: Cardano.ChainIds.Mainnet,
    mnemonicWords: [...words],
    purpose: KeyPurpose.MULTI_SIG,
  });

/**
 * The CIP-1854 account extended public key m/1854'/1815'/a' of the words, from
 * which every custody device key of the contract version on the network
 * derives without root material. `a` comes from `custodyDeviceAccountIndex`.
 * The agent is disposed before the key is returned.
 */
export const deriveCardanoCustodyAccountPublicKeyFromWords = async (
  props: DeriveCardanoCustodyAccountPublicKeyFromWordsProps,
): Promise<Bip32PublicKeyHex> => {
  const keyAgent = await createCustodyKeyAgent(props);
  try {
    return keyAgent.extendedAccountPublicKey;
  } finally {
    keyAgent.dispose?.();
  }
};

/**
 * Signs `blob` with exactly the custody device key m/1854'/1815'/a'/0/i of the
 * words, where `a` belongs to the contract version and network. The key is
 * derived with the shared custody library, and its hash is checked against
 * `expectedKeyHash` before anything is signed, so words for another device,
 * or for the same device on another network, never produce a signature. No
 * CIP-1852 key is derived. The agent is disposed after the call, including
 * on failure.
 */
const signWithCustodyDeviceKey = async ({
  words,
  deviceIndex,
  expectedKeyHash,
  contractVersion,
  networkMagic,
  blob,
}: CardanoCustodyDeviceSigning & {
  blob: HexBlob;
}): Promise<CardanoVkeyWitness> => {
  const keyAgent = await createCustodyKeyAgent({
    words,
    contractVersion,
    networkMagic,
  });
  try {
    const device = await deriveCustodyDeviceKey(
      keyAgent.extendedAccountPublicKey,
      deviceIndex,
    );
    if (!device.ok) {
      throw device.error.code === 'invalid-device-index'
        ? new RangeError(
            `Custody device index must be a soft derivation index, got ${deviceIndex}`,
          )
        : new Error('The custody key agent has an invalid account public key');
    }
    const normalizedExpectedKeyHash = expectedKeyHash.toLowerCase();
    if (device.value.keyHash !== normalizedExpectedKeyHash) {
      throw new CardanoCustodyDeviceKeyMismatchError(
        expectedKeyHash,
        device.value.keyHash,
      );
    }
    const { publicKey, signature } = await keyAgent.signBlob(
      { role: KeyRole.External, index: deviceIndex },
      blob,
    );
    // The agent derives its signing key from the root on its own path, so the
    // key that signed is checked as well as the one derived above.
    const vkey = Ed25519PublicKeyHex(publicKey);
    const signingKeyHash = hashEd25519PublicKey(vkey);
    if (signingKeyHash !== normalizedExpectedKeyHash) {
      throw new CardanoCustodyDeviceKeyMismatchError(
        expectedKeyHash,
        signingKeyHash,
      );
    }
    return { vkey, signature: Ed25519SignatureHex(signature) };
  } finally {
    keyAgent.dispose?.();
  }
};

/**
 * The vkey witness of the custody device key m/1854'/1815'/a'/0/i of the
 * words over `txId`. Only the key whose hash is `expectedKeyHash` signs.
 *
 * @throws `RangeError` When `deviceIndex` is not a soft derivation index.
 * @throws `CardanoCustodyDeviceKeyMismatchError` When the words derive another key.
 */
export const signCardanoCustodyTransactionWithWords = async ({
  txId,
  ...signing
}: SignCardanoCustodyTransactionWithWordsProps): Promise<CardanoVkeyWitness> =>
  signWithCustodyDeviceKey({ ...signing, blob: HexBlob(txId) });

/**
 * A CIP-8 data signature over `payload` by the custody device key
 * m/1854'/1815'/a'/0/i of the words, bound to the custody account `address`,
 * the site `origin` and `purpose`: the COSE_Sign1 and COSE_Key a verifier
 * checks against the account's listed devices. Only the key whose hash is
 * `expectedKeyHash` signs.
 *
 * @throws `RangeError` When `deviceIndex` is not a soft derivation index.
 * @throws `CardanoCustodyDeviceKeyMismatchError` When the words derive another key.
 * @throws `TypeError` When `origin` is not a serialized origin or `purpose`
 *   is unknown, before any key is derived.
 */
export const signCardanoCustodyDataWithWords = async ({
  address,
  origin,
  purpose,
  payload,
  ...signing
}: SignCardanoCustodyDataWithWordsProps): Promise<CustodyDataSignature> => {
  const message = { address, origin, purpose, payload };
  const { vkey, signature } = await signWithCustodyDeviceKey({
    ...signing,
    blob: custodyDataSigStructure(message),
  });
  return encodeCustodyDataSignature({
    ...message,
    publicKey: vkey,
    signature,
  });
};
