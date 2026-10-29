import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import { openCardanoCustodyAccount } from '../../src/custody/cardano-custody-account-entity';
import {
  CardanoCustodyAgentPolicyInvalidError,
  CardanoCustodyRecordInvalidError,
  CardanoCustodyUnsupportedVersionError,
} from '../../src/custody/cardano-custody-errors';
import {
  exportCardanoCustodyAgentPolicy,
  parseCardanoCustodyAgentPolicy,
} from '../../src/custody/cardano-custody-records';

import {
  agentGrant,
  agentGrantUtxo,
  createCustodyTestWallet,
  grantedControl,
  RECIPIENT_ADDRESS,
  record,
} from './custody-fixtures';

const PREPROD_MAGIC = Cardano.NetworkMagics.Preprod;

const MAINNET_RECIPIENT = Cardano.EnterpriseAddress.fromCredentials(
  Cardano.NetworkId.Mainnet,
  {
    type: Cardano.CredentialType.KeyHash,
    hash: Hash28ByteBase16('ab'.repeat(28)),
  },
)
  .toAddress()
  .toBech32();

const tokenOf = (slot: number) =>
  `${record.accountValidatorHash}${record.stakeScriptHash}${slot
    .toString(16)
    .padStart(8, '0')}`;

const grantJson = {
  slot: '2',
  generation: '1',
  token: tokenOf(2),
  asset: { policyId: '', assetName: '' },
  perCallCap: '10000000',
  cap: '15000000',
  lovelacePerCallCap: '0',
  lovelaceCap: '0',
  expiresAt: agentGrant.scope.expiresAt.toString(),
  recipients: [RECIPIENT_ADDRESS],
};

const policyJson = {
  type: 'cardano-custody-agent-policy',
  version: 2,
  account: record,
  grantee: agentGrant.grantee,
  grant: grantJson,
};

const parse = (input: unknown) =>
  parseCardanoCustodyAgentPolicy(input, { networkMagic: PREPROD_MAGIC });

const refusalOf = (input: unknown): unknown => {
  try {
    parse(input);
  } catch (error) {
    return error;
  }
  throw new Error('the policy was accepted');
};

describe('parseCardanoCustodyAgentPolicy', () => {
  it('reads the policy as JSON text, with the grant integers as bigint', () => {
    expect(parse(JSON.stringify(policyJson))).toEqual({
      type: 'cardano-custody-agent-policy',
      version: 2,
      account: record,
      grantee: agentGrant.grantee,
      grant: {
        slot: 2n,
        generation: 1n,
        token: tokenOf(2),
        asset: { policyId: '', assetName: '' },
        perCallCap: 10_000_000n,
        cap: 15_000_000n,
        lovelacePerCallCap: 0n,
        lovelaceCap: 0n,
        expiresAt: agentGrant.scope.expiresAt,
        recipients: [RECIPIENT_ADDRESS],
      },
    });
  });

  it('reads back the policy the account exports', async () => {
    const { wallet, settledUtxos$ } = createCustodyTestWallet();
    const { accountId } = await openCardanoCustodyAccount(wallet, {
      record,
      name: 'Mine',
    });
    settledUtxos$.next({ [accountId]: [grantedControl, agentGrantUtxo] });
    const exported = await exportCardanoCustodyAgentPolicy(wallet, {
      accountId,
      slot: 0n,
    });

    const { account, grantee, grant } = parse(JSON.stringify(exported));

    expect(account).toEqual(record);
    expect(grantee).toBe(agentGrant.grantee);
    expect(grant).toEqual({
      slot: agentGrant.slot,
      generation: agentGrant.generation,
      token: tokenOf(0),
      ...agentGrant.scope,
    });
  });

  it('reads a token grant with lovelace caps', () => {
    const asset = { policyId: 'cd'.repeat(28), assetName: '4e49474854' };

    const { grant } = parse({
      ...policyJson,
      grant: {
        ...grantJson,
        asset,
        lovelacePerCallCap: '2000000',
        lovelaceCap: '3000000',
      },
    });

    expect(grant).toMatchObject({
      asset,
      lovelacePerCallCap: 2_000_000n,
      lovelaceCap: 3_000_000n,
    });
  });

  it.each<{
    name: string;
    input: unknown;
    field?: string;
    reason?: string;
  }>([
    {
      name: 'text that is not JSON',
      input: 'not json',
      reason: 'expected JSON',
    },
    {
      name: 'an array',
      input: [policyJson],
      reason: 'expected exactly type, version, account, grantee, grant',
    },
    {
      name: 'an extra field',
      input: { ...policyJson, note: 'x' },
      reason: 'expected exactly type, version, account, grantee, grant',
    },
    {
      name: 'another type',
      input: { ...policyJson, type: 'cardano-custody-account' },
      field: 'type',
      reason: 'unknown type',
    },
    {
      name: 'version 1, which named its grant by slot alone',
      input: {
        type: 'cardano-custody-agent-policy',
        version: 1,
        account: record,
        grant: { ...grantJson, grantee: agentGrant.grantee },
      },
      field: 'version',
      reason: 'unsupported version',
    },
    {
      name: 'version 1 as JSON text',
      input: JSON.stringify({ ...policyJson, version: 1 }),
      field: 'version',
      reason: 'unsupported version',
    },
    {
      name: 'a missing grantee',
      input: {
        type: policyJson.type,
        version: policyJson.version,
        account: policyJson.account,
        grant: policyJson.grant,
      },
      reason: 'expected exactly type, version, account, grantee, grant',
    },
    {
      name: 'a token of another slot',
      input: { ...policyJson, grant: { ...grantJson, token: tokenOf(3) } },
      field: 'grant.token',
    },
    {
      name: 'the upstream record shape',
      input: {
        ...policyJson,
        account: {
          owner: record.creatorKeyHash,
          stakeScriptHash: record.stakeScriptHash,
          address: record.address,
        },
      },
      field: 'account',
    },
    {
      name: 'a grant as JSON text',
      input: { ...policyJson, grant: JSON.stringify(grantJson) },
      field: 'grant',
    },
    {
      name: 'a grant with an extra field',
      input: { ...policyJson, grant: { ...grantJson, note: 'x' } },
      field: 'grant',
    },
    {
      name: 'an integer with a leading zero',
      input: { ...policyJson, grant: { ...grantJson, perCallCap: '010' } },
      field: 'grant.perCallCap',
    },
    {
      name: 'a negative cap',
      input: { ...policyJson, grant: { ...grantJson, cap: '-1' } },
      field: 'grant.cap',
    },
    {
      name: 'an integer as a JSON number',
      input: { ...policyJson, grant: { ...grantJson, slot: 2 } },
      field: 'grant.slot',
    },
    {
      name: 'a zero expiry',
      input: { ...policyJson, grant: { ...grantJson, expiresAt: '0' } },
      field: 'grant',
      reason: 'non-positive-expiry',
    },
    {
      name: 'an upper-case grantee',
      input: { ...policyJson, grantee: policyJson.grantee.toUpperCase() },
      field: 'grantee',
    },
    {
      name: 'a grantee of 27 bytes',
      input: { ...policyJson, grantee: policyJson.grantee.slice(2) },
      field: 'grantee',
    },
    {
      name: 'a policy id of 27 bytes',
      input: {
        ...policyJson,
        grant: {
          ...grantJson,
          asset: { policyId: 'cd'.repeat(27), assetName: '' },
        },
      },
      field: 'grant',
      reason: 'invalid-policy-id',
    },
    {
      name: 'a recipient that is not an address',
      input: {
        ...policyJson,
        grant: { ...grantJson, recipients: ['addr_test1'] },
      },
      field: 'grant.recipients',
    },
    {
      name: 'a recipient on another network',
      input: {
        ...policyJson,
        grant: { ...grantJson, recipients: [MAINNET_RECIPIENT] },
      },
      field: 'grant.recipients',
      reason: 'expected bech32 payment addresses on the account network',
    },
    {
      name: 'a lovelace grant with lovelace caps',
      input: { ...policyJson, grant: { ...grantJson, lovelaceCap: '1' } },
      field: 'grant',
      reason: 'lovelace-grant-lovelace-caps',
    },
    {
      name: 'a recipient listed twice',
      input: {
        ...policyJson,
        grant: {
          ...grantJson,
          recipients: [RECIPIENT_ADDRESS, RECIPIENT_ADDRESS],
        },
      },
      field: 'grant',
      reason: 'duplicate-recipient',
    },
  ])('refuses $name', ({ input, field, reason }) => {
    const refusal = refusalOf(input);

    expect(refusal).toBeInstanceOf(CardanoCustodyAgentPolicyInvalidError);
    const { field: refusedField, reason: refusedReason } =
      refusal as CardanoCustodyAgentPolicyInvalidError;
    expect(refusedField).toBe(field);
    if (reason !== undefined) expect(refusedReason).toBe(reason);
  });

  it.each([
    [
      'a stake script hash its creator does not yield',
      { ...record, stakeScriptHash: 'ab'.repeat(28) },
      3,
    ],
    [
      'another testnet',
      { ...record, networkMagic: Cardano.NetworkMagics.Preview },
      5,
    ],
  ])(
    'refuses an account record with %s as the record parser does',
    (_, account, step) => {
      const refusal = refusalOf({ ...policyJson, account });

      expect(refusal).toBeInstanceOf(CardanoCustodyRecordInvalidError);
      expect((refusal as CardanoCustodyRecordInvalidError).reason.step).toBe(
        step,
      );
    },
  );

  it('refuses an account of an unsupported contract version', () => {
    expect(
      refusalOf({
        ...policyJson,
        account: { ...record, accountValidatorHash: 'cd'.repeat(28) },
      }),
    ).toBeInstanceOf(CardanoCustodyUnsupportedVersionError);
  });

  it('refuses a policy for another network than the one asked for', () => {
    expect(() =>
      parseCardanoCustodyAgentPolicy(policyJson, {
        networkMagic: Cardano.NetworkMagics.Preview,
      }),
    ).toThrow(CardanoCustodyRecordInvalidError);
  });
});
