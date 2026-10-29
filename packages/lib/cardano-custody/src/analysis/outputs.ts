// Ported from Biglup/cardano-account-custody-contract
// lib/cardano_account_custody_contract/account.ak at revision
// b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for Lace:
// outputs are read from @cardano-sdk/core transaction outputs, addresses are
// classified against every supported contract version, and addresses are
// compared as the script context presents them, without a network id.

import { Cardano, Serialization } from '@cardano-sdk/core';

import {
  decodeCustodyAccountState,
  decodeCustodyGrant,
} from '../codecs/account-state';
import { custodyRecipientFromAddress, recipientKey } from '../codecs/recipient';
import {
  findCustodyLogic,
  SUPPORTED_CUSTODY_CONTRACT_VERSIONS,
} from '../contract-version';
import { CUSTODY_SLOT_LIMIT, custodyGrantAssetId } from '../tokens';

import { assetNameOf, policyIdOf, valueDeltaOf } from './value';

import type {
  CustodyAccountState,
  CustodyGrant,
} from '../codecs/account-state';
import type { CustodyContractVersion } from '../contract-version';
import type { CustodyValueDelta } from './value';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

/** How an output carries a datum. */
export type CustodyDatumKind = 'hash' | 'inline' | 'none';

/**
 * What an address is to a supported custody contract version. `account` is
 * a custody account address: the account validator as payment credential
 * and an inline script stake credential. `unspendable` pays the account
 * validator with no, a key or a pointer stake part, which no redeemer can
 * ever spend.
 */
type CustodyAddressClass =
  | {
      readonly contractVersion: CustodyContractVersion;
      readonly kind: 'account';
      readonly stakeScriptHash: Hash28ByteBase16;
    }
  | {
      readonly contractVersion: CustodyContractVersion;
      readonly kind: 'unspendable';
    }
  | { readonly kind: 'other' };

/**
 * The two hashes that name one custody account: its account validator, which
 * fixes the contract version, and its stake script.
 */
export interface CustodyAccountHashes {
  readonly accountValidatorHash: Hash28ByteBase16;
  readonly stakeScriptHash: Hash28ByteBase16;
}

/** A transaction output, or a spent input's resolution, read once. */
export interface OutputView {
  readonly txOut: Cardano.TxOut;
  /** Undefined when the address does not parse. */
  readonly address: Cardano.Address | undefined;
  readonly addressClass: CustodyAddressClass;
  /** Equal for two addresses exactly when the script context sees one address. */
  readonly plutusAddressKey: string | undefined;
  readonly value: CustodyValueDelta;
  readonly datumKind: CustodyDatumKind;
  readonly inlineDatum: Cardano.PlutusData | undefined;
  readonly hasReferenceScript: boolean;
  /** The hash of the reference script the output carries, if any. */
  readonly referenceScriptHash: string | undefined;
}

const OTHER: CustodyAddressClass = { kind: 'other' };

/** Hex length of a stake script hash: the state NFT name and the prefix of every grant token name. */
const STAKE_SCRIPT_HASH_HEX_LENGTH = 56;

const versionOfPayment = (
  credential: Cardano.Credential,
): CustodyContractVersion | undefined =>
  credential.type === Cardano.CredentialType.ScriptHash
    ? SUPPORTED_CUSTODY_CONTRACT_VERSIONS.find(
        version => version.accountValidatorHash === credential.hash,
      )
    : undefined;

/**
 * Whether a script hash is a logic in the catalogue of a supported contract
 * version: one whose rules Lace has reviewed.
 */
export const isKnownCustodyLogic = (scriptHash: string): boolean =>
  SUPPORTED_CUSTODY_CONTRACT_VERSIONS.some(
    version => findCustodyLogic(version, scriptHash).ok,
  );

/**
 * Classifies an address on any network against every supported custody
 * contract version. It reads the address only: `account` does not prove
 * that the stake script is a custody stake script or that the account
 * exists.
 */
export const classifyCustodyAddress = (
  address: Cardano.Address,
): CustodyAddressClass => {
  const base = address.asBase();
  const payment = (
    base ??
    address.asEnterprise() ??
    address.asPointer()
  )?.getPaymentCredential();
  const contractVersion = payment && versionOfPayment(payment);
  if (!contractVersion) return OTHER;
  const stake = base?.getStakeCredential();
  return stake?.type === Cardano.CredentialType.ScriptHash
    ? { kind: 'account', contractVersion, stakeScriptHash: stake.hash }
    : { kind: 'unspendable', contractVersion };
};

/** A key equal for two addresses exactly when their Plutus data is equal. */
export const plutusAddressKeyOf = (
  address: Cardano.Address,
): string | undefined => {
  const recipient = custodyRecipientFromAddress(address);
  return recipient.ok ? recipientKey(recipient.value) : undefined;
};

export const accountPlutusAddressKey = ({
  accountValidatorHash,
  stakeScriptHash,
}: CustodyAccountHashes): string =>
  recipientKey({
    paymentCredential: {
      type: Cardano.CredentialType.ScriptHash,
      hash: accountValidatorHash,
    },
    stakeCredential: {
      kind: 'inline',
      credential: {
        type: Cardano.CredentialType.ScriptHash,
        hash: stakeScriptHash,
      },
    },
  });

const stakeCredentialOf = ({
  stakeScriptHash,
}: CustodyAccountHashes): Cardano.Credential => ({
  type: Cardano.CredentialType.ScriptHash,
  hash: stakeScriptHash,
});

export const accountAddressOf = (
  account: CustodyAccountHashes,
  networkId: Cardano.NetworkId,
): Cardano.PaymentAddress =>
  Cardano.BaseAddress.fromCredentials(
    networkId,
    {
      type: Cardano.CredentialType.ScriptHash,
      hash: account.accountValidatorHash,
    },
    stakeCredentialOf(account),
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

export const accountRewardAccountOf = (
  account: CustodyAccountHashes,
  networkId: Cardano.NetworkId,
): Cardano.RewardAccount =>
  Cardano.RewardAccount.fromCredential(stakeCredentialOf(account), networkId);

export const stateNftAssetIdOf = ({
  accountValidatorHash,
  stakeScriptHash,
}: CustodyAccountHashes): Cardano.AssetId =>
  `${accountValidatorHash}${stakeScriptHash}` as Cardano.AssetId;

/**
 * The asset id of the account's grant token for `slot`, or undefined for a
 * slot no grant token name can carry, which the validator cannot name either.
 */
export const grantAssetIdOf = (
  account: CustodyAccountHashes,
  slot: bigint,
): Cardano.AssetId | undefined =>
  slot >= 0n && slot < CUSTODY_SLOT_LIMIT
    ? custodyGrantAssetId(account, slot)
    : undefined;

/**
 * The output's datum as the script context sees it. A resolution that
 * carries both an inline datum and its hash, as some providers report an
 * inline datum, keeps the inline datum.
 */
const datumOf = (
  txOut: Cardano.TxOut,
): Pick<OutputView, 'datumKind' | 'inlineDatum'> => {
  if (txOut.datum !== undefined) {
    return { datumKind: 'inline', inlineDatum: txOut.datum };
  }
  return {
    datumKind: txOut.datumHash === undefined ? 'none' : 'hash',
    inlineDatum: undefined,
  };
};

export const viewOfOutput = (txOut: Cardano.TxOut): OutputView => {
  const address = Cardano.Address.fromString(txOut.address) ?? undefined;
  return {
    txOut,
    address,
    addressClass: address ? classifyCustodyAddress(address) : OTHER,
    plutusAddressKey: address && plutusAddressKeyOf(address),
    value: valueDeltaOf(txOut.value),
    ...datumOf(txOut),
    hasReferenceScript: txOut.scriptReference !== undefined,
    referenceScriptHash:
      txOut.scriptReference &&
      Serialization.Script.fromCore(txOut.scriptReference).hash(),
  };
};

/** The account state an output carries as its inline datum, if it decodes. */
export const decodedInlineState = (
  view: OutputView,
): CustodyAccountState | undefined => {
  if (view.inlineDatum === undefined) return undefined;
  const decoded = decodeCustodyAccountState(view.inlineDatum);
  return decoded.ok ? decoded.value : undefined;
};

/** The grant an output carries as its inline datum, if it decodes. */
export const decodedInlineGrant = (
  view: OutputView,
): CustodyGrant | undefined => {
  if (view.inlineDatum === undefined) return undefined;
  const decoded = decodeCustodyGrant(view.inlineDatum);
  return decoded.ok ? decoded.value : undefined;
};

/** Whether the output sits at the account address, compared as Plutus data. */
export const isAtAccount = (
  view: OutputView,
  account: CustodyAccountHashes,
): boolean =>
  view.plutusAddressKey !== undefined &&
  view.plutusAddressKey === accountPlutusAddressKey(account);

/** `holds_state_nft`: exactly one of the account's state NFT. */
const holdsStateNft = (
  value: CustodyValueDelta,
  account: CustodyAccountHashes,
): boolean => value.assets.get(stateNftAssetIdOf(account)) === 1n;

/** `holds_only_lovelace_and_state_nft`: the state NFT and no other token. */
export const holdsOnlyLovelaceAndStateNft = (
  value: CustodyValueDelta,
  account: CustodyAccountHashes,
): boolean => value.assets.size === 1 && holdsStateNft(value, account);

/** `holds_only_lovelace_and_grant_token`: one grant token of `slot` and no other token. */
export const holdsOnlyLovelaceAndGrantToken = (
  value: CustodyValueDelta,
  account: CustodyAccountHashes,
  slot: bigint,
): boolean => {
  const assetId = grantAssetIdOf(account, slot);
  return (
    assetId !== undefined &&
    value.assets.size === 1 &&
    value.assets.get(assetId) === 1n
  );
};

/** `holds_no_account_token`: no token under the account validator policy, of any account. */
export const holdsNoAccountToken = (
  value: CustodyValueDelta,
  accountValidatorHash: string,
): boolean =>
  ![...value.assets.keys()].some(
    assetId => policyIdOf(assetId) === accountValidatorHash,
  );

/** Whether a value holds a token of the account: its state NFT or one of its grant tokens. */
const holdsOwnAccountToken = (
  value: CustodyValueDelta,
  { accountValidatorHash, stakeScriptHash }: CustodyAccountHashes,
): boolean =>
  [...value.assets.keys()].some(
    assetId =>
      policyIdOf(assetId) === accountValidatorHash &&
      assetNameOf(assetId).startsWith(stakeScriptHash),
  );

/** `holds_account_token`: at the account address, holding one of its account tokens. */
export const holdsAccountToken = (
  view: OutputView,
  account: CustodyAccountHashes,
): boolean =>
  isAtAccount(view, account) && holdsOwnAccountToken(view.value, account);

/** `is_control_output`: at the account address, holding its state NFT. */
export const isControlOutput = (
  view: OutputView,
  account: CustodyAccountHashes,
): boolean => isAtAccount(view, account) && holdsStateNft(view.value, account);

/**
 * Which kind of account UTxO an output at the account address is: the
 * control UTxO holds the state NFT, a grant UTxO another token of the
 * account, a reserve no account token and a datum, a fund neither.
 */
export const accountUtxoKindOf = (
  view: OutputView,
  account: CustodyAccountHashes,
): 'control' | 'fund' | 'grant' | 'reserve' => {
  if (holdsStateNft(view.value, account)) return 'control';
  if (holdsOwnAccountToken(view.value, account)) return 'grant';
  return view.datumKind === 'none' ? 'fund' : 'reserve';
};

/**
 * Whether an output breaks `tokens_sit_at_their_own_addresses` for one of
 * the account validators: every token under an account validator policy
 * must be a single one at the account address its name's first 28 bytes
 * name.
 */
export const holdsMisplacedAccountToken = (
  view: OutputView,
  accountValidatorHashes: readonly string[],
): boolean =>
  [...view.value.assets].some(([assetId, quantity]) => {
    const accountValidatorHash = policyIdOf(assetId);
    if (!accountValidatorHashes.includes(accountValidatorHash)) return false;
    return (
      quantity !== 1n ||
      !isAtAccount(view, {
        accountValidatorHash: accountValidatorHash as Hash28ByteBase16,
        stakeScriptHash: assetNameOf(assetId).slice(
          0,
          STAKE_SCRIPT_HASH_HEX_LENGTH,
        ) as Hash28ByteBase16,
      })
    );
  });
