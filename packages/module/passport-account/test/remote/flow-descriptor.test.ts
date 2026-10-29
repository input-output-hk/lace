import { GrantSlot } from '@lace-contract/passport';
import { describe, expect, it } from 'vitest';

import { MAX_DEVICE_ENTRIES } from '../../src/acc/envelopes';
import { MalformedPayloadError } from '../../src/remote/codec';
import { decodeSignerFlow } from '../../src/remote/flow-descriptor';

import { ACCOUNT, spendScope } from './fake-grant';

const COMMITMENT_HEX = 'aB'.repeat(32);
const GRANT_ID = 'cd'.repeat(32);
const SCOPE_SALT = '22'.repeat(32);
const SCOPE_DIGEST = 'ef'.repeat(32);
const DEVICES = ['11'.repeat(32), '33'.repeat(32)];
const READER = {
  readerPublicKey: '12'.repeat(32),
  devicePublicKey: '34'.repeat(32),
};

const issueGrantFlow = {
  kind: 'issue-grant',
  account: ACCOUNT,
  grantId: GRANT_ID,
  scope: spendScope,
  slot: 0,
  scopeSalt: SCOPE_SALT,
  scopeDigest: SCOPE_DIGEST,
};

const refusalOf = (flow: unknown): unknown => {
  try {
    decodeSignerFlow(flow);
  } catch (error) {
    return error;
  }
  throw new Error('Expected the descriptor to be refused.');
};

describe('decodeSignerFlow', () => {
  it.each(['read-holdings', 'sign-in'] as const)(
    'reads a %s descriptor as its kind alone',
    kind => {
      expect(decodeSignerFlow({ kind })).toEqual({ kind });
    },
  );

  it('reads a create-account descriptor as its lock choice, which it must carry as a boolean', () => {
    expect(
      decodeSignerFlow({ kind: 'create-account', lockAccount: true }),
    ).toEqual({ kind: 'create-account', lockAccount: true });
    expect(refusalOf({ kind: 'create-account' })).toEqual(
      new MalformedPayloadError('flow.lockAccount'),
    );
    expect(refusalOf({ kind: 'create-account', lockAccount: 'yes' })).toEqual(
      new MalformedPayloadError('flow.lockAccount'),
    );
    expect(refusalOf({ kind: 'sign-in', lockAccount: true })).toEqual(
      new MalformedPayloadError('flow.lockAccount'),
    );
  });

  it('reads an install-operations descriptor as the account and the operations it installs', () => {
    const operations = [
      'withdraw_unshielded_with_grant_k256',
      'withdraw_shielded_with_grant_k256',
    ];

    expect(
      decodeSignerFlow({
        kind: 'install-operations',
        account: ACCOUNT,
        operations,
      }),
    ).toEqual({ kind: 'install-operations', account: ACCOUNT, operations });
  });

  it.each<[string, unknown, string]>([
    ['no operations', undefined, 'flow.operations'],
    ['an empty list', [], 'flow.operations'],
    [
      'an operation outside the deployed roster',
      ['recover_submit'],
      'flow.operations[0]',
    ],
    ['an operation that is not a string', [7], 'flow.operations[0]'],
    [
      'an operation twice',
      ['deposit_shielded', 'deposit_shielded'],
      'flow.operations',
    ],
  ])(
    'refuses an install-operations descriptor carrying %s',
    (_name, operations, field) => {
      expect(
        refusalOf({ kind: 'install-operations', account: ACCOUNT, operations }),
      ).toEqual(new MalformedPayloadError(field));
    },
  );

  it('refuses operations on a flow that installs none', () => {
    expect(
      refusalOf({ kind: 'sign-in', operations: ['deposit_shielded'] }),
    ).toEqual(new MalformedPayloadError('flow.operations'));
  });

  it('reads a revoke-all-grants descriptor as the account it acts on', () => {
    expect(
      decodeSignerFlow({ kind: 'revoke-all-grants', account: ACCOUNT }),
    ).toEqual({ kind: 'revoke-all-grants', account: ACCOUNT });
  });

  it('reads an add-device descriptor as its commitment, lowercased, and the account it acts on', () => {
    expect(
      decodeSignerFlow({
        kind: 'add-device',
        commitmentHex: COMMITMENT_HEX,
        account: ACCOUNT,
      }),
    ).toEqual({
      kind: 'add-device',
      commitmentHex: COMMITMENT_HEX.toLowerCase(),
      account: ACCOUNT,
    });
  });

  it('reads a remove-device descriptor with the device entries that keep reading, lowercased', () => {
    expect(
      decodeSignerFlow({
        kind: 'remove-device',
        commitmentHex: COMMITMENT_HEX,
        account: ACCOUNT,
        devices: ['CD'.repeat(32), DEVICES[1]],
      }),
    ).toEqual({
      kind: 'remove-device',
      commitmentHex: COMMITMENT_HEX.toLowerCase(),
      account: ACCOUNT,
      devices: ['cd'.repeat(32), DEVICES[1]],
    });
  });

  it('refuses a remove-device descriptor without devices, with one twice, or with the target among them', () => {
    const removal = {
      kind: 'remove-device',
      commitmentHex: COMMITMENT_HEX,
      account: ACCOUNT,
    };

    expect(refusalOf(removal)).toEqual(
      new MalformedPayloadError('flow.devices'),
    );
    expect(
      refusalOf({ ...removal, devices: [DEVICES[0], DEVICES[0]] }),
    ).toEqual(new MalformedPayloadError('flow.devices'));
    expect(
      refusalOf({ ...removal, devices: [COMMITMENT_HEX.toLowerCase()] }),
    ).toEqual(new MalformedPayloadError('flow.devices'));
    expect(refusalOf({ ...removal, devices: ['ab'] })).toEqual(
      new MalformedPayloadError('flow.devices[0]'),
    );
    expect(refusalOf({ ...removal, devices: 'ab' })).toEqual(
      new MalformedPayloadError('flow.devices'),
    );
  });

  it('refuses devices on a flow that does not rotate', () => {
    expect(
      refusalOf({
        kind: 'add-device',
        commitmentHex: COMMITMENT_HEX,
        account: ACCOUNT,
        devices: DEVICES,
      }),
    ).toEqual(new MalformedPayloadError('flow.devices'));
    expect(refusalOf({ ...issueGrantFlow, devices: DEVICES })).toEqual(
      new MalformedPayloadError('flow.devices'),
    );
    expect(
      refusalOf({
        kind: 'revoke-grant',
        grantId: GRANT_ID,
        account: ACCOUNT,
        devices: DEVICES,
      }),
    ).toEqual(new MalformedPayloadError('flow.devices'));
    expect(refusalOf({ kind: 'sign-in', devices: DEVICES })).toEqual(
      new MalformedPayloadError('flow.devices'),
    );
  });

  it('reads the joining device keys an add-device descriptor carries', () => {
    expect(
      decodeSignerFlow({
        kind: 'add-device',
        commitmentHex: COMMITMENT_HEX,
        account: ACCOUNT,
        reader: READER,
      }),
    ).toEqual({
      kind: 'add-device',
      commitmentHex: COMMITMENT_HEX.toLowerCase(),
      account: ACCOUNT,
      reader: READER,
    });
  });

  it('reads the device entries of an enrolment that rotates ahead of handing over the keys', () => {
    expect(
      decodeSignerFlow({
        kind: 'add-device',
        commitmentHex: COMMITMENT_HEX,
        account: ACCOUNT,
        reader: READER,
        devices: DEVICES,
      }),
    ).toEqual({
      kind: 'add-device',
      commitmentHex: COMMITMENT_HEX.toLowerCase(),
      account: ACCOUNT,
      reader: READER,
      devices: DEVICES,
    });
  });

  it('refuses more device entries than a rotation names', () => {
    const many = Array.from({ length: MAX_DEVICE_ENTRIES + 1 }, (_, index) =>
      index.toString(16).padStart(64, '0'),
    );

    expect(
      refusalOf({
        kind: 'remove-device',
        commitmentHex: COMMITMENT_HEX,
        account: ACCOUNT,
        devices: many,
      }),
    ).toEqual(new MalformedPayloadError('flow.devices'));
    expect(
      refusalOf({
        kind: 'add-device',
        commitmentHex: COMMITMENT_HEX,
        account: ACCOUNT,
        reader: READER,
        devices: many,
      }),
    ).toEqual(new MalformedPayloadError('flow.devices'));
    expect(
      decodeSignerFlow({
        kind: 'remove-device',
        commitmentHex: COMMITMENT_HEX,
        account: ACCOUNT,
        devices: many.slice(1),
      }),
    ).toMatchObject({ devices: many.slice(1) });
  });

  it('reads a revoke-grant descriptor as its grant id and account', () => {
    expect(
      decodeSignerFlow({
        kind: 'revoke-grant',
        grantId: GRANT_ID,
        account: ACCOUNT,
      }),
    ).toEqual({ kind: 'revoke-grant', grantId: GRANT_ID, account: ACCOUNT });
  });

  it('reads the read flag of a revoke descriptor, and keeps it absent when not carried', () => {
    expect(
      decodeSignerFlow({
        kind: 'revoke-grant',
        grantId: GRANT_ID,
        read: true,
        account: ACCOUNT,
        devices: DEVICES,
      }),
    ).toEqual({
      kind: 'revoke-grant',
      grantId: GRANT_ID,
      read: true,
      account: ACCOUNT,
      devices: DEVICES,
    });
    expect(
      refusalOf({
        kind: 'revoke-all-grants',
        read: true,
        account: ACCOUNT,
      }),
    ).toEqual(new MalformedPayloadError('flow.devices'));
    expect(
      decodeSignerFlow({
        kind: 'revoke-all-grants',
        account: ACCOUNT,
        read: false,
      }),
    ).toEqual({ kind: 'revoke-all-grants', account: ACCOUNT, read: false });
    expect(
      decodeSignerFlow({ kind: 'revoke-all-grants', account: ACCOUNT }),
    ).not.toHaveProperty('read');
  });

  it('refuses a revoke descriptor without a readable account, rotating or not', () => {
    expect(refusalOf({ kind: 'revoke-all-grants', read: true })).toEqual(
      new MalformedPayloadError('flow.account'),
    );
    expect(
      refusalOf({ kind: 'revoke-all-grants', read: true, account: 'xyz' }),
    ).toEqual(new MalformedPayloadError('flow.account'));
    expect(refusalOf({ kind: 'revoke-grant', grantId: GRANT_ID })).toEqual(
      new MalformedPayloadError('flow.account'),
    );
    expect(refusalOf({ kind: 'revoke-all-grants', read: false })).toEqual(
      new MalformedPayloadError('flow.account'),
    );
  });

  it('refuses a read flag that is not a boolean, and one on a flow that never rotates', () => {
    expect(
      refusalOf({
        kind: 'revoke-grant',
        grantId: GRANT_ID,
        account: ACCOUNT,
        read: 'yes',
      }),
    ).toEqual(new MalformedPayloadError('flow.read'));
    expect(refusalOf({ kind: 'sign-in', read: true })).toEqual(
      new MalformedPayloadError('flow.read'),
    );
    expect(refusalOf({ ...issueGrantFlow, read: true })).toEqual(
      new MalformedPayloadError('flow.read'),
    );
  });

  it('reads the read public key an issue-grant scope carries, with the devices its rotation keeps', () => {
    const readFlow = {
      ...issueGrantFlow,
      scope: { ...spendScope, read: true, readPublicKey: 'ab'.repeat(32) },
    };
    const decoded = decodeSignerFlow({ ...readFlow, devices: DEVICES });

    expect(decoded.kind === 'issue-grant' && decoded.scope.readPublicKey).toBe(
      'ab'.repeat(32),
    );
    expect(decoded.kind === 'issue-grant' && decoded.devices).toEqual(DEVICES);
    expect(refusalOf(readFlow)).toEqual(
      new MalformedPayloadError('flow.devices'),
    );
  });

  it('reads an issue-grant descriptor with every field it binds, typed', () => {
    expect(decodeSignerFlow(issueGrantFlow)).toEqual({
      ...issueGrantFlow,
      slot: GrantSlot(0),
    });
  });

  it('keeps only the optional scope fields the descriptor carries', () => {
    const decoded = decodeSignerFlow({
      ...issueGrantFlow,
      scope: { ...spendScope, caller: 'ab'.repeat(32), rpId: 'dapp.example' },
    });

    expect(decoded.kind === 'issue-grant' && decoded.scope).toEqual({
      ...spendScope,
      caller: 'ab'.repeat(32),
      rpId: 'dapp.example',
    });
  });

  it.each<[string, unknown]>([
    ['flow', undefined],
    ['flow', 'sign-in'],
    ['flow.kind', { kind: 'withdraw' }],
    ['flow.kind', {}],
    ['flow.commitmentHex', { kind: 'add-device' }],
    ['flow.commitmentHex', { kind: 'add-device', commitmentHex: 'ab' }],
    ['flow.account', { kind: 'add-device', commitmentHex: COMMITMENT_HEX }],
    [
      'flow.account',
      { kind: 'remove-device', commitmentHex: COMMITMENT_HEX, account: 'xyz' },
    ],
    [
      'flow.reader',
      {
        kind: 'remove-device',
        commitmentHex: COMMITMENT_HEX,
        account: ACCOUNT,
        reader: READER,
      },
    ],
    [
      'flow.reader',
      {
        kind: 'add-device',
        commitmentHex: COMMITMENT_HEX,
        account: ACCOUNT,
        reader: 'ab',
      },
    ],
    [
      'flow.reader.devicePublicKey',
      {
        kind: 'add-device',
        commitmentHex: COMMITMENT_HEX,
        account: ACCOUNT,
        reader: { ...READER, devicePublicKey: 'AB'.repeat(32) },
      },
    ],
    ['flow.reader', { kind: 'sign-in', reader: READER }],
    ['flow.commitmentHex', { kind: 'sign-in', commitmentHex: COMMITMENT_HEX }],
    ['flow.grantId', { kind: 'revoke-grant' }],
    ['flow.grantId', { kind: 'revoke-grant', grantId: 'CD'.repeat(32) }],
    ['flow.grantId', { kind: 'revoke-all-grants', grantId: GRANT_ID }],
    ['flow.scope', { kind: 'create-account', scope: spendScope }],
    [
      'flow.commitmentHex',
      { kind: 'read-holdings', commitmentHex: COMMITMENT_HEX },
    ],
    ['flow.grantId', { kind: 'read-holdings', grantId: GRANT_ID }],
    [
      'flow.commitmentHex',
      { ...issueGrantFlow, commitmentHex: COMMITMENT_HEX },
    ],
    ['flow.account', { ...issueGrantFlow, account: undefined }],
    ['flow.slot', { ...issueGrantFlow, slot: '0' }],
    ['flow.scopeSalt', { ...issueGrantFlow, scopeSalt: '22'.repeat(31) }],
    ['flow.scopeDigest', { ...issueGrantFlow, scopeDigest: 'zz'.repeat(32) }],
    [
      'flow.scope.grantee.scheme',
      {
        ...issueGrantFlow,
        scope: { ...spendScope, grantee: { scheme: 'ecdsa' } },
      },
    ],
    [
      'flow.scope.operations[0]',
      { ...issueGrantFlow, scope: { ...spendScope, operations: ['spend'] } },
    ],
    [
      'flow.scope.cap',
      { ...issueGrantFlow, scope: { ...spendScope, cap: 450 } },
    ],
    [
      'flow.scope.window',
      {
        ...issueGrantFlow,
        scope: { ...spendScope, window: { lengthSeconds: 60, cap: '1' } },
      },
    ],
  ])(
    'refuses a descriptor whose %s cannot be read, naming it',
    (field, flow) => {
      const refusal = refusalOf(flow);

      expect(refusal).toBeInstanceOf(MalformedPayloadError);
      expect(refusal).toMatchObject({
        code: 'malformed-payload',
        field,
        message: `The signer message field "${field}" is malformed.`,
      });
    },
  );
});
