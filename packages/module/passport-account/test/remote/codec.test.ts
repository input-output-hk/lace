import {
  AccAddress,
  GrantId,
  GrantScopeSalt,
  GrantSlot,
} from '@lace-contract/passport';
import { describe, expect, it } from 'vitest';

import { DEPLOYED_OPERATIONS } from '../../src/acc/deployed-operations';
import { MAX_INBOX_ENTRIES_PER_REQUEST } from '../../src/acc/inbox';
import {
  decodeAccount,
  decodeAccountKeys,
  decodeAuthorisation,
  decodeBigInt,
  decodeBigInts,
  decodeBoolean,
  decodeBytes,
  decodeCommitments,
  decodeDeviceDelivery,
  decodeDeviceReader,
  decodeGrantBookkeeping,
  decodeGrantId,
  decodeGrantScope,
  decodeInboxEntries,
  decodeKeyring,
  decodeLiveReader,
  decodeMaintenanceChanges,
  decodeMaintenanceKey,
  decodeRemovedDevice,
  decodeOpenedEntries,
  decodePoint,
  decodePresence,
  decodeRecord,
  decodeScopeSalt,
  decodeSealedEntries,
  decodeSignedMaintenanceUpdate,
  decodeSlot,
  decodeViewDelivery,
  encodeAccountKeys,
  encodeAuthorisation,
  encodeBigInt,
  encodeBytes,
  encodeKeyring,
  encodeLiveReader,
  encodeMaintenanceChanges,
  encodeRemovedDevice,
  encodeOpenedEntry,
  encodePoint,
  encodeSignedMaintenanceUpdate,
  MalformedPayloadError,
} from '../../src/remote/codec';

import {
  K256_GRANTEE_PUBLIC_KEY,
  k256SpendScope,
  spendScope,
} from './fake-grant';

import type {
  Authorisation,
  GrantBookkeeping,
  GrantScopeInput,
  OpenedInboxEntry,
} from '@lace-contract/passport';

const authorisation: Authorisation = {
  scheme: 'jubjub-schnorr',
  pk: { x: 1n, y: 2n },
  useCounter: 3n,
  sigR: { x: 4n, y: 5n },
  sigS: 6n,
  grindNonce: 7n,
};

const record = {
  address: 'ac'.repeat(32),
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '3',
};

describe('codec', () => {
  it('names the malformed field on the error as well as in its message', () => {
    const error = new MalformedPayloadError('flow.scope.cap');

    expect(error.code).toBe('malformed-payload');
    expect(error.field).toBe('flow.scope.cap');
    expect(error.message).toBe(
      'The signer message field "flow.scope.cap" is malformed.',
    );
  });

  it('carries bigints as decimal strings', () => {
    const value = BigInt(
      '0x0e7db4ea6533afa906673b0101343b00a6682093ccc81082d0',
    );

    expect(encodeBigInt(value)).toBe(value.toString(10));
    expect(decodeBigInt(encodeBigInt(value), 'value')).toBe(value);
  });

  it.each(['', '-1', '1.5', '0x10', 10, undefined])(
    'refuses %j as a bigint',
    value => {
      expect(() => decodeBigInt(value, 'epoch')).toThrow(
        new MalformedPayloadError('epoch'),
      );
    },
  );

  it('names the failing element of a bigint list', () => {
    expect(decodeBigInts(['1', '2'], 'counters')).toEqual([1n, 2n]);
    expect(() => decodeBigInts(['1', 'x'], 'counters')).toThrow(
      'The signer message field "counters[1]" is malformed.',
    );
    expect(() => decodeBigInts('1', 'counters')).toThrow(
      new MalformedPayloadError('counters'),
    );
  });

  it('carries bytes as lowercase hex', () => {
    const bytes = Uint8Array.from([0, 15, 255]);

    expect(encodeBytes(bytes)).toBe('000fff');
    expect(decodeBytes('000fff', 'key', 3)).toEqual(bytes);
  });

  it.each(['0F00fF', 'abcdef0', 'zzzzzz', 7])('refuses %j as bytes', value => {
    expect(() => decodeBytes(value, 'key', 3)).toThrow(
      new MalformedPayloadError('key'),
    );
  });

  it.each(['', '000f', '000fff00'])(
    'refuses %j as bytes of another length',
    value => {
      expect(() => decodeBytes(value, 'key', 3)).toThrow(
        new MalformedPayloadError('key'),
      );
    },
  );

  it('carries a curve point coordinate by coordinate', () => {
    expect(encodePoint({ x: 10n, y: 20n })).toEqual({ x: '10', y: '20' });
    expect(decodePoint({ x: '10', y: '20' }, 'pk')).toEqual({ x: 10n, y: 20n });
    expect(() => decodePoint({ x: '10' }, 'pk')).toThrow(
      new MalformedPayloadError('pk.y'),
    );
    expect(() => decodePoint('10,20', 'pk')).toThrow(
      new MalformedPayloadError('pk'),
    );
  });

  it('accepts a boolean and nothing else', () => {
    expect(decodeBoolean(true, 'lockAccount')).toBe(true);
    expect(() => decodeBoolean('true', 'lockAccount')).toThrow(
      new MalformedPayloadError('lockAccount'),
    );
  });

  it('accepts the three record presences and nothing else', () => {
    for (const presence of ['absent', 'pending', 'complete'] as const) {
      expect(decodePresence(presence, 'presence')).toBe(presence);
    }
    expect(() => decodePresence(true, 'presence')).toThrow(
      new MalformedPayloadError('presence'),
    );
    expect(() => decodePresence('stored', 'presence')).toThrow(
      new MalformedPayloadError('presence'),
    );
  });

  it('round-trips an authorisation through its encoded form', () => {
    const encoded = encodeAuthorisation(authorisation);

    expect(encoded).toEqual({
      scheme: 'jubjub-schnorr',
      pk: { x: '1', y: '2' },
      useCounter: '3',
      sigR: { x: '4', y: '5' },
      sigS: '6',
      grindNonce: '7',
    });
    expect(decodeAuthorisation(encoded, 'authorisation')).toEqual(
      authorisation,
    );
  });

  it('refuses an authorisation of another scheme, a grantee scheme included, or with a missing field', () => {
    const encoded = encodeAuthorisation(authorisation);

    expect(() =>
      decodeAuthorisation({ ...encoded, scheme: 'ed25519' }, 'authorisation'),
    ).toThrow(new MalformedPayloadError('authorisation.scheme'));
    expect(() =>
      decodeAuthorisation(
        { ...encoded, scheme: 'secp256k1-ecdsa' },
        'authorisation',
      ),
    ).toThrow(new MalformedPayloadError('authorisation.scheme'));
    expect(() =>
      decodeAuthorisation({ ...encoded, sigS: undefined }, 'authorisation'),
    ).toThrow(new MalformedPayloadError('authorisation.sigS'));
  });

  it('accepts device commitments only as 32-byte lowercase hex', () => {
    const commitment = 'ab'.repeat(32);

    expect(decodeCommitments([commitment], 'commitments')).toEqual([
      commitment,
    ]);
    expect(() => decodeCommitments([commitment, 'ab'], 'commitments')).toThrow(
      new MalformedPayloadError('commitments[1]'),
    );
    expect(() => decodeCommitments([7], 'commitments')).toThrow(
      new MalformedPayloadError('commitments[0]'),
    );
    expect(() => decodeCommitments(commitment, 'commitments')).toThrow(
      new MalformedPayloadError('commitments'),
    );
  });

  it('reads an account record, or undefined when nothing is stored', () => {
    expect(decodeRecord(record, 'record')).toEqual(record);
    expect(decodeRecord(undefined, 'record')).toBeUndefined();
    expect(() =>
      decodeRecord({ ...record, localUseCounter: 3 }, 'record'),
    ).toThrow(new MalformedPayloadError('record.localUseCounter'));
    expect(() => decodeRecord(null, 'record')).toThrow(
      new MalformedPayloadError('record'),
    );
  });

  it('reads a pending creation as its whole deployment, or as the marker of its key entries alone', () => {
    const keyEntries = ['d1'.repeat(192)];
    const deployment = {
      operations: ['deposit_unshielded'],
      lockAccount: true,
      verifierKeysDigest: 'f0'.repeat(32),
      saltHex: '07'.repeat(32),
      authorityKey: { tag: 'schnorr', value: 'ab'.repeat(32) },
      handoverAuthority: { tag: 'schnorr', value: 'cd'.repeat(32) },
      keyEntries,
    };

    expect(decodeRecord({ ...record, deployment }, 'record')).toEqual({
      ...record,
      deployment,
    });
    expect(
      decodeRecord({ ...record, deployment: { keyEntries } }, 'record'),
    ).toEqual({ ...record, deployment: { keyEntries } });
    for (const field of [
      'operations',
      'lockAccount',
      'verifierKeysDigest',
      'saltHex',
      'handoverAuthority',
    ] as const) {
      expect(() =>
        decodeRecord(
          {
            ...record,
            deployment: { keyEntries, [field]: deployment[field] },
          },
          'record',
        ),
      ).toThrow(new MalformedPayloadError(`record.deployment.${field}`));
    }
    expect(() =>
      decodeRecord({ ...record, deployment: { keyEntries: ['d1'] } }, 'record'),
    ).toThrow(new MalformedPayloadError('record.deployment.keyEntries[0]'));
    expect(() =>
      decodeRecord(
        {
          ...record,
          deployment: { ...deployment, authorityKey: { tag: 'rsa' } },
        },
        'record',
      ),
    ).toThrow(new MalformedPayloadError('record.deployment.authorityKey.tag'));
  });

  it('carries the grant bookkeeping of a record, keyed by grant id', () => {
    const grant = {
      slot: 3,
      scopeSalt: '07'.repeat(32),
      granteePublicKey: 'cd'.repeat(32),
      origin: 'lace.io',
    };
    const grantId = 'ab'.repeat(32);
    const withGrants = { ...record, grants: { [grantId]: grant } };

    expect(decodeRecord(withGrants, 'record')).toEqual(withGrants);
    expect(decodeRecord(record, 'record')).not.toHaveProperty('grants');
    expect(() =>
      decodeRecord({ ...record, grants: 'later' }, 'record'),
    ).toThrow(new MalformedPayloadError('record.grants'));
    expect(() =>
      decodeRecord(
        { ...record, grants: { [grantId]: { ...grant, slot: '3' } } },
        'record',
      ),
    ).toThrow(new MalformedPayloadError(`record.grants.${grantId}.slot`));
    expect(() =>
      decodeRecord(
        { ...record, grants: { [grantId]: { ...grant, scopeSalt: 7 } } },
        'record',
      ),
    ).toThrow(new MalformedPayloadError(`record.grants.${grantId}.scopeSalt`));
    expect(() =>
      decodeRecord({ ...record, grants: { [grantId]: null } }, 'record'),
    ).toThrow(new MalformedPayloadError(`record.grants.${grantId}`));
  });

  it('admits grant bookkeeping only in the shape the flows wrote it', () => {
    const grant = {
      slot: 3,
      scopeSalt: '07'.repeat(32),
      granteePublicKey: 'cd'.repeat(32),
      origin: 'lace.io',
    };
    const grantId = 'ab'.repeat(32);
    const withGrant = (
      overrides: Partial<typeof grant>,
      id: string = grantId,
    ) => ({ ...record, grants: { [id]: { ...grant, ...overrides } } });

    expect(() => decodeRecord(withGrant({}, 'ab'), 'record')).toThrow(
      new MalformedPayloadError('record.grants.ab'),
    );
    expect(() =>
      decodeRecord(withGrant({}, 'AB'.repeat(32)), 'record'),
    ).toThrow(new MalformedPayloadError(`record.grants.${'AB'.repeat(32)}`));
    expect(() => decodeRecord(withGrant({ slot: 256 }), 'record')).toThrow(
      new MalformedPayloadError(`record.grants.${grantId}.slot`),
    );
    expect(() => decodeRecord(withGrant({ slot: -1 }), 'record')).toThrow(
      new MalformedPayloadError(`record.grants.${grantId}.slot`),
    );
    expect(() => decodeRecord(withGrant({ slot: 1.5 }), 'record')).toThrow(
      new MalformedPayloadError(`record.grants.${grantId}.slot`),
    );
    expect(() =>
      decodeRecord(withGrant({ scopeSalt: '07'.repeat(31) }), 'record'),
    ).toThrow(new MalformedPayloadError(`record.grants.${grantId}.scopeSalt`));
    expect(() =>
      decodeRecord(withGrant({ scopeSalt: '0G'.repeat(32) }), 'record'),
    ).toThrow(new MalformedPayloadError(`record.grants.${grantId}.scopeSalt`));
    expect(() =>
      decodeRecord(withGrant({ granteePublicKey: 'cd'.repeat(33) }), 'record'),
    ).toThrow(
      new MalformedPayloadError(`record.grants.${grantId}.granteePublicKey`),
    );
    expect(() =>
      decodeRecord(withGrant({ granteePublicKey: 'CD'.repeat(32) }), 'record'),
    ).toThrow(
      new MalformedPayloadError(`record.grants.${grantId}.granteePublicKey`),
    );
    expect(() =>
      decodeRecord(withGrant({ origin: undefined }), 'record'),
    ).toThrow(new MalformedPayloadError(`record.grants.${grantId}.origin`));
  });

  it('carries the grantee scheme a stored grant kept, with its key in the form the scheme takes', () => {
    const grant = {
      slot: 3,
      scopeSalt: '07'.repeat(32),
      granteePublicKey: 'cd'.repeat(32),
      origin: 'lace.io',
    };
    const grantId = 'ab'.repeat(32);
    const keyField = `record.grants.${grantId}.granteePublicKey`;
    const withGrantee = (granteeScheme: unknown, granteePublicKey: string) => ({
      ...record,
      grants: { [grantId]: { ...grant, granteeScheme, granteePublicKey } },
    });

    for (const granted of [
      withGrantee('jubjub-schnorr', 'cd'.repeat(32)),
      withGrantee('secp256k1-ecdsa', `02${'cd'.repeat(32)}`),
      withGrantee('secp256k1-ecdsa', `03${'cd'.repeat(32)}`),
    ]) {
      expect(decodeRecord(granted, 'record')).toEqual(granted);
    }
    expect(
      decodeRecord({ ...record, grants: { [grantId]: grant } }, 'record')
        ?.grants?.[grantId],
    ).not.toHaveProperty('granteeScheme');
    expect(() =>
      decodeRecord(withGrantee('secp256k1-ecdsa', 'cd'.repeat(32)), 'record'),
    ).toThrow(new MalformedPayloadError(keyField));
    expect(() =>
      decodeRecord(
        withGrantee('secp256k1-ecdsa', `04${'cd'.repeat(32)}`),
        'record',
      ),
    ).toThrow(new MalformedPayloadError(keyField));
    expect(() =>
      decodeRecord(
        withGrantee('jubjub-schnorr', `02${'cd'.repeat(32)}`),
        'record',
      ),
    ).toThrow(new MalformedPayloadError(keyField));
    expect(() =>
      decodeRecord(withGrantee('p256-ecdsa', 'cd'.repeat(32)), 'record'),
    ).toThrow(
      new MalformedPayloadError(`record.grants.${grantId}.granteeScheme`),
    );
  });

  it('carries the viewing capability a stored read grant keeps, only when present', () => {
    const grant = {
      slot: 3,
      scopeSalt: '07'.repeat(32),
      granteePublicKey: 'cd'.repeat(32),
      origin: 'lace.io',
    };
    const grantId = 'ab'.repeat(32);
    const withView = (view: Record<string, unknown>) => ({
      ...record,
      grants: { [grantId]: { ...grant, view } },
    });
    const viewField = `record.grants.${grantId}.view`;
    const unsealed = withView({ readPublicKey: 'ef'.repeat(32) });
    const sealed = withView({
      readPublicKey: 'ef'.repeat(32),
      seal: '01'.repeat(94),
      sealedEncKey: '02'.repeat(32),
    });

    expect(decodeRecord(unsealed, 'record')).toEqual(unsealed);
    expect(decodeRecord(sealed, 'record')).toEqual(sealed);
    expect(() => decodeRecord(withView({}), 'record')).toThrow(
      new MalformedPayloadError(`${viewField}.readPublicKey`),
    );
    expect(() =>
      decodeRecord(
        withView({ readPublicKey: 'ef'.repeat(32), seal: '01'.repeat(93) }),
        'record',
      ),
    ).toThrow(new MalformedPayloadError(`${viewField}.seal`));
    expect(() =>
      decodeRecord(
        withView({ readPublicKey: 'ef'.repeat(32), sealedEncKey: '02' }),
        'record',
      ),
    ).toThrow(new MalformedPayloadError(`${viewField}.sealedEncKey`));
  });

  it('carries the object fields a stored grant kept, only when present', () => {
    const grant = {
      slot: 3,
      scopeSalt: '07'.repeat(32),
      granteePublicKey: 'cd'.repeat(32),
      origin: 'lace.io',
    };
    const object = {
      color: '00'.repeat(32),
      recipient: { kind: 'user-address', value: 'ef'.repeat(32) },
      maxCoinValue: '300',
    };
    const grantId = 'ab'.repeat(32);
    const withObject = (overrides: Partial<typeof object>) => ({
      ...record,
      grants: { [grantId]: { ...grant, object: { ...object, ...overrides } } },
    });
    const objectField = `record.grants.${grantId}.object`;

    expect(decodeRecord(withObject({}), 'record')).toEqual(withObject({}));
    expect(
      decodeRecord({ ...record, grants: { [grantId]: grant } }, 'record'),
    ).toEqual({ ...record, grants: { [grantId]: grant } });
    expect(() =>
      decodeRecord(withObject({ color: 'ZZ'.repeat(32) }), 'record'),
    ).toThrow(new MalformedPayloadError(`${objectField}.color`));
    expect(() =>
      decodeRecord(
        withObject({ recipient: { kind: 'dao', value: 'ef'.repeat(32) } }),
        'record',
      ),
    ).toThrow(new MalformedPayloadError(`${objectField}.recipient.kind`));
    expect(() =>
      decodeRecord(withObject({ maxCoinValue: '-1' }), 'record'),
    ).toThrow(new MalformedPayloadError(`${objectField}.maxCoinValue`));
    expect(() =>
      decodeRecord(
        withObject({ maxCoinValue: (2n ** 128n).toString() }),
        'record',
      ),
    ).toThrow(new MalformedPayloadError(`${objectField}.maxCoinValue`));
    expect(() =>
      decodeRecord(
        withObject({ recipient: { kind: 'user-address', value: 'ef' } }),
        'record',
      ),
    ).toThrow(new MalformedPayloadError(`${objectField}.recipient.value`));
    expect(() =>
      decodeRecord(
        { ...record, grants: { [grantId]: { ...grant, object: 'kept' } } },
        'record',
      ),
    ).toThrow(new MalformedPayloadError(objectField));
  });

  it('carries the pending deployment of an unfinished creation', () => {
    const deployment = {
      operations: ['deposit_unshielded', 'deposit_shielded'],
      lockAccount: true,
      verifierKeysDigest: 'f0'.repeat(32),
      saltHex: '07'.repeat(32),
      authorityKey: { tag: 'schnorr', value: 'ab'.repeat(32) },
      handoverAuthority: { tag: 'schnorr', value: 'cd'.repeat(32) },
      keyEntries: ['d1'.repeat(192), 'd2'.repeat(192)],
    };
    const pending = { ...record, deployment };

    expect(decodeRecord(pending, 'record')).toEqual(pending);
    expect(decodeRecord(record, 'record')).not.toHaveProperty('deployment');
    expect(() =>
      decodeRecord({ ...record, deployment: 'later' }, 'record'),
    ).toThrow(new MalformedPayloadError('record.deployment'));
    expect(() =>
      decodeRecord(
        { ...record, deployment: { ...deployment, operations: [1] } },
        'record',
      ),
    ).toThrow(new MalformedPayloadError('record.deployment.operations[0]'));
    expect(() =>
      decodeRecord(
        { ...record, deployment: { ...deployment, lockAccount: 'true' } },
        'record',
      ),
    ).toThrow(new MalformedPayloadError('record.deployment.lockAccount'));
    expect(() =>
      decodeRecord(
        { ...record, deployment: { ...deployment, saltHex: undefined } },
        'record',
      ),
    ).toThrow(new MalformedPayloadError('record.deployment.saltHex'));
    expect(() =>
      decodeRecord(
        {
          ...record,
          deployment: { ...deployment, verifierKeysDigest: undefined },
        },
        'record',
      ),
    ).toThrow(
      new MalformedPayloadError('record.deployment.verifierKeysDigest'),
    );
    expect(() =>
      decodeRecord(
        {
          ...record,
          deployment: {
            ...deployment,
            authorityKey: { tag: 'rsa', value: 'ab' },
          },
        },
        'record',
      ),
    ).toThrow(new MalformedPayloadError('record.deployment.authorityKey.tag'));
    expect(() =>
      decodeRecord(
        { ...record, deployment: { ...deployment, authorityKey: 'ab' } },
        'record',
      ),
    ).toThrow(new MalformedPayloadError('record.deployment.authorityKey'));
    expect(() =>
      decodeRecord(
        {
          ...record,
          deployment: { ...deployment, handoverAuthority: undefined },
        },
        'record',
      ),
    ).toThrow(new MalformedPayloadError('record.deployment.handoverAuthority'));
    expect(() =>
      decodeRecord(
        {
          ...record,
          deployment: {
            ...deployment,
            handoverAuthority: { tag: 'rsa', value: 'cd' },
          },
        },
        'record',
      ),
    ).toThrow(
      new MalformedPayloadError('record.deployment.handoverAuthority.tag'),
    );
    expect(() =>
      decodeRecord(
        {
          ...record,
          deployment: {
            ...deployment,
            handoverAuthority: { tag: 'schnorr', value: 'not hex' },
          },
        },
        'record',
      ),
    ).toThrow(
      new MalformedPayloadError('record.deployment.handoverAuthority.value'),
    );
    expect(() =>
      decodeRecord(
        { ...record, deployment: { ...deployment, keyEntries: undefined } },
        'record',
      ),
    ).toThrow(new MalformedPayloadError('record.deployment.keyEntries'));
    expect(() =>
      decodeRecord(
        {
          ...record,
          deployment: { ...deployment, keyEntries: ['d1'.repeat(191)] },
        },
        'record',
      ),
    ).toThrow(new MalformedPayloadError('record.deployment.keyEntries[0]'));
  });

  it('reads no roster of devices from a record', () => {
    expect(
      decodeRecord(
        {
          ...record,
          readers: [
            {
              readerPublicKey: '12'.repeat(32),
              devicePublicKey: '34'.repeat(32),
            },
          ],
        },
        'record',
      ),
    ).not.toHaveProperty('readers');
  });

  it('reads the grant descriptor fields through their value objects', () => {
    const hex = 'ab'.repeat(32);

    expect(decodeGrantId(hex, 'grantId')).toBe(hex);
    expect(decodeScopeSalt(hex, 'scopeSalt')).toBe(hex);
    expect(decodeAccount(hex, 'account')).toBe(hex);
    expect(decodeSlot(255, 'slot')).toBe(255);
    for (const malformed of ['AB'.repeat(32), 'ab'.repeat(31), 7, undefined]) {
      expect(() => decodeGrantId(malformed, 'grantId')).toThrow(
        new MalformedPayloadError('grantId'),
      );
      expect(() => decodeScopeSalt(malformed, 'scopeSalt')).toThrow(
        new MalformedPayloadError('scopeSalt'),
      );
      expect(() => decodeAccount(malformed, 'account')).toThrow(
        new MalformedPayloadError('account'),
      );
    }
    for (const malformed of ['0', 256, -1, 1.5, undefined]) {
      expect(() => decodeSlot(malformed, 'slot')).toThrow(
        new MalformedPayloadError('slot'),
      );
    }
  });

  describe('decodeSealedEntries', () => {
    it('reads the re-encrypted entries, null kept in place', () => {
      expect(decodeSealedEntries(['05'.repeat(192), null], 'entries')).toEqual([
        new Uint8Array(192).fill(5),
        null,
      ]);
    });

    it('refuses an entry of another length and a list that is not one', () => {
      expect(() => decodeSealedEntries(['05'.repeat(191)], 'entries')).toThrow(
        new MalformedPayloadError('entries[0]'),
      );
      expect(() => decodeSealedEntries('05'.repeat(192), 'entries')).toThrow(
        new MalformedPayloadError('entries'),
      );
    });
  });

  describe('decodeGrantScope', () => {
    const fullScope: GrantScopeInput = {
      ...spendScope,
      recipient: { kind: 'user-address', value: 'cd'.repeat(32) },
      expiresAt: 1_900_000_000,
      read: true,
      caller: 'ef'.repeat(32),
      rpId: 'dapp.example',
    };

    it('reads a scope in the shape the module types it, optional fields only when present', () => {
      expect(decodeGrantScope(spendScope, 'scope')).toEqual(spendScope);
      expect(decodeGrantScope(k256SpendScope, 'scope')).toEqual(k256SpendScope);
      expect(decodeGrantScope(fullScope, 'scope')).toEqual(fullScope);
      const withReadKey = { ...fullScope, readPublicKey: 'ab'.repeat(32) };
      expect(decodeGrantScope(withReadKey, 'scope')).toEqual(withReadKey);
      expect(() =>
        decodeGrantScope(
          { ...fullScope, readPublicKey: 'AB'.repeat(32) },
          'scope',
        ),
      ).toThrow(new MalformedPayloadError('scope.readPublicKey'));
    });

    it.each([
      ['a scope that is not an object', null, 'scope'],
      ['no grantee', { grantee: undefined }, 'scope.grantee'],
      [
        'a grantee of another scheme',
        { grantee: { scheme: 'ed25519', publicKey: 'ab'.repeat(32) } },
        'scope.grantee.scheme',
      ],
      [
        'a grantee key in uppercase',
        { grantee: { scheme: 'jubjub-schnorr', publicKey: 'AB'.repeat(32) } },
        'scope.grantee.publicKey',
      ],
      [
        'a jubjub grantee key of 33 bytes',
        {
          grantee: {
            scheme: 'jubjub-schnorr',
            publicKey: K256_GRANTEE_PUBLIC_KEY,
          },
        },
        'scope.grantee.publicKey',
      ],
      [
        'a secp256k1 grantee key of 32 bytes',
        { grantee: { scheme: 'secp256k1-ecdsa', publicKey: 'ab'.repeat(32) } },
        'scope.grantee.publicKey',
      ],
      [
        'an uncompressed secp256k1 grantee key',
        {
          grantee: {
            scheme: 'secp256k1-ecdsa',
            publicKey: `04${'ab'.repeat(64)}`,
          },
        },
        'scope.grantee.publicKey',
      ],
      [
        'a secp256k1 grantee key in uppercase',
        {
          grantee: {
            scheme: 'secp256k1-ecdsa',
            publicKey: K256_GRANTEE_PUBLIC_KEY.toUpperCase(),
          },
        },
        'scope.grantee.publicKey',
      ],
      [
        'a P-256 grantee',
        {
          grantee: { scheme: 'p256-ecdsa', publicKey: K256_GRANTEE_PUBLIC_KEY },
        },
        'scope.grantee.scheme',
      ],
      [
        'operations that are not a list',
        { operations: 'all' },
        'scope.operations',
      ],
      ['an unknown operation', { operations: ['burn'] }, 'scope.operations[0]'],
      ['a short colour', { color: '00'.repeat(31) }, 'scope.color'],
      ['a recipient that is a word', { recipient: 'any' }, 'scope.recipient'],
      [
        'an unknown recipient kind',
        { recipient: { kind: 'dao', value: 'cd'.repeat(32) } },
        'scope.recipient.kind',
      ],
      [
        'a pinned recipient without a value',
        { recipient: { kind: 'coin-public-key' } },
        'scope.recipient.value',
      ],
      ['a numeric coin bound', { maxCoinValue: 300 }, 'scope.maxCoinValue'],
      ['a negative per-call cap', { perCallCap: '-1' }, 'scope.perCallCap'],
      ['an empty cap', { cap: '' }, 'scope.cap'],
      ['a cap above 128 bits', { cap: (2n ** 128n).toString() }, 'scope.cap'],
      ['no expiry', { expiresAt: undefined }, 'scope.expiresAt'],
      ['a fractional expiry', { expiresAt: 1.5 }, 'scope.expiresAt'],
      ['a negative expiry', { expiresAt: -1 }, 'scope.expiresAt'],
      [
        'a rolling window',
        { window: { lengthSeconds: 86_400, cap: '200' } },
        'scope.window',
      ],
      ['a window key, even unset', { window: undefined }, 'scope.window'],
      ['a read flag as a word', { read: 'yes' }, 'scope.read'],
      ['a short caller', { caller: 'ef'.repeat(31) }, 'scope.caller'],
      ['a numeric rp id', { rpId: 7 }, 'scope.rpId'],
    ])('refuses %s, naming the field', (_, overrides, field) => {
      const scope = overrides === null ? null : { ...spendScope, ...overrides };

      expect(() => decodeGrantScope(scope, 'scope')).toThrow(
        new MalformedPayloadError(field),
      );
    });
  });

  it('reports a malformed field under its own code', () => {
    const error = new MalformedPayloadError('epoch');

    expect(error.code).toBe('malformed-payload');
    expect(error.name).toBe('MalformedPayloadError');
  });
});

describe('inbox codec', () => {
  const coin = {
    nonce: new Uint8Array(32).fill(1),
    color: new Uint8Array(32).fill(2),
    value: 2n ** 128n - 1n,
  };
  const encoded = {
    nonce: '01'.repeat(32),
    color: '02'.repeat(32),
    value: (2n ** 128n - 1n).toString(),
  };

  it('reads inbox entries as 192-byte hex each, naming the failing one', () => {
    const entry = Uint8Array.from({ length: 192 }, (_, index) => index);

    expect(decodeInboxEntries([encodeBytes(entry)], 'entries')).toEqual([
      entry,
    ]);
    expect(() => decodeInboxEntries('aa', 'entries')).toThrow(
      new MalformedPayloadError('entries'),
    );
    expect(() =>
      decodeInboxEntries([encodeBytes(entry), 'ab'.repeat(191)], 'entries'),
    ).toThrow(new MalformedPayloadError('entries[1]'));
  });

  it('carries an opened coin with its bytes hex and its value decimal, and null as null', () => {
    const opened: OpenedInboxEntry = { kind: 'coin', coin };

    expect(encodeOpenedEntry(opened)).toEqual({ kind: 'coin', coin: encoded });
    expect(encodeOpenedEntry(null)).toBeNull();
    expect(
      decodeOpenedEntries([encodeOpenedEntry(opened), null], 'opened'),
    ).toEqual([opened, null]);
  });

  it('carries an opened device and every part of a grant record as they open', () => {
    const opened: OpenedInboxEntry[] = [
      {
        kind: 'device',
        device: {
          readerPublicKey: '12'.repeat(32),
          devicePublicKey: '34'.repeat(32),
        },
      },
      {
        kind: 'grant',
        record: {
          part: 'grant',
          grantId: GrantId('ab'.repeat(32)),
          slot: GrantSlot(2),
          scopeSalt: GrantScopeSalt('cd'.repeat(32)),
          granteeScheme: 'jubjub-schnorr',
          granteePublicKey: 'ef'.repeat(32),
          readPublicKey: '56'.repeat(32),
        },
      },
      {
        kind: 'grant',
        record: {
          part: 'grant',
          grantId: GrantId('ba'.repeat(32)),
          slot: GrantSlot(3),
          scopeSalt: GrantScopeSalt('dc'.repeat(32)),
          granteeScheme: 'secp256k1-ecdsa',
          granteePublicKey: K256_GRANTEE_PUBLIC_KEY,
        },
      },
      {
        kind: 'grant',
        record: {
          part: 'object',
          grantId: GrantId('ab'.repeat(32)),
          object: {
            color: '00'.repeat(32),
            recipient: { kind: 'any' },
            maxCoinValue: '9',
          },
        },
      },
      {
        kind: 'grant',
        record: {
          part: 'view',
          grantId: GrantId('ab'.repeat(32)),
          encKeyPrefix: 'a1b2c3',
          seal: '07'.repeat(94),
        },
      },
    ];

    expect(
      decodeOpenedEntries(
        opened.map(entry => encodeOpenedEntry(entry)),
        'opened',
      ),
    ).toEqual(opened);
  });

  it('reads an opened grant part that carries no grantee scheme as a jubjub grant', () => {
    const part = {
      part: 'grant',
      grantId: 'ab'.repeat(32),
      slot: 2,
      scopeSalt: 'cd'.repeat(32),
      granteePublicKey: 'ef'.repeat(32),
    };

    expect(
      decodeOpenedEntries([{ kind: 'grant', record: part }], 'opened'),
    ).toEqual([
      {
        kind: 'grant',
        record: {
          ...part,
          grantId: GrantId(part.grantId),
          slot: GrantSlot(part.slot),
          scopeSalt: GrantScopeSalt(part.scopeSalt),
          granteeScheme: 'jubjub-schnorr',
        },
      },
    ]);
    expect(() =>
      decodeOpenedEntries(
        [
          {
            kind: 'grant',
            record: { ...part, granteePublicKey: K256_GRANTEE_PUBLIC_KEY },
          },
        ],
        'opened',
      ),
    ).toThrow(new MalformedPayloadError('opened[0].record.granteePublicKey'));
  });

  it.each<[string, unknown]>([
    ['opened', { kind: 'coin', coin: encoded }],
    ['opened[0]', ['coin']],
    ['opened[0].kind', [{ kind: 'secret', secret: '01'.repeat(32) }]],
    [
      'opened[0].coin.nonce',
      [{ kind: 'coin', coin: { ...encoded, nonce: '01'.repeat(31) } }],
    ],
    [
      'opened[1].coin.color',
      [
        { kind: 'coin', coin: encoded },
        { kind: 'coin', coin: { ...encoded, color: 'zz'.repeat(32) } },
      ],
    ],
    [
      'opened[0].coin.value',
      [{ kind: 'coin', coin: { ...encoded, value: '-1' } }],
    ],
    [
      'opened[0].coin.value',
      [{ kind: 'coin', coin: { ...encoded, value: (2n ** 128n).toString() } }],
    ],
    [
      'opened[0].device.devicePublicKey',
      [{ kind: 'device', device: { readerPublicKey: '12'.repeat(32) } }],
    ],
    [
      'opened[0].record.part',
      [{ kind: 'grant', record: { part: 'secret', grantId: 'ab'.repeat(32) } }],
    ],
    [
      'opened[0].record.grantId',
      [{ kind: 'grant', record: { part: 'view', grantId: 'ab' } }],
    ],
    [
      'opened[0].record.encKeyPrefix',
      [
        {
          kind: 'grant',
          record: {
            part: 'view',
            grantId: 'ab'.repeat(32),
            encKeyPrefix: 'a1b2c3d4',
            seal: '07'.repeat(94),
          },
        },
      ],
    ],
    [
      'opened[0].record.seal',
      [
        {
          kind: 'grant',
          record: {
            part: 'view',
            grantId: 'ab'.repeat(32),
            encKeyPrefix: 'a1b2c3',
            seal: '07'.repeat(93),
          },
        },
      ],
    ],
    [
      'opened[0].record.object.recipient.kind',
      [
        {
          kind: 'grant',
          record: {
            part: 'object',
            grantId: 'ab'.repeat(32),
            object: {
              color: '00'.repeat(32),
              recipient: { kind: 'dao' },
              maxCoinValue: '9',
            },
          },
        },
      ],
    ],
  ])('refuses opened entries whose %s cannot be read', (field, value) => {
    expect(() => decodeOpenedEntries(value, 'opened')).toThrow(
      new MalformedPayloadError(field),
    );
  });
});

describe('account key codec', () => {
  const envelope = new Uint8Array(192).fill(0xd1);
  const registration = new Uint8Array(192).fill(0xd2);
  const encKey = new Uint8Array(32).fill(7);
  const account = AccAddress('ac'.repeat(32));

  it('carries a keyring as hex and reads it back', () => {
    const keyring = { account, encKey, envelopes: [envelope] };

    expect(encodeKeyring(keyring)).toEqual({
      account,
      encKey: '07'.repeat(32),
      envelopes: ['d1'.repeat(192)],
    });
    expect(decodeKeyring(encodeKeyring(keyring), 'keyring')).toEqual(keyring);
  });

  it('reads a keyring of exactly the envelope bound and refuses one past it', () => {
    const at = {
      account,
      encKey: '07'.repeat(32),
      envelopes: Array.from({ length: MAX_INBOX_ENTRIES_PER_REQUEST }, () =>
        'd1'.repeat(192),
      ),
    };

    expect(decodeKeyring(at, 'keyring').envelopes).toHaveLength(
      MAX_INBOX_ENTRIES_PER_REQUEST,
    );
    expect(() =>
      decodeKeyring(
        { ...at, envelopes: [...at.envelopes, 'd1'.repeat(192)] },
        'keyring',
      ),
    ).toThrow(new MalformedPayloadError('keyring.envelopes'));
  });

  it.each<[string, unknown]>([
    ['keyring', 'keys'],
    ['keyring.encKey', { account, encKey: '07'.repeat(31), envelopes: [] }],
    ['keyring.envelopes', { account, encKey: '07'.repeat(32) }],
    [
      'keyring.envelopes[0]',
      { account, encKey: '07'.repeat(32), envelopes: ['d1'] },
    ],
    ['keyring.account', { encKey: '07'.repeat(32), envelopes: [] }],
    [
      'keyring.account',
      { account: 'AC'.repeat(32), encKey: '07'.repeat(32), envelopes: [] },
    ],
  ])('refuses a keyring whose %s cannot be read', (field, value) => {
    expect(() => decodeKeyring(value, 'keyring')).toThrow(
      new MalformedPayloadError(field),
    );
  });

  it('carries a live reader with its epoch and counter decimal, and refuses one malformed', () => {
    const reader = {
      readerPublicKey: '12'.repeat(32),
      devicePublicKey: '34'.repeat(32),
      epoch: 0n,
      counter: 7n,
    };

    expect(encodeLiveReader(reader)).toEqual({
      readerPublicKey: '12'.repeat(32),
      devicePublicKey: '34'.repeat(32),
      epoch: '0',
      counter: '7',
    });
    expect(decodeLiveReader(encodeLiveReader(reader), 'reader')).toEqual(
      reader,
    );
    expect(() =>
      decodeLiveReader({ ...encodeLiveReader(reader), counter: -1 }, 'reader'),
    ).toThrow(new MalformedPayloadError('reader.counter'));
    expect(() =>
      decodeLiveReader({ ...encodeLiveReader(reader), epoch: '1.5' }, 'reader'),
    ).toThrow(new MalformedPayloadError('reader.epoch'));
    expect(() =>
      decodeLiveReader(
        { ...encodeLiveReader(reader), devicePublicKey: '34' },
        'reader',
      ),
    ).toThrow(new MalformedPayloadError('reader.devicePublicKey'));
    expect(() => decodeLiveReader('reader', 'reader')).toThrow(
      new MalformedPayloadError('reader'),
    );
  });

  it('carries a removed device with its epoch and counter decimal, and refuses one malformed', () => {
    const removed = {
      devicePublicKey: '34'.repeat(32),
      epoch: 0n,
      counter: 3n,
    };

    expect(encodeRemovedDevice(removed)).toEqual({
      devicePublicKey: '34'.repeat(32),
      epoch: '0',
      counter: '3',
    });
    expect(
      decodeRemovedDevice(encodeRemovedDevice(removed), 'removed'),
    ).toEqual(removed);
    expect(() =>
      decodeRemovedDevice(
        { ...encodeRemovedDevice(removed), devicePublicKey: '3G'.repeat(32) },
        'removed',
      ),
    ).toThrow(new MalformedPayloadError('removed.devicePublicKey'));
    expect(() =>
      decodeRemovedDevice(
        { ...encodeRemovedDevice(removed), counter: 3 },
        'removed',
      ),
    ).toThrow(new MalformedPayloadError('removed.counter'));
    expect(() =>
      decodeRemovedDevice(
        { ...encodeRemovedDevice(removed), epoch: undefined },
        'removed',
      ),
    ).toThrow(new MalformedPayloadError('removed.epoch'));
    expect(() => decodeRemovedDevice(null, 'removed')).toThrow(
      new MalformedPayloadError('removed'),
    );
  });

  it('carries fresh account keys as hex with their authority and reads them back', () => {
    const keys = {
      encKey,
      envelopes: [envelope],
      registrations: [registration],
      authority: { tag: 'schnorr' as const, value: 'a7'.repeat(32) },
    };

    expect(decodeAccountKeys(encodeAccountKeys(keys), 'keys')).toEqual(keys);
    expect(() =>
      decodeAccountKeys(
        { ...encodeAccountKeys(keys), registrations: undefined },
        'keys',
      ),
    ).toThrow(new MalformedPayloadError('keys.registrations'));
    expect(() =>
      decodeAccountKeys({ ...encodeAccountKeys(keys), encKey: '07' }, 'keys'),
    ).toThrow(new MalformedPayloadError('keys.encKey'));
    expect(() =>
      decodeAccountKeys(
        {
          ...encodeAccountKeys(keys),
          authority: { tag: 'ed25519', value: 'a7'.repeat(32) },
        },
        'keys',
      ),
    ).toThrow(new MalformedPayloadError('keys.authority.tag'));
    expect(() =>
      decodeAccountKeys(
        {
          ...encodeAccountKeys(keys),
          authority: { tag: 'schnorr', value: 'A7'.repeat(32) },
        },
        'keys',
      ),
    ).toThrow(new MalformedPayloadError('keys.authority.value'));
    expect(() =>
      decodeAccountKeys(
        {
          ...encodeAccountKeys(keys),
          authority: { tag: 'schnorr', value: '' },
        },
        'keys',
      ),
    ).toThrow(new MalformedPayloadError('keys.authority.value'));
  });

  it('reads a device delivery and a view delivery at their lengths only', () => {
    expect(
      decodeDeviceDelivery(
        { envelope: 'd1'.repeat(192), registration: 'd2'.repeat(192) },
        'delivery',
      ),
    ).toEqual({ envelope, registration });
    expect(() =>
      decodeDeviceDelivery(
        { envelope: 'd1'.repeat(192), registration: 'd2'.repeat(94) },
        'delivery',
      ),
    ).toThrow(new MalformedPayloadError('delivery.registration'));
    expect(
      decodeViewDelivery(
        { seal: '07'.repeat(94), entry: 'd3'.repeat(192) },
        'view',
      ),
    ).toEqual({
      seal: new Uint8Array(94).fill(7),
      entry: new Uint8Array(192).fill(0xd3),
    });
    expect(() =>
      decodeViewDelivery({ seal: '07'.repeat(192), entry: 'd3' }, 'view'),
    ).toThrow(new MalformedPayloadError('view.seal'));
  });

  it('reads a device as its reader and device keys in lowercase hex', () => {
    const reader = {
      readerPublicKey: '12'.repeat(32),
      devicePublicKey: '34'.repeat(32),
    };

    expect(decodeDeviceReader(reader, 'reader')).toEqual(reader);
    expect(() => decodeDeviceReader('reader', 'reader')).toThrow(
      new MalformedPayloadError('reader'),
    );
    expect(() =>
      decodeDeviceReader(
        { ...reader, readerPublicKey: 'AB'.repeat(32) },
        'reader',
      ),
    ).toThrow(new MalformedPayloadError('reader.readerPublicKey'));
  });

  it('reads a grant bookkeeping in the shape the flows write it', () => {
    const grant: GrantBookkeeping = {
      grantId: GrantId('ab'.repeat(32)),
      slot: GrantSlot(1),
      scopeSalt: GrantScopeSalt('cd'.repeat(32)),
      granteeScheme: 'jubjub-schnorr',
      granteePublicKey: 'ef'.repeat(32),
      readPublicKey: '12'.repeat(32),
      object: {
        color: '00'.repeat(32),
        recipient: { kind: 'contract-address', value: '34'.repeat(32) },
        maxCoinValue: '50',
      },
    };
    const { readPublicKey: _readPublicKey, ...spendOnly } = grant;

    expect(decodeGrantBookkeeping(grant, 'grant')).toEqual(grant);
    expect(decodeGrantBookkeeping(spendOnly, 'grant')).toEqual(spendOnly);
    expect(() =>
      decodeGrantBookkeeping({ ...grant, object: undefined }, 'grant'),
    ).toThrow(new MalformedPayloadError('grant.object'));
    expect(() =>
      decodeGrantBookkeeping({ ...grant, slot: 256 }, 'grant'),
    ).toThrow(new MalformedPayloadError('grant.slot'));
    expect(() =>
      decodeGrantBookkeeping({ ...grant, readPublicKey: '12' }, 'grant'),
    ).toThrow(new MalformedPayloadError('grant.readPublicKey'));
  });

  it('reads a grant bookkeeping of either grantee scheme, its key in the form the scheme takes', () => {
    const grant = {
      grantId: GrantId('ab'.repeat(32)),
      slot: GrantSlot(1),
      scopeSalt: GrantScopeSalt('cd'.repeat(32)),
      granteePublicKey: 'ef'.repeat(32),
      object: {
        color: '00'.repeat(32),
        recipient: { kind: 'any' },
        maxCoinValue: '50',
      },
    };
    const k256Grant = {
      ...grant,
      granteeScheme: 'secp256k1-ecdsa',
      granteePublicKey: K256_GRANTEE_PUBLIC_KEY,
    };
    const keyField = new MalformedPayloadError('grant.granteePublicKey');

    expect(decodeGrantBookkeeping(k256Grant, 'grant')).toEqual(k256Grant);
    expect(() =>
      decodeGrantBookkeeping(
        { ...grant, granteeScheme: 'p256-ecdsa' },
        'grant',
      ),
    ).toThrow(new MalformedPayloadError('grant.granteeScheme'));
    expect(() =>
      decodeGrantBookkeeping(
        { ...grant, granteeScheme: 'secp256k1-ecdsa' },
        'grant',
      ),
    ).toThrow(keyField);
    expect(() =>
      decodeGrantBookkeeping(
        { ...k256Grant, granteeScheme: 'jubjub-schnorr' },
        'grant',
      ),
    ).toThrow(keyField);
    expect(() =>
      decodeGrantBookkeeping(
        { ...k256Grant, granteePublicKey: `04${'ef'.repeat(32)}` },
        'grant',
      ),
    ).toThrow(keyField);
  });

  it('reads a grant bookkeeping that carries no grantee scheme as a jubjub grant', () => {
    const grant = {
      grantId: GrantId('ab'.repeat(32)),
      slot: GrantSlot(1),
      scopeSalt: GrantScopeSalt('cd'.repeat(32)),
      granteePublicKey: 'ef'.repeat(32),
      object: {
        color: '00'.repeat(32),
        recipient: { kind: 'any' },
        maxCoinValue: '50',
      },
    };

    expect(decodeGrantBookkeeping(grant, 'grant')).toEqual({
      ...grant,
      granteeScheme: 'jubjub-schnorr',
    });
    expect(() =>
      decodeGrantBookkeeping(
        { ...grant, granteePublicKey: K256_GRANTEE_PUBLIC_KEY },
        'grant',
      ),
    ).toThrow(new MalformedPayloadError('grant.granteePublicKey'));
  });
});

describe('maintenance codec', () => {
  const authority = { tag: 'schnorr' as const, value: 'a7'.repeat(32) };
  const signature = { tag: 'schnorr' as const, value: '5e'.repeat(64) };

  it('carries a replace and verifier key inserts, each key as hex, and reads them back', () => {
    const replace = { kind: 'replace-authority' as const, authority };
    const inserts = {
      kind: 'insert-verifier-keys' as const,
      inserts: [
        { operation: 'withdraw_unshielded', verifierKey: Uint8Array.of(1, 2) },
      ],
    };

    expect(encodeMaintenanceChanges(inserts)).toEqual({
      kind: 'insert-verifier-keys',
      inserts: [{ operation: 'withdraw_unshielded', verifierKey: '0102' }],
    });
    expect(
      decodeMaintenanceChanges(encodeMaintenanceChanges(replace), 'changes'),
    ).toEqual(replace);
    expect(
      decodeMaintenanceChanges(encodeMaintenanceChanges(inserts), 'changes'),
    ).toEqual(inserts);
  });

  it.each([
    [undefined, 'changes'],
    [{ kind: 'remove-verifier-key', operation: 'x' }, 'changes'],
    [{ kind: 'insert-verifier-keys' }, 'changes'],
    [{ kind: 'insert-verifier-keys', inserts: ['01'] }, 'changes.inserts[0]'],
    [
      {
        kind: 'insert-verifier-keys',
        inserts: [{ operation: 7, verifierKey: '01' }],
      },
      'changes.inserts[0].operation',
    ],
    [
      {
        kind: 'insert-verifier-keys',
        inserts: [{ operation: 'withdraw_unshielded', verifierKey: '' }],
      },
      'changes.inserts[0].verifierKey',
    ],
    [
      {
        kind: 'insert-verifier-keys',
        inserts: [{ operation: 'withdraw_unshielded', verifierKey: 'AB' }],
      },
      'changes.inserts[0].verifierKey',
    ],
    [{ kind: 'replace-authority' }, 'changes.authority'],
    [
      {
        kind: 'replace-authority',
        authority: { tag: 'ed25519', value: 'a7' },
      },
      'changes.authority.tag',
    ],
    [
      {
        kind: 'replace-authority',
        authority: { tag: 'schnorr', value: 'not hex' },
      },
      'changes.authority.value',
    ],
  ])('refuses malformed changes: %j', (changes, field) => {
    expect(() => decodeMaintenanceChanges(changes, 'changes')).toThrow(
      new MalformedPayloadError(field),
    );
  });

  it('refuses more verifier key inserts than the deployed roster has operations', () => {
    const insert = { operation: 'withdraw_unshielded', verifierKey: '01' };
    const changes = {
      kind: 'insert-verifier-keys',
      inserts: Array.from(
        { length: DEPLOYED_OPERATIONS.length + 1 },
        () => insert,
      ),
    };

    expect(() => decodeMaintenanceChanges(changes, 'changes')).toThrow(
      new MalformedPayloadError('changes.inserts'),
    );
    expect(
      decodeMaintenanceChanges(
        { ...changes, inserts: changes.inserts.slice(1) },
        'changes',
      ),
    ).toMatchObject({ kind: 'insert-verifier-keys' });
  });

  it('reads a maintenance key only as a known kind over non-empty lowercase hex', () => {
    expect(decodeMaintenanceKey(authority, 'authority')).toEqual(authority);
    expect(() =>
      decodeMaintenanceKey({ tag: 'schnorr', value: '' }, 'authority'),
    ).toThrow(new MalformedPayloadError('authority.value'));
    expect(() =>
      decodeMaintenanceKey({ tag: 'schnorr', value: 'A7' }, 'authority'),
    ).toThrow(new MalformedPayloadError('authority.value'));
    expect(() => decodeMaintenanceKey('a7', 'authority')).toThrow(
      new MalformedPayloadError('authority'),
    );
  });

  it('carries a signed update, the installed authority only when present, and null as null', () => {
    expect(
      decodeSignedMaintenanceUpdate(
        encodeSignedMaintenanceUpdate({ signature }),
        'signed',
      ),
    ).toEqual({ signature });
    expect(
      decodeSignedMaintenanceUpdate(
        encodeSignedMaintenanceUpdate({ signature, authority }),
        'signed',
      ),
    ).toEqual({ signature, authority });
    expect(decodeSignedMaintenanceUpdate(null, 'signed')).toBeNull();
    expect(() =>
      decodeSignedMaintenanceUpdate({ authority }, 'signed'),
    ).toThrow(new MalformedPayloadError('signed.signature'));
    expect(() =>
      decodeSignedMaintenanceUpdate(
        { signature, authority: { tag: 'schnorr', value: 7 } },
        'signed',
      ),
    ).toThrow(new MalformedPayloadError('signed.authority.value'));
    expect(() => decodeSignedMaintenanceUpdate('5e', 'signed')).toThrow(
      new MalformedPayloadError('signed'),
    );
  });
});
