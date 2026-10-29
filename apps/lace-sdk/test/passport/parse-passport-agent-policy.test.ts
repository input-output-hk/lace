import { describe, expect, it } from 'vitest';

import { exportPassportAgentPolicy } from '../../src/passport/export-passport-agent-policy';
import {
  parsePassportAgentPolicy,
  PassportAgentPolicyInvalidError,
} from '../../src/passport/parse-passport-agent-policy';

import {
  account,
  ACCOUNT_ADDRESS,
  grantRecord,
  GRANT_ID,
  NETWORK,
  SECP256K1_GRANTEE_PUBLIC_KEY,
  walletWith,
} from './passport-fixtures';

const policy = await exportPassportAgentPolicy(
  walletWith(account, [grantRecord()]),
  { grantId: GRANT_ID },
);

const parse = (input: unknown) =>
  parsePassportAgentPolicy(input, { network: NETWORK });

const refusalOf = (input: unknown): PassportAgentPolicyInvalidError => {
  try {
    parse(input);
  } catch (error) {
    expect(error).toBeInstanceOf(PassportAgentPolicyInvalidError);
    return error as PassportAgentPolicyInvalidError;
  }
  throw new Error('the policy was accepted');
};

describe('parsePassportAgentPolicy', () => {
  it('round trips an exported policy, as an object and as JSON text', () => {
    expect(parse(policy)).toEqual(policy);
    expect(parse(JSON.stringify(policy))).toEqual(policy);
  });

  it('round trips a policy for a secp256k1 grantee', () => {
    const k256 = {
      ...policy,
      granteeScheme: 'secp256k1-ecdsa',
      granteePublicKey: SECP256K1_GRANTEE_PUBLIC_KEY,
    };

    expect(parse(k256)).toEqual(k256);
    expect(parse(JSON.stringify(k256))).toEqual(k256);
  });

  it('round trips a policy that never expires and one pinned to no recipient', () => {
    const open = {
      ...policy,
      expiresAt: null,
      recipient: { kind: 'any' },
    };

    expect(parse(open)).toEqual(open);
  });

  it('round trips a read grant policy carrying its sealed view', () => {
    const seal = new Uint8Array(94);
    seal[0] = 0x01;
    seal[1] = 0x01;
    const withView = {
      ...policy,
      view: Buffer.from(seal).toString('base64url'),
    };

    expect(parse(withView)).toEqual(withView);
    expect(parse(JSON.stringify(withView))).toEqual(withView);
  });

  it.each([
    ['not a string', 7],
    ['not base64url', `${'AQE'}+/=`],
    ['too short', Buffer.from(new Uint8Array(93)).toString('base64url')],
    ['too long', Buffer.from(new Uint8Array(95)).toString('base64url')],
    [
      'another version',
      Buffer.from(
        Uint8Array.from([0x02, 0x01, ...new Uint8Array(92)]),
      ).toString('base64url'),
    ],
    [
      'another suite',
      Buffer.from(
        Uint8Array.from([0x01, 0x02, ...new Uint8Array(92)]),
      ).toString('base64url'),
    ],
    [
      'a non-canonical spelling of a seal',
      `${Buffer.from(Uint8Array.from([0x01, 0x01, ...new Uint8Array(92)]))
        .toString('base64url')
        .slice(0, -1)}B`,
    ],
  ])('refuses a view that is %s', (_name, view) => {
    expect(refusalOf({ ...policy, view })).toMatchObject({ field: 'view' });
  });

  it('refuses a policy for another network', () => {
    expect(refusalOf({ ...policy, network: 'preprod' })).toMatchObject({
      field: 'network',
    });
  });

  it('refuses text that is not JSON and a value that is not an object', () => {
    expect(refusalOf('{')).toMatchObject({ field: 'policy' });
    expect(refusalOf(null)).toMatchObject({ field: 'policy' });
    expect(refusalOf([policy])).toMatchObject({ field: 'policy' });
  });

  it('refuses another type and any other version', () => {
    expect(refusalOf({ ...policy, type: 'other' })).toMatchObject({
      field: 'type',
    });
    const { granteeScheme: _scheme, ...v1 } = policy;
    expect(refusalOf({ ...v1, version: 1 })).toMatchObject({
      field: 'version',
      reason: 'unsupported version',
    });
    expect(refusalOf({ ...policy, version: 3 })).toMatchObject({
      field: 'version',
      reason: 'unsupported version',
    });
  });

  it.each([
    ['a missing scheme', undefined],
    ['an unknown scheme', 'p256-ecdsa'],
    ['a scheme that is not text', 7],
  ])('refuses %s', (_name, granteeScheme) => {
    const { granteeScheme: _scheme, ...without } = policy;
    const input =
      granteeScheme === undefined ? without : { ...policy, granteeScheme };

    expect(refusalOf(input)).toMatchObject({ field: 'granteeScheme' });
  });

  it.each([
    ['jubjub-schnorr', 'a compressed point', SECP256K1_GRANTEE_PUBLIC_KEY],
    ['jubjub-schnorr', 'upper-case hex', 'AB'.repeat(32)],
    ['secp256k1-ecdsa', 'a 32-byte key', '22'.repeat(32)],
    ['secp256k1-ecdsa', 'an uncompressed prefix', `04${'22'.repeat(32)}`],
    ['secp256k1-ecdsa', 'a prefix of 01', `01${'22'.repeat(32)}`],
    ['secp256k1-ecdsa', 'upper-case hex', `02${'AB'.repeat(32)}`],
    ['secp256k1-ecdsa', 'a key of 34 bytes', `02${'22'.repeat(33)}`],
  ])(
    'refuses a %s key that is %s',
    (granteeScheme, _name, granteePublicKey) => {
      expect(
        refusalOf({ ...policy, granteeScheme, granteePublicKey }),
      ).toMatchObject({ field: 'granteePublicKey' });
    },
  );

  it('refuses a missing field and an extra field', () => {
    const { origin: _origin, ...missing } = policy;

    expect(refusalOf(missing)).toMatchObject({
      field: 'origin',
      reason: 'is missing',
    });
    expect(refusalOf({ ...policy, extra: 1 })).toMatchObject({
      field: 'extra',
    });
  });

  it.each([
    ['account', ''],
    ['grantId', 'AB'.repeat(32)],
    ['slot', 256],
    ['slot', 1.5],
    ['granteePublicKey', 'ab'],
    ['scopeSalt', 'zz'.repeat(32)],
    ['color', 7],
    ['maxCoinValue', '01'],
    ['maxCoinValue', '-1'],
    ['maxCoinValue', (2n ** 128n).toString()],
    ['perCallCap', 100],
    ['cap', '49'],
    ['expiresAt', 0],
    ['expiresAt', 1.5],
    ['expiresAt', '1900000000'],
    ['window', { lengthSeconds: 60, cap: '10' }],
    ['window', {}],
    ['operations', []],
    ['operations', ['withdraw-unshielded', 'withdraw-unshielded']],
    ['operations', ['mint']],
    ['origin', ''],
  ])('refuses a malformed %s (%j)', (field, value) => {
    expect(refusalOf({ ...policy, [field]: value })).toMatchObject({ field });
  });

  it.each([
    [{ kind: 'user-address' }],
    [{ kind: 'user-address', value: 'ab' }],
    [{ kind: 'any', value: '44'.repeat(32) }],
    [{ kind: 'wallet', value: '44'.repeat(32) }],
    ['any'],
  ])('refuses a malformed recipient %j', recipient => {
    expect(refusalOf({ ...policy, recipient })).toMatchObject({
      field: expect.stringMatching(/^recipient/) as unknown,
    });
  });

  it('keeps the account address as given', () => {
    expect(parse(policy).account).toBe(ACCOUNT_ADDRESS);
  });
});
