import { Cardano } from '@cardano-sdk/core';
import { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';

import { APIError, APIErrorCode } from '../api-error';

import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { AnyAddress } from '@lace-contract/addresses';
import type { CardanoAddressData } from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';

const KEYHASH_HEX_LENGTH = 56;
const PREFIXED_KEYHASH_HEX_LENGTH = 58;
const CIP129_SCRIPT_HASH_HEADER = '23';

const tryCredential = (hex: string, type: Cardano.CredentialType) => {
  try {
    return {
      hash: Ed25519KeyHashHex(hex),
      type,
    };
  } catch {
    return undefined;
  }
};

/**
 * Parse a DRepID-like string into a Cardano credential.
 *
 * Recognises:
 *  - CIP-129 bech32 DRep ID (`drep1y...`, 29-byte payload with header byte)
 *  - CIP-105 bech32 DRep ID (`drep1...` / `drep_script1...`, 28-byte payload)
 *  - 56-char hex DRep key hash (CIP-105, key-hash only)
 *  - 58-char hex with a 1-byte header. Header `23` (CIP-129 script) yields a
 *    ScriptHash credential; any other header yields a KeyHash credential,
 *    matching the LW-14968 "ignore the first byte" rule for CIP-129 key
 *    (header `22`) and type-6 enterprise hex (`60` / `61`).
 *
 * Returns `undefined` for unrecognised input so callers can fall back.
 */
const parseDRepCredential = (addr: string) => {
  try {
    return Cardano.DRepID.toCredential(Cardano.DRepID(addr));
  } catch {}
  if (addr.length === KEYHASH_HEX_LENGTH)
    return tryCredential(addr, Cardano.CredentialType.KeyHash);
  if (addr.length === PREFIXED_KEYHASH_HEX_LENGTH) {
    const type =
      addr.slice(0, 2).toLowerCase() === CIP129_SCRIPT_HASH_HEADER
        ? Cardano.CredentialType.ScriptHash
        : Cardano.CredentialType.KeyHash;
    return tryCredential(addr.slice(2), type);
  }
  return undefined;
};

/**
 * Detect the encoding of `addr` and convert to PaymentAddress or RewardAddress.
 *
 * Accepted encodings:
 *  - bech32 PaymentAddress (including type-6 enterprise `addr1v...`)
 *  - bech32 RewardAccount
 *  - Type-6/7 enterprise address hex (58 chars, header `60`/`61`/`70`/`71`)
 *  - CIP-129 bech32 DRep ID (`drep1y...`)
 *  - CIP-105 bech32 DRep ID (`drep1...` / `drep_script1...`)
 *  - CIP-105 hex DRep key hash (56 hex chars)
 *  - CIP-129 hex DRep ID (58 hex chars, header `22`/`23`)
 *
 * `PaymentAddress` is attempted first so type-6 hex round-trips with its
 * original network byte intact in the COSE protected headers; falling back to
 * the CIP-129 pipeline would re-wrap the key hash via `DRepID.toAddress`,
 * which always emits network 0.
 *
 * @throws APIError if the address format is not recognised.
 */
export const addrToSignWith = (
  addr: Cardano.PaymentAddress | Cardano.RewardAccount | string,
): Cardano.PaymentAddress | Cardano.RewardAccount => {
  if (Cardano.isRewardAccount(addr)) return Cardano.RewardAccount(addr);

  try {
    return Cardano.PaymentAddress(addr);
  } catch {}

  const credential = parseDRepCredential(addr);
  if (!credential) {
    throw new APIError(
      APIErrorCode.InternalError,
      'Invalid address format for signing',
    );
  }
  const drepId = Cardano.DRepID.cip129FromCredential(credential);
  const drepAddr = Cardano.DRepID.toAddress(drepId)?.toAddress();
  if (!drepAddr) {
    throw new APIError(
      APIErrorCode.InternalError,
      'Invalid address format for signing',
    );
  }
  return drepAddr.toBech32();
};

/**
 * Safely converts an address to PaymentAddress or RewardAddress, returning the original input on failure.
 *
 * @param addr - When hex encoded, it can be a PaymentAddress, RewardAddress or DRepKeyHash
 * @returns PaymentAddress | RewardAddress | original string if conversion fails
 */
export const safeAddrToSignWith = (
  addr: Cardano.PaymentAddress | Cardano.RewardAccount | string,
): Cardano.PaymentAddress | Cardano.RewardAccount | string => {
  try {
    return addrToSignWith(addr);
  } catch {
    return addr;
  }
};

/**
 * Decode a hex-encoded reward (stake) address to its bech32 RewardAccount.
 *
 * A hex reward address (header `e0`/`e1`/`f0`/`f1` + 28-byte stake key hash) is
 * 58 hex chars, the same length as a CIP-129 prefixed DRep hex, so it must be
 * decoded as a real address before the DRep heuristic in `parseDRepCredential`
 * misreads its header byte as a DRep credential. Returns `undefined` for any
 * input that is not a decodable hex reward address.
 */
const hexRewardAccount = (addr: string): Cardano.RewardAccount | undefined => {
  try {
    const rewardAddress = Cardano.Address.fromBytes(HexBlob(addr)).asReward();
    return rewardAddress?.toAddress().toBech32() as
      | Cardano.RewardAccount
      | undefined;
  } catch {
    return undefined;
  }
};

/** Decode an address from hex bytes or bech32, returning undefined on failure. */
const decodeAddress = (addr: string): Cardano.Address | undefined => {
  try {
    return Cardano.Address.fromBytes(HexBlob(addr));
  } catch {}
  try {
    return Cardano.Address.fromString(addr) ?? undefined;
  } catch {
    return undefined;
  }
};

const credentialMatchesKeyHash = (
  credential: Cardano.Credential,
  keyHash: Ed25519KeyHashHex,
): boolean =>
  credential.type === Cardano.CredentialType.KeyHash &&
  String(credential.hash).toLowerCase() === String(keyHash).toLowerCase();

interface AddrToDisplayOptions {
  /**
   * The signing account's own DRep key hash. A CIP-95 DRep signing request is
   * delivered as a type-6 enterprise address whose key hash is the DRep key
   * (see `Cardano.DRepID.toAddress`), structurally identical to a genuine
   * enterprise payment address. The key hash is the only reliable way to tell
   * them apart, mirroring the signing path in `cip8-sign-data`.
   */
  dRepKeyHash?: Ed25519KeyHashHex;
}

/**
 * Format an address for human display in the sign-data dialog.
 *
 * Payment and reward addresses are returned as bech32. Reward (stake) addresses
 * - whether passed as bech32 `stake1...` or as hex - render as the bech32
 * RewardAccount, so a CIP-8 stake-key signature shows the stake key the user is
 * actually signing with. Explicit DRep encodings (CIP-129/CIP-105 bech32, or
 * hex key hash with optional 1-byte header) are normalised to a CIP-129 DRep ID
 * (`drep1...`).
 *
 * A type-6 enterprise address is ambiguous: it can be a genuine payment address
 * or a CIP-95 DRep signing request. When `dRepKeyHash` is provided, the key hash
 * disambiguates - a match renders the DRep ID, otherwise the enterprise payment
 * address. Without it, the legacy "any enterprise hex is a DRep" behaviour is
 * kept. Unrecognised input is returned as-is.
 */
export const addrToDisplay = (
  addr: Cardano.PaymentAddress | Cardano.RewardAccount | string,
  { dRepKeyHash }: AddrToDisplayOptions = {},
): string => {
  if (Cardano.isRewardAccount(addr)) return addr;
  const rewardAccount = hexRewardAccount(addr);
  if (rewardAccount) return rewardAccount;

  if (dRepKeyHash) {
    const decoded = decodeAddress(addr);
    const enterpriseCredential = decoded
      ?.asEnterprise()
      ?.getPaymentCredential();
    if (decoded && enterpriseCredential) {
      return credentialMatchesKeyHash(enterpriseCredential, dRepKeyHash)
        ? Cardano.DRepID.cip129FromCredential(enterpriseCredential)
        : decoded.toBech32();
    }
  }

  const credential = parseDRepCredential(addr);
  if (credential) return Cardano.DRepID.cip129FromCredential(credential);
  try {
    return Cardano.PaymentAddress(addr);
  } catch {
    return addr;
  }
};

/**
 * Transforms AnyAddress<CardanoAddressData> to GroupedAddress format
 * required by the SDK's cip30signData function.
 *
 * @param addresses - Array of all addresses
 * @param accountId - Optional account ID to filter addresses
 * @returns Array of GroupedAddress objects for the SDK
 */
export const transformToGroupedAddresses = (
  addresses: AnyAddress[],
  accountId?: AccountId,
): GroupedAddress[] => {
  const filtered = addresses.filter(
    (
      addr,
    ): addr is AnyAddress<CardanoAddressData> & {
      data: CardanoAddressData;
    } =>
      addr.data !== undefined &&
      (accountId === undefined || addr.accountId === accountId),
  );
  return filtered.map(addr => ({
    type: addr.data.type,
    index: addr.data.index,
    networkId: addr.data.networkId,
    accountIndex: addr.data.accountIndex,
    address: Cardano.PaymentAddress(addr.address),
    rewardAccount: addr.data.rewardAccount as unknown as Cardano.RewardAccount,
    stakeKeyDerivationPath: addr.data.stakeKeyDerivationPath,
  }));
};
