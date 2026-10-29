import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  compareRequestedGrantScope,
  custodyRecipientToAddress,
  parseCustodyRequestedGrantScope,
  serializeCustodyRequestedGrantScope,
} from '../src';

import {
  baseAddress,
  enterpriseAddress,
  PREPROD,
  record,
  STRANGER_ADDRESS,
  VALIDATOR_POINTER_ADDRESS,
} from './custody-transactions';
import {
  AGENT_KEY,
  EXPIRY,
  OWNER_KEY,
  strangerRecipient,
  TOKEN_NAME,
  TOKEN_POLICY,
  tokenScope,
} from './fixtures';

import type {
  CustodyGrant,
  CustodyRecipient,
  CustodyRequestedGrantScope,
} from '../src';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

const keyCredential = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: hash as Hash28ByteBase16,
});

const STAKED_ADDRESS = baseAddress(
  keyCredential('ff'.repeat(28)),
  keyCredential(OWNER_KEY),
);
const MAINNET_STRANGER_ADDRESS = enterpriseAddress(
  keyCredential('ff'.repeat(28)),
  Cardano.NetworkId.Mainnet,
);

const UPPER_CASE_STRANGER_ADDRESS =
  STRANGER_ADDRESS.toUpperCase() as Cardano.PaymentAddress;
/** The bytes of `STRANGER_ADDRESS`, testnet header included, under the mainnet prefix. */
const MAINNET_PREFIXED_STRANGER_ADDRESS =
  'addr1vrllllllllllllllllllllllllllllllllllllllllllllch4wpxj' as Cardano.PaymentAddress;

const recipientOf = (address: string): CustodyRecipient => {
  const parsed = Cardano.Address.fromBech32(address);
  const base = parsed.asBase();
  if (base) {
    return {
      paymentCredential: base.getPaymentCredential(),
      stakeCredential: {
        kind: 'inline',
        credential: base.getStakeCredential(),
      },
    } as CustodyRecipient;
  }
  const pointer = parsed.asPointer();
  if (pointer) {
    const { slot, txIndex, certIndex } = pointer.getStakePointer();
    return {
      paymentCredential: pointer.getPaymentCredential(),
      stakeCredential: {
        kind: 'pointer',
        slot,
        transactionIndex: BigInt(txIndex),
        certificateIndex: BigInt(certIndex),
      },
    } as CustodyRecipient;
  }
  return strangerRecipient;
};

const actual: CustodyGrant = {
  slot: 4n,
  grantee: AGENT_KEY,
  generation: 2n,
  scope: tokenScope([
    strangerRecipient,
    recipientOf(STAKED_ADDRESS),
    recipientOf(VALIDATOR_POINTER_ADDRESS),
  ]),
};

const requested: CustodyRequestedGrantScope = {
  slot: 4n,
  grantee: AGENT_KEY,
  asset: { policyId: TOKEN_POLICY, assetName: TOKEN_NAME },
  perCallCap: 10n,
  cap: 50n,
  lovelacePerCallCap: 2_500_000n,
  lovelaceCap: 3_000_000n,
  expiresAt: EXPIRY,
  recipients: [STRANGER_ADDRESS, STAKED_ADDRESS, VALIDATOR_POINTER_ADDRESS],
};

describe('compareRequestedGrantScope', () => {
  it('finds no mismatch in the grant a transaction writes as requested', () => {
    expect(compareRequestedGrantScope(requested, actual, PREPROD)).toEqual([]);
  });

  it.each<
    [keyof CustodyRequestedGrantScope, Partial<CustodyRequestedGrantScope>]
  >([
    ['slot', { slot: 5n }],
    ['grantee', { grantee: HexBlob(OWNER_KEY) }],
    ['grantee', { grantee: HexBlob(AGENT_KEY.toUpperCase()) }],
    ['asset', { asset: { policyId: TOKEN_POLICY, assetName: HexBlob('') } }],
    ['asset', { asset: { policyId: HexBlob(''), assetName: TOKEN_NAME } }],
    ['perCallCap', { perCallCap: 11n }],
    ['cap', { cap: 49n }],
    ['lovelacePerCallCap', { lovelacePerCallCap: 2_500_001n }],
    ['lovelaceCap', { lovelaceCap: 0n }],
    ['expiresAt', { expiresAt: EXPIRY / 1000n }],
    ['recipients', { recipients: [] }],
    [
      'recipients',
      {
        recipients: [
          STAKED_ADDRESS,
          STRANGER_ADDRESS,
          VALIDATOR_POINTER_ADDRESS,
        ],
      },
    ],
    ['recipients', { recipients: [STRANGER_ADDRESS, STAKED_ADDRESS] }],
    [
      'recipients',
      {
        recipients: [
          STRANGER_ADDRESS,
          STAKED_ADDRESS,
          VALIDATOR_POINTER_ADDRESS,
          STRANGER_ADDRESS,
        ],
      },
    ],
    [
      'recipients',
      {
        recipients: [
          MAINNET_STRANGER_ADDRESS,
          STAKED_ADDRESS,
          VALIDATOR_POINTER_ADDRESS,
        ],
      },
    ],
    [
      'recipients',
      {
        recipients: [
          'not-an-address' as Cardano.PaymentAddress,
          STAKED_ADDRESS,
          VALIDATOR_POINTER_ADDRESS,
        ],
      },
    ],
    [
      'recipients',
      {
        recipients: [
          UPPER_CASE_STRANGER_ADDRESS,
          STAKED_ADDRESS,
          VALIDATOR_POINTER_ADDRESS,
        ],
      },
    ],
    [
      'recipients',
      {
        recipients: [
          MAINNET_PREFIXED_STRANGER_ADDRESS,
          STAKED_ADDRESS,
          VALIDATOR_POINTER_ADDRESS,
        ],
      },
    ],
    [
      'recipients',
      {
        recipients: [record.address, STAKED_ADDRESS, VALIDATOR_POINTER_ADDRESS],
      },
    ],
    [
      'recipients',
      {
        recipients: [
          'stake_test17qjmtd8dzgf6ky2htfkkv7jnc2h3q7as2fckhqa3w2a0uvcdt7rc2' as Cardano.PaymentAddress,
          STAKED_ADDRESS,
          VALIDATOR_POINTER_ADDRESS,
        ],
      },
    ],
  ])('reports %s', (field, change) => {
    expect(
      compareRequestedGrantScope({ ...requested, ...change }, actual, PREPROD),
    ).toEqual([field]);
  });

  it('ignores the generation, which the transaction derives from the state it writes', () => {
    expect(
      compareRequestedGrantScope(
        requested,
        { ...actual, generation: 0n },
        PREPROD,
      ),
    ).toEqual([]);
  });

  it('reports every mismatched field in declaration order', () => {
    expect(
      compareRequestedGrantScope(
        {
          ...requested,
          recipients: [],
          expiresAt: 1n,
          cap: 1n,
          slot: 0n,
        },
        actual,
        PREPROD,
      ),
    ).toEqual(['slot', 'cap', 'expiresAt', 'recipients']);
  });

  it('reads the non-canonical fixtures as the stranger address', () => {
    for (const spelling of [
      UPPER_CASE_STRANGER_ADDRESS,
      MAINNET_PREFIXED_STRANGER_ADDRESS,
    ]) {
      expect(Cardano.Address.fromBech32(spelling).toBech32()).toBe(
        STRANGER_ADDRESS,
      );
    }
  });

  it('accepts recipients only on the account network', () => {
    const mainnetGrant: CustodyGrant = {
      ...actual,
      scope: { ...actual.scope, recipients: [strangerRecipient] },
    };
    expect(
      compareRequestedGrantScope(
        { ...requested, recipients: [MAINNET_STRANGER_ADDRESS] },
        mainnetGrant,
        Cardano.ChainIds.Mainnet,
      ),
    ).toEqual([]);
    expect(
      compareRequestedGrantScope(
        { ...requested, recipients: [STRANGER_ADDRESS] },
        mainnetGrant,
        Cardano.ChainIds.Mainnet,
      ),
    ).toEqual(['recipients']);
  });
});

describe('requested scope serialization', () => {
  const serialized = serializeCustodyRequestedGrantScope(requested);

  it('writes integers as decimal strings and keeps hex and bech32', () => {
    expect(serialized).toEqual({
      slot: '4',
      grantee: AGENT_KEY,
      asset: { policyId: TOKEN_POLICY, assetName: TOKEN_NAME },
      perCallCap: '10',
      cap: '50',
      lovelacePerCallCap: '2500000',
      lovelaceCap: '3000000',
      expiresAt: EXPIRY.toString(),
      recipients: [STRANGER_ADDRESS, STAKED_ADDRESS, VALIDATOR_POINTER_ADDRESS],
    });
  });

  it('round trips through the parser as a value and as JSON text', () => {
    expect(parseCustodyRequestedGrantScope(serialized)).toEqual({
      ok: true,
      value: requested,
    });
    expect(parseCustodyRequestedGrantScope(JSON.stringify(serialized))).toEqual(
      {
        ok: true,
        value: requested,
      },
    );
  });

  it('parses a lovelace scope with no recipients', () => {
    expect(
      parseCustodyRequestedGrantScope({
        ...serialized,
        asset: { policyId: '', assetName: '' },
        recipients: [],
      }),
    ).toMatchObject({
      ok: true,
      value: { asset: { policyId: '', assetName: '' }, recipients: [] },
    });
  });

  it.each<[string, unknown, string | undefined]>([
    ['text that is not JSON', '{', undefined],
    ['a value that is not an object', [serialized], undefined],
    ['null', null, undefined],
    [
      'a missing field',
      Object.fromEntries(
        Object.entries(serialized).filter(([field]) => field !== 'cap'),
      ),
      undefined,
    ],
    ['an extra field', { ...serialized, note: 'x' }, undefined],
    ['an integer as a number', { ...serialized, slot: 4 }, 'slot'],
    ['a negative integer', { ...serialized, perCallCap: '-1' }, 'perCallCap'],
    ['a leading zero', { ...serialized, cap: '050' }, 'cap'],
    ['an exponent', { ...serialized, lovelaceCap: '3e6' }, 'lovelaceCap'],
    [
      'a fraction',
      { ...serialized, lovelacePerCallCap: '2.5' },
      'lovelacePerCallCap',
    ],
    ['an empty integer', { ...serialized, expiresAt: '' }, 'expiresAt'],
    ['a zero expiry', { ...serialized, expiresAt: '0' }, 'expiresAt'],
    [
      'a short grantee',
      { ...serialized, grantee: AGENT_KEY.slice(2) },
      'grantee',
    ],
    [
      'an upper-case grantee',
      { ...serialized, grantee: AGENT_KEY.toUpperCase() },
      'grantee',
    ],
    [
      'an asset that is not an object',
      { ...serialized, asset: 'ada' },
      'asset',
    ],
    [
      'an asset with an extra field',
      { ...serialized, asset: { ...serialized.asset, quantity: '1' } },
      'asset',
    ],
    [
      'a named asset under the empty policy',
      { ...serialized, asset: { policyId: '', assetName: TOKEN_NAME } },
      'asset',
    ],
    [
      'a short policy id',
      { ...serialized, asset: { policyId: '99', assetName: TOKEN_NAME } },
      'asset',
    ],
    [
      'an asset name of 33 bytes',
      {
        ...serialized,
        asset: { policyId: TOKEN_POLICY, assetName: 'aa'.repeat(33) },
      },
      'asset',
    ],
    [
      'an asset name that is not hex',
      { ...serialized, asset: { policyId: TOKEN_POLICY, assetName: 'token' } },
      'asset',
    ],
    [
      'recipients that are not a list',
      { ...serialized, recipients: STRANGER_ADDRESS },
      'recipients',
    ],
    [
      'more than 8 recipients',
      {
        ...serialized,
        recipients: Array.from({ length: 9 }, () => STRANGER_ADDRESS),
      },
      'recipients',
    ],
    [
      'a recipient that is not bech32',
      { ...serialized, recipients: ['nope'] },
      'recipients',
    ],
    [
      'a recipient that is not a string',
      { ...serialized, recipients: [1] },
      'recipients',
    ],
    [
      'an upper-case recipient',
      {
        ...serialized,
        recipients: [UPPER_CASE_STRANGER_ADDRESS],
      },
      'recipients',
    ],
    [
      'a recipient whose prefix names another network than its header',
      {
        ...serialized,
        recipients: [MAINNET_PREFIXED_STRANGER_ADDRESS],
      },
      'recipients',
    ],
    [
      'a reward address recipient',
      {
        ...serialized,
        recipients: [
          'stake_test17qjmtd8dzgf6ky2htfkkv7jnc2h3q7as2fckhqa3w2a0uvcdt7rc2',
        ],
      },
      'recipients',
    ],
  ])('refuses %s', (_, input, field) => {
    const result = parseCustodyRequestedGrantScope(input);
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'malformed-requested-scope' },
    });
    expect(!result.ok && result.error.field).toBe(field);
  });

  it('serializes recipients that render back to the decoded grant', () => {
    const rendered = actual.scope.recipients.map(recipient => {
      const address = custodyRecipientToAddress(recipient, PREPROD.networkId);
      return address.ok && address.value.toBech32();
    });
    expect(rendered).toEqual(requested.recipients);
  });
});
