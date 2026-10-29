import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  createCustodyAccountRecord,
  CURRENT_CUSTODY_CONTRACT_VERSION,
  custodyGrantAssetId,
  deriveCustodyAccountIdentity,
  exportCustodyAgentPolicy,
  parseCustodyAgentPolicy,
} from '../src';

import {
  AGENT_KEY,
  EXPIRY,
  fixtureGrants,
  PREPROD_ADDRESS,
  PREPROD_OWNER,
  STRANGER_KEY,
  TOKEN_NAME,
  TOKEN_POLICY,
  tokenScope,
} from './fixtures';

import type {
  CustodyAccountIdentity,
  CustodyAccountRecord,
  CustodyAgentPolicy,
  CustodyRecipient,
} from '../src';

const PREPROD = Cardano.ChainIds.Preprod.networkMagic;

const identityOn = (chainId: Cardano.ChainId): CustodyAccountIdentity => {
  const identity = deriveCustodyAccountIdentity({
    contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
    creatorKeyHash: PREPROD_OWNER,
    chainId,
  });
  if (!identity.ok) throw new Error('The Preprod owner was refused');
  return identity.value;
};

const strangerOn = (networkId: Cardano.NetworkId): string =>
  Cardano.EnterpriseAddress.fromCredentials(networkId, {
    type: Cardano.CredentialType.KeyHash,
    hash: STRANGER_KEY as string as Cardano.Credential['hash'],
  })
    .toAddress()
    .toBech32();

const preprodIdentity = identityOn(Cardano.ChainIds.Preprod);
const record = createCustodyAccountRecord(preprodIdentity);

const exported = (grant = fixtureGrants[1]): CustodyAgentPolicy => {
  const policy = exportCustodyAgentPolicy(record, grant);
  if (!policy.ok) throw new Error('The fixture grant was refused');
  return policy.value;
};

describe('exportCustodyAgentPolicy', () => {
  it('renders the grant with decimal strings, its token and bech32 recipients', () => {
    expect(exportCustodyAgentPolicy(record, fixtureGrants[1])).toEqual({
      ok: true,
      value: {
        type: 'cardano-custody-agent-policy',
        version: 2,
        account: record,
        grantee: AGENT_KEY,
        grant: {
          slot: '1',
          generation: '0',
          token: `${record.accountValidatorHash}${record.stakeScriptHash}00000001`,
          asset: { policyId: TOKEN_POLICY, assetName: TOKEN_NAME },
          perCallCap: '10',
          cap: '50',
          lovelacePerCallCap: '2500000',
          lovelaceCap: '3000000',
          expiresAt: EXPIRY.toString(),
          recipients: [strangerOn(Cardano.NetworkId.Testnet)],
        },
      },
    });
  });

  it('renders an unrestricted lovelace grant as JSON', () => {
    const policy = exported({ ...fixtureGrants[0], generation: 3n });
    expect(policy.grant).toMatchObject({
      generation: '3',
      asset: { policyId: '', assetName: '' },
      lovelacePerCallCap: '0',
      recipients: [],
    });
    expect(JSON.parse(JSON.stringify(policy))).toEqual(policy);
    expect(policy.account.address).toBe(PREPROD_ADDRESS);
  });

  it('renders recipients on the record network', () => {
    const mainnetRecord = createCustodyAccountRecord(
      identityOn(Cardano.ChainIds.Mainnet),
    );
    const policy = exportCustodyAgentPolicy(mainnetRecord, fixtureGrants[2]);
    expect(policy.ok && policy.value.grant.recipients).toEqual([
      strangerOn(Cardano.NetworkId.Mainnet),
    ]);
  });

  it('copies only the record fields', () => {
    const policy = exportCustodyAgentPolicy(
      { ...record, extra: true } as CustodyAccountRecord,
      fixtureGrants[0],
    );
    expect(policy.ok && Object.keys(policy.value.account)).toEqual(
      Object.keys(record),
    );
  });

  it('refuses a grant that breaks an authoring rule', () => {
    const unrepresentable: CustodyRecipient = {
      paymentCredential: {
        type: Cardano.CredentialType.KeyHash,
        hash: HexBlob('ff'),
      },
    };
    expect(
      exportCustodyAgentPolicy(record, {
        ...fixtureGrants[1],
        scope: tokenScope([unrepresentable]),
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'invalid-grant',
        violations: [
          { code: 'unrepresentable-recipient', recipientIndex: 0, slot: 1n },
        ],
      },
    });
  });
});

describe('parseCustodyAgentPolicy', () => {
  const policy = exported();

  /** The exported policy with a top-level or grant field replaced. */
  const withField = (changes: Record<string, unknown>) => ({
    ...policy,
    ...changes,
  });
  const withGrant = (changes: Record<string, unknown>) =>
    withField({ grant: { ...policy.grant, ...changes } });
  const malformed = (reason: string, field?: string) => ({
    ok: false,
    error: {
      code: 'malformed-agent-policy',
      reason,
      ...(field === undefined ? {} : { field }),
    },
  });

  it('reads back every exported grant, from JSON text or a parsed value', () => {
    for (const grant of [
      ...fixtureGrants,
      { ...fixtureGrants[1], slot: 2n ** 32n - 1n, generation: 3n },
    ]) {
      const text = JSON.stringify(exported(grant));
      expect(parseCustodyAgentPolicy(text, PREPROD)).toEqual({
        ok: true,
        value: { record, identity: preprodIdentity, grant },
      });
      expect(
        parseCustodyAgentPolicy(JSON.parse(text) as unknown, PREPROD),
      ).toMatchObject({ ok: true, value: { grant } });
    }
  });

  it.each<[string, unknown, ReturnType<typeof malformed>]>([
    ['text that is not JSON', '{', malformed('expected JSON')],
    [
      'an array',
      [],
      malformed('expected exactly type, version, account, grantee, grant'),
    ],
    [
      'an extra field',
      withField({ slot: '1' }),
      malformed('expected exactly type, version, account, grantee, grant'),
    ],
    [
      'another type',
      withField({ type: 'cardano-agent' }),
      malformed('unknown type', 'type'),
    ],
    [
      'version 1',
      withField({ version: 1 }),
      malformed('unsupported version', 'version'),
    ],
    [
      'a version written as text',
      withField({ version: '2' }),
      malformed('unsupported version', 'version'),
    ],
    [
      'the upstream account record',
      withField({
        account: {
          owner: PREPROD_OWNER,
          stakeScriptHash: record.stakeScriptHash,
          address: record.address,
        },
      }),
      malformed('expected an account record', 'account'),
    ],
    [
      'an upper-case grantee',
      withField({ grantee: AGENT_KEY.toUpperCase() }),
      malformed('expected 28 bytes of lower-case hex', 'grantee'),
    ],
    [
      'a grant without its token',
      withField({
        grant: Object.fromEntries(
          Object.entries(policy.grant).filter(([key]) => key !== 'token'),
        ),
      }),
      malformed(
        'expected exactly slot, generation, token, asset, perCallCap, cap, lovelacePerCallCap, lovelaceCap, expiresAt, recipients',
        'grant',
      ),
    ],
    [
      'a grant that also names its grantee',
      withGrant({ grantee: AGENT_KEY }),
      malformed(
        'expected exactly slot, generation, token, asset, perCallCap, cap, lovelacePerCallCap, lovelaceCap, expiresAt, recipients',
        'grant',
      ),
    ],
    [
      'a slot with a leading zero',
      withGrant({ slot: '01' }),
      malformed('expected a canonical non-negative decimal', 'grant.slot'),
    ],
    [
      'a negative generation',
      withGrant({ generation: '-1' }),
      malformed(
        'expected a canonical non-negative decimal',
        'grant.generation',
      ),
    ],
    [
      'a cap written as a number',
      withGrant({ cap: 50 }),
      malformed('expected a canonical non-negative decimal', 'grant.cap'),
    ],
    [
      'an expiry with a fraction',
      withGrant({ expiresAt: '1.5' }),
      malformed('expected a canonical non-negative decimal', 'grant.expiresAt'),
    ],
    [
      'an asset with an extra field',
      withGrant({ asset: { ...policy.grant.asset, ticker: 'T' } }),
      malformed('expected exactly policyId, assetName', 'grant.asset'),
    ],
    [
      'an asset name that is not text',
      withGrant({ asset: { ...policy.grant.asset, assetName: 1 } }),
      malformed('expected text', 'grant.asset.assetName'),
    ],
    [
      'recipients that are not a list',
      withGrant({ recipients: strangerOn(Cardano.NetworkId.Testnet) }),
      malformed('expected a list', 'grant.recipients'),
    ],
    [
      'a recipient on another network',
      withGrant({ recipients: [strangerOn(Cardano.NetworkId.Mainnet)] }),
      malformed(
        'expected bech32 payment addresses on the account network',
        'grant.recipients',
      ),
    ],
    [
      'a recipient spelled in upper case',
      withGrant({
        recipients: [strangerOn(Cardano.NetworkId.Testnet).toUpperCase()],
      }),
      malformed(
        'expected bech32 payment addresses on the account network',
        'grant.recipients',
      ),
    ],
    [
      'a reward address recipient',
      withGrant({ recipients: [preprodIdentity.rewardAccount] }),
      malformed(
        'expected bech32 payment addresses on the account network',
        'grant.recipients',
      ),
    ],
    [
      'the token of another slot',
      withGrant({ token: custodyGrantAssetId(record, 2n) }),
      malformed(
        'expected the grant token of the account and slot',
        'grant.token',
      ),
    ],
  ])('refuses %s', (_, input, refusal) => {
    expect(parseCustodyAgentPolicy(input, PREPROD)).toEqual(refusal);
  });

  it('refuses an account record of another network', () => {
    expect(
      parseCustodyAgentPolicy(policy, Cardano.ChainIds.Preview.networkMagic),
    ).toMatchObject({
      ok: false,
      error: {
        code: 'invalid-account',
        error: { code: 'network-mismatch', step: 5 },
      },
    });
  });

  it('refuses a grant that breaks an authoring rule', () => {
    expect(
      parseCustodyAgentPolicy(
        withGrant({
          asset: { policyId: '', assetName: '' },
          perCallCap: '1',
          cap: '1',
        }),
        PREPROD,
      ),
    ).toEqual({
      ok: false,
      error: {
        code: 'invalid-grant',
        violations: [{ code: 'lovelace-grant-lovelace-caps', slot: 1n }],
      },
    });
    expect(
      parseCustodyAgentPolicy(
        withGrant({ slot: (2n ** 32n).toString() }),
        PREPROD,
      ),
    ).toMatchObject({
      ok: false,
      error: {
        code: 'invalid-grant',
        violations: [{ code: 'slot-out-of-range' }],
      },
    });
  });
});
