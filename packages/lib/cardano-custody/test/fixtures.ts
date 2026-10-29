// Mirrors the account scenario of Biglup/cardano-account-custody-contract
// offchain/test/support/account.ts at revision
// b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0), modified for Lace:
// recipients are Plutus address data rather than bech32 strings.

import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

import { LOGIC_V1_HASH } from '../src';

import type {
  CustodyAccountState,
  CustodyGrant,
  CustodyRecipient,
  CustodyScope,
} from '../src';

/** The logic every fixture account runs: logic version 1 applied to the proxy hash. */
export const LOGIC_HASH = HexBlob(LOGIC_V1_HASH);
export const OWNER_KEY = HexBlob('aa'.repeat(28));
export const AGENT_KEY = HexBlob('cc'.repeat(28));
export const OTHER_DEVICE_KEY = HexBlob('ee'.repeat(28));
export const STRANGER_KEY = HexBlob('ff'.repeat(28));
export const TOKEN_POLICY = HexBlob('99'.repeat(28));
/** `token` in UTF-8. */
export const TOKEN_NAME = HexBlob('746f6b656e');
export const EXPIRY = 1_800_000_000_000n;
/** A POSIX millisecond instant before `EXPIRY`. */
export const NOW = 1_700_000_000_000;

/**
 * The account of owner `aa`×28, pinned upstream in
 * offchain/test/stake-script.test.ts: the Aiken CLI applies the stake
 * validator to the owner and the account proxy hash.
 */
export const OWNER_STAKE_SCRIPT_HASH =
  '4dd785711df2a1a2f5338b73a88e3cd199ed08a6f98e25d13d4db854';
export const OWNER_TESTNET_ADDRESS =
  'addr_test1xrkkr936e9x39s9nyzl95vmvx6hkd0qzcwqwp23sqxyey56d67zhz80j5x302vutww5gu0x3n8ks3fhe3cjaz02dhp2qvxnhh9';
export const OWNER_TESTNET_REWARD_ACCOUNT =
  'stake_test17pxa0pt3rhe2rgh4xw9h82yw8ngenmgg5mucufw384xms4qczj5we';

/**
 * Lace's Preprod creator key hash and the account it derives. A derived
 * vector, not chain evidence: no creation of this account is recorded.
 */
export const PREPROD_OWNER =
  '0e2eb8b05c17851fe132bf308e9bc712ef13191d3899c06b926780e1';
export const PREPROD_STAKE_SCRIPT_HASH =
  'f176158fcbbdfc44c1e3b3f0863032dc048c091738b0fa4107975157';
export const PREPROD_ADDRESS =
  'addr_test1xrkkr936e9x39s9nyzl95vmvx6hkd0qzcwqwp23sqxyey5l3wc2cljaal3zvrcan7zrrqvkuqjxqj9eckrayzpuh29tsszhnvv';
export const PREPROD_REWARD_ACCOUNT =
  'stake_test17rchv9v0ew7lc3xpuwelpp3sxtwqfrqfzuutp7jpq7t4z4cnrk4ek';

/** An enterprise key address of the stranger: the upstream fixture recipient. */
export const strangerRecipient: CustodyRecipient = {
  paymentCredential: {
    type: Cardano.CredentialType.KeyHash,
    hash: STRANGER_KEY,
  },
};

/** A lovelace scope allowing 10 tADA per call and 15 tADA in total. */
export const lovelaceScope = (
  recipients: CustodyRecipient[] = [],
): CustodyScope => ({
  asset: { policyId: HexBlob(''), assetName: HexBlob('') },
  perCallCap: 10_000_000n,
  cap: 15_000_000n,
  lovelacePerCallCap: 0n,
  lovelaceCap: 0n,
  expiresAt: EXPIRY,
  recipients,
});

/** 10 tokens per call, 50 in total, with 2.5 tADA per call and 3 tADA in total alongside. */
export const tokenScope = (
  recipients: CustodyRecipient[] = [],
): CustodyScope => ({
  asset: { policyId: TOKEN_POLICY, assetName: TOKEN_NAME },
  perCallCap: 10n,
  cap: 50n,
  lovelacePerCallCap: 2_500_000n,
  lovelaceCap: 3_000_000n,
  expiresAt: EXPIRY,
  recipients,
});

/** The state of a freshly created account. */
export const initialState: CustodyAccountState = {
  logic: LOGIC_HASH,
  devices: [OWNER_KEY],
  grantGeneration: 0n,
  nextSlot: 0n,
  revoked: [],
  outstanding: 0n,
};

/**
 * A lovelace grant, a token grant and a restricted lovelace grant, all
 * held by the agent key and issued under generation zero in slots zero to
 * two.
 */
export const fixtureGrants: readonly CustodyGrant[] = [
  { slot: 0n, grantee: AGENT_KEY, generation: 0n, scope: lovelaceScope() },
  {
    slot: 1n,
    grantee: AGENT_KEY,
    generation: 0n,
    scope: tokenScope([strangerRecipient]),
  },
  {
    slot: 2n,
    grantee: AGENT_KEY,
    generation: 0n,
    scope: lovelaceScope([strangerRecipient]),
  },
];

/** The state of an account that issued the fixture grants and holds them all. */
export const grantedState: CustodyAccountState = {
  ...initialState,
  nextSlot: 3n,
  outstanding: 3n,
};

export const toCbor = (data: Cardano.PlutusData): string =>
  Serialization.PlutusData.fromCore(data).toCbor();

/** Decoded the way a chain read decodes: with the `cbor` caches core keeps. */
export const fromCbor = (cbor: string): Cardano.PlutusData =>
  Serialization.PlutusData.fromCbor(HexBlob(cbor)).toCore();
