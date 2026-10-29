import { Serialization } from '@cardano-sdk/core';
import { CURRENT_CUSTODY_CONTRACT_VERSION } from '@lace-lib/cardano-custody';
import { HexBytes } from '@lace-lib/util';

import { encodeCborSet } from '../serialization/cbor-set-encoding';

import {
  deriveCardanoCustodyAccountPublicKeyFromWords,
  signCardanoCustodyDataWithWords,
  signCardanoCustodyTransactionWithWords,
} from './custody-device-key';
import { checkCardanoCustodySignDataRequest } from './custody-sign-data-request';
import {
  checkCardanoCustodySignRequest,
  checkOrdinaryCardanoTransaction,
  parseCardanoCustodyChainId,
} from './custody-sign-request';
import {
  parseAccountIndex,
  parseArray,
  parseChainId,
  parseExtendedAccountPublicKey,
  parseString,
} from './request-parsing';
import {
  deriveCardanoAccountPublicKeyFromWords,
  signCardanoDataWithWords,
  signCardanoTransactionWithWords,
} from './sign-with-words';

import type { SignCardanoCustodyDataPayload } from './custody-sign-data-request';
import type {
  CardanoCustodyPublicKeyPayload,
  SignCardanoCustodyTxPayload,
} from './custody-sign-request';
import type { CardanoSignDataResult, CardanoSignResult } from './types';
import type { CardanoVkeyWitness } from './vkey-witnesses';
import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { HexBlob } from '@cardano-sdk/util';
import type { CustodyDataSignature } from '@lace-lib/cardano-custody';

/** Public account data every remote Cardano sign request carries. */
type RemoteAccountPayload = {
  knownAddresses: unknown;
  accountIndex: unknown;
  chainId: unknown;
  extendedAccountPublicKey: unknown;
};

export type SignCardanoTxPayload = RemoteAccountPayload & {
  serializedTx: unknown;
  utxo: unknown;
};

export type SignCardanoDataPayload = RemoteAccountPayload & {
  signWith: unknown;
  payload: unknown;
};

export type CardanoAccountPublicKeyPayload = { accountIndex: unknown };

/** The public identity of one account: what a dApp needs to find its addresses. */
export type CardanoAccountPublicKeyResult = {
  accountIndex: number;
  extendedAccountPublicKey: Bip32PublicKeyHex;
};

/**
 * The CIP-1854 account extended public key m/1854'/1815'/a' whose role 0
 * keys are this passkey's custody device keys on the requested network.
 */
type CardanoCustodyPublicKeyResult = {
  extendedAccountPublicKey: Bip32PublicKeyHex;
};

/**
 * The device's witness for a custody transaction: a transaction witness set
 * in CBOR hex holding only the device key's vkey witness, never a whole
 * transaction, so the caller merges it into its own copy.
 */
type CardanoCustodySignResult = { witnessSet: HexBlob };

/**
 * A custody device's CIP-8 signature over a payload: the COSE_Sign1, whose
 * protected header binds the custody account address, the dApp origin and
 * the purpose, and the COSE_Key of the device key, both in CBOR hex, with the
 * origin the signature binds.
 */
type CardanoCustodySignDataResult = CustodyDataSignature & {
  origin: string;
};

/** Handlers for the Cardano request kinds of the remote signer protocol. */
export type CardanoSignerHandlers = {
  'sign-cardano-tx': (
    payload: SignCardanoTxPayload,
  ) => Promise<CardanoSignResult>;
  'sign-cardano-data': (
    payload: SignCardanoDataPayload,
  ) => Promise<CardanoSignDataResult>;
  'cardano-account-public-key': (
    payload: CardanoAccountPublicKeyPayload,
  ) => Promise<CardanoAccountPublicKeyResult>;
  'cardano-custody-public-key': (
    payload: CardanoCustodyPublicKeyPayload,
  ) => Promise<CardanoCustodyPublicKeyResult>;
  'sign-cardano-custody-tx': (
    payload: SignCardanoCustodyTxPayload,
  ) => Promise<CardanoCustodySignResult>;
  /** Refuses a request without `dappOrigin`, the origin the signature binds. */
  'sign-cardano-custody-data': (
    payload: SignCardanoCustodyDataPayload,
    dappOrigin?: string,
  ) => Promise<CardanoCustodySignDataResult>;
};

/** Runs `use` with the words of a fresh passkey assertion. */
export type WithMnemonicWords = <T>(
  use: (words: readonly string[]) => Promise<T>,
) => Promise<T>;

export type CreateCardanoSignerHandlersProps = {
  withMnemonicWords: WithMnemonicWords;
  /**
   * POSIX milliseconds now, for refusing a custody grant issued with an
   * expiry already past; defaults to the system clock.
   */
  now?: () => number;
};

const parseAccount = ({
  knownAddresses,
  accountIndex,
  chainId,
  extendedAccountPublicKey,
}: RemoteAccountPayload) => ({
  knownAddresses: parseArray<GroupedAddress>(knownAddresses, 'knownAddresses'),
  accountIndex: parseAccountIndex(accountIndex),
  chainId: parseChainId(chainId),
  extendedAccountPublicKey: parseExtendedAccountPublicKey(
    extendedAccountPublicKey,
  ),
});

// Map key of the vkey witnesses in a transaction witness set.
const VKEY_WITNESSES_KEY = 0;

/**
 * A witness set holding one vkey witness, with the set encoded the way the
 * transaction encodes its own sets, so merging it keeps the transaction
 * consistent.
 */
const vkeyWitnessSetOf = (
  transaction: Serialization.Transaction,
  { vkey, signature }: CardanoVkeyWitness,
): HexBlob => {
  const vkeys = encodeCborSet(
    [Serialization.VkeyWitness.fromCore([vkey, signature]).toCbor()],
    transaction.body().hasTaggedSets(),
  );
  const writer = new Serialization.CborWriter();
  writer.writeStartMap(1);
  writer.writeInt(VKEY_WITNESSES_KEY);
  writer.writeEncodedValue(Buffer.from(vkeys, 'hex'));
  return writer.encodeAsHex();
};

/**
 * Builds the signer-side handlers for the Cardano request kinds. Before the
 * assertion starts, the payload's `chainId` must carry a networkId and a
 * non-negative safe integer networkMagic, `accountIndex` must be a
 * non-negative safe integer, `extendedAccountPublicKey` must be 128 hex
 * characters, `knownAddresses` (and `utxo` for a transaction) must be
 * arrays, and `serializedTx` (or `signWith` and `payload` for a data
 * request) must be non-empty strings; anything else is refused as a
 * {@link MalformedRequestError} and never costs the user a ceremony.
 * The networkId must identify Cardano mainnet or testnet.
 * Each signature runs inside its own assertion, so every approval maps to
 * exactly one signature and the words never outlive the sign call.
 * An account public key request carries only `accountIndex`, checked the
 * same way before the assertion; it answers the account's extended public
 * key from its own assertion and signs nothing, so no network is involved.
 *
 * The ordinary transaction kind derives only CIP-1852 keys, and it refuses a
 * transaction that touches a Cardano custody account beyond a deposit with
 * `custody-request-required` before the assertion, because its consent cannot
 * show a custody state change. Custody transactions use their own kind: it
 * runs every custody check on the exact bytes before the assertion, so a
 * path that skips the consent description never obtains a witness, and then
 * signs with exactly the CIP-1854 device key the request names, refusing
 * words that derive another key. The custody data kind checks that the
 * account record re-derives and that the reported control UTxO runs a known
 * logic and lists the device before the assertion, then signs the payload
 * as CIP-8 data bound to the account address, the requesting dApp's origin
 * and the purpose with that same device key. The custody public key kind
 * answers the CIP-1854 account key for the requested network and signs
 * nothing.
 */
export const createCardanoSignerHandlers = ({
  withMnemonicWords,
  now = Date.now,
}: CreateCardanoSignerHandlersProps): CardanoSignerHandlers => ({
  'sign-cardano-tx': async ({ serializedTx, utxo, ...payload }) => {
    const validSerializedTx = parseString(serializedTx, 'serializedTx');
    const account = parseAccount(payload);
    const parsedUtxo = parseArray<Cardano.Utxo>(utxo, 'utxo');
    checkOrdinaryCardanoTransaction(validSerializedTx);
    return withMnemonicWords(async words =>
      signCardanoTransactionWithWords({
        words,
        serializedTx: HexBytes(validSerializedTx),
        utxo: parsedUtxo,
        ...account,
      }),
    );
  },
  'sign-cardano-data': async ({ signWith, payload, ...accountPayload }) => {
    const validSignWith = parseString(signWith, 'signWith');
    const validPayload = parseString(payload, 'payload');
    const account = parseAccount(accountPayload);
    return withMnemonicWords(async words =>
      signCardanoDataWithWords({
        words,
        signWith: validSignWith as
          | Cardano.PaymentAddress
          | Cardano.RewardAccount,
        payload: validPayload,
        ...account,
      }),
    );
  },
  'cardano-account-public-key': async ({ accountIndex }) => {
    const validAccountIndex = parseAccountIndex(accountIndex);
    return withMnemonicWords(async words => ({
      accountIndex: validAccountIndex,
      extendedAccountPublicKey: await deriveCardanoAccountPublicKeyFromWords({
        words,
        accountIndex: validAccountIndex,
      }),
    }));
  },
  'cardano-custody-public-key': async ({ chainId }) => {
    const { networkMagic } = parseCardanoCustodyChainId(chainId);
    return withMnemonicWords(async words => ({
      extendedAccountPublicKey:
        await deriveCardanoCustodyAccountPublicKeyFromWords({
          words,
          contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
          networkMagic,
        }),
    }));
  },
  'sign-cardano-custody-tx': async payload => {
    const { transaction, txId, chainId, identity, device } =
      await checkCardanoCustodySignRequest(payload, { now: now() });
    const witness = await withMnemonicWords(async words =>
      signCardanoCustodyTransactionWithWords({
        words,
        txId,
        deviceIndex: device.index,
        expectedKeyHash: device.keyHash,
        contractVersion: identity.contractVersion,
        networkMagic: chainId.networkMagic,
      }),
    );
    return { witnessSet: vkeyWitnessSetOf(transaction, witness) };
  },
  'sign-cardano-custody-data': async (payload, dappOrigin) => {
    const {
      chainId,
      identity,
      device,
      payload: data,
      purpose,
      origin,
    } = await checkCardanoCustodySignDataRequest(payload, {
      origin: dappOrigin,
    });
    const signed = await withMnemonicWords(async words =>
      signCardanoCustodyDataWithWords({
        words,
        address: identity.address,
        origin,
        purpose,
        payload: data,
        deviceIndex: device.index,
        expectedKeyHash: device.keyHash,
        contractVersion: identity.contractVersion,
        networkMagic: chainId.networkMagic,
      }),
    );
    return { ...signed, origin };
  },
});
