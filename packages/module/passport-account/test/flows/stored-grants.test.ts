import { GrantId, GrantSlot } from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { describe, expect, it } from 'vitest';

import { JubjubDevice } from '../../src/acc/signer';
import {
  completedRecord,
  retainStoredGrants,
  storedGrantOpenings,
  unsealedStoredReadGrants,
  withRebuiltGrants,
  withSealedViews,
} from '../../src/flows/stored-grants';

import { issuedGrant } from './issued-grant';

import type { StoredGrant, StoredGrants } from '../../src/flows/types';
import type { GrantRecord } from '@lace-contract/passport';

const grantId = GrantId('ab'.repeat(32));
const otherId = GrantId('cd'.repeat(32));
const readPublicKey = '77'.repeat(32);
const grant = (origin = 'lace.io'): StoredGrant => ({
  slot: 1,
  scopeSalt: '07'.repeat(32),
  granteePublicKey: 'ef'.repeat(32),
  origin,
  view: { readPublicKey, seal: '9c'.repeat(94), sealedEncKey: '01'.repeat(32) },
});
const account = { address: 'ac'.repeat(32), bindingVersion: '0.1.0-lace.1' };
const k256Grantee = {
  scheme: 'secp256k1-ecdsa' as const,
  publicKey: HexBytes.fromByteArray(
    secp256k1.Point.BASE.multiply(0x5eed_c0ffeen).toBytes(true),
  ),
};
const object = {
  color: '00'.repeat(32),
  recipient: { kind: 'user-address' as const, value: 'aa'.repeat(32) },
  maxCoinValue: '300',
};
const onChain = (
  id: GrantId,
  { active = true, read = true } = {},
): GrantRecord => ({
  id,
  slot: GrantSlot(1),
  active,
  epoch: 0,
  generation: 0,
  issuedAt: 1,
  scope: {
    operations: [],
    read,
    objectCommit: '00'.repeat(32),
    perCallCap: '0',
    cap: '0',
    expiresAt: null,
    rpCommit: '00'.repeat(32),
    readPkHash: '00'.repeat(32),
    window: null,
    callerCommit: '00'.repeat(32),
  },
  spentWindow: { start: 0, spent: '0' },
});

describe('completedRecord', () => {
  it('keeps the bookkeeping when given, and leaves it out when not', () => {
    expect(
      completedRecord(account, '4', { grants: { [grantId]: grant() } }),
    ).toEqual({
      ...account,
      localUseCounter: '4',
      grants: { [grantId]: grant() },
    });
    expect(completedRecord(account, '4', {})).toEqual({
      ...account,
      localUseCounter: '4',
    });
  });
});

describe('withRebuiltGrants', () => {
  const encKey = '01'.repeat(32);
  const sealedAt = (sealedEncKey: string): StoredGrant => ({
    ...grant('kept.example'),
    view: { readPublicKey, seal: '5d'.repeat(94), sealedEncKey },
  });

  it('adds the rebuilt grants the record lacks and never overwrites one it holds', () => {
    const held: StoredGrants = { [grantId]: grant('kept.example') };

    expect(
      withRebuiltGrants(
        held,
        {
          [grantId]: grant(),
          [otherId]: grant(),
        },
        encKey,
      ),
    ).toEqual({ [grantId]: grant('kept.example'), [otherId]: grant() });
  });

  it('takes the rebuilt view when it holds the live seal and the held one does not, as after a lost record write', () => {
    const held = sealedAt('02'.repeat(32));

    expect(
      withRebuiltGrants({ [grantId]: held }, { [grantId]: grant() }, encKey),
    ).toEqual({ [grantId]: { ...held, view: grant().view } });
  });

  it('keeps the held view when the rebuilt one is not of the live key either', () => {
    const held: StoredGrants = {
      [grantId]: { ...grant(), view: { readPublicKey } },
    };

    expect(
      withRebuiltGrants(held, { [grantId]: sealedAt('02'.repeat(32)) }, encKey),
    ).toEqual(held);
  });

  it('leaves the bookkeeping as it is when nothing is rebuilt', () => {
    const held: StoredGrants = { [grantId]: grant() };

    expect(withRebuiltGrants(held, undefined, encKey)).toBe(held);
    expect(withRebuiltGrants(undefined, undefined, encKey)).toBeUndefined();
  });
});

describe('withSealedViews', () => {
  it('replaces the seal of each sealed grant and keeps only the read key of each unsealed one', () => {
    const stored: StoredGrants = { [grantId]: grant(), [otherId]: grant() };
    const sealed = {
      grantId,
      readPublicKey,
      seal: '5d'.repeat(94),
      sealedEncKey: '02'.repeat(32),
    };

    expect(
      withSealedViews(stored, { sealed: [sealed], unsealed: [otherId] }),
    ).toEqual({
      [grantId]: {
        ...grant(),
        view: {
          readPublicKey,
          seal: sealed.seal,
          sealedEncKey: sealed.sealedEncKey,
        },
      },
      [otherId]: { ...grant(), view: { readPublicKey } },
    });
  });

  it('changes nothing when no grant is stored', () => {
    expect(
      withSealedViews(undefined, { sealed: [], unsealed: [grantId] }),
    ).toBeUndefined();
  });
});

describe('retainStoredGrants', () => {
  it('drops an entry the chain holds under its id when its fields do not open the commitments there', async () => {
    await expect(
      retainStoredGrants(
        { [grantId]: { ...grant(), object } },
        [onChain(grantId)],
        account.address,
      ),
    ).resolves.toBeUndefined();
  });

  it('drops an entry kept without its object fields, and one the chain does not hold', async () => {
    await expect(
      retainStoredGrants(
        { [grantId]: grant(), [otherId]: { ...grant(), object } },
        [onChain(grantId)],
        account.address,
      ),
    ).resolves.toBeUndefined();
  });

  it('keeps nothing when nothing is stored', async () => {
    await expect(
      retainStoredGrants(undefined, [onChain(grantId)], account.address),
    ).resolves.toBeUndefined();
  });

  it('keeps an entry written before the scheme was kept as a jubjub grant', async () => {
    const issued = await issuedGrant({
      address: account.address,
      origin: 'lace.io',
      grantee: new JubjubDevice(23n),
      slot: 1,
    });
    const { granteeScheme: _granteeScheme, ...legacy } = issued.stored;

    await expect(
      retainStoredGrants(
        { [issued.id]: legacy },
        [issued.onChain()],
        account.address,
      ),
    ).resolves.toEqual({ [issued.id]: legacy });
    expect(storedGrantOpenings({ [issued.id]: legacy })).toEqual(
      new Map([[issued.id, issued.opening]]),
    );
  });

  it('keeps a secp256k1 grant under its scheme, and drops it once the scheme it kept is not the one its id derives under', async () => {
    const issued = await issuedGrant({
      address: account.address,
      origin: 'lace.io',
      grantee: k256Grantee,
      slot: 1,
    });
    const { granteeScheme: _granteeScheme, ...withoutScheme } = issued.stored;

    await expect(
      retainStoredGrants(
        { [issued.id]: issued.stored },
        [issued.onChain()],
        account.address,
      ),
    ).resolves.toEqual({ [issued.id]: issued.stored });
    expect(storedGrantOpenings({ [issued.id]: issued.stored })).toEqual(
      new Map([
        [issued.id, { ...issued.opening, granteeScheme: 'secp256k1-ecdsa' }],
      ]),
    );
    await expect(
      retainStoredGrants(
        { [issued.id]: withoutScheme },
        [issued.onChain()],
        account.address,
      ),
    ).resolves.toBeUndefined();
  });
});

describe('unsealedStoredReadGrants', () => {
  const liveKey = '01'.repeat(32);

  it('names the live read grants whose kept seal is not of the live enc_key or is missing', () => {
    const stored: StoredGrants = {
      [grantId]: grant(),
      [otherId]: { ...grant(), view: { readPublicKey } },
    };

    expect(
      unsealedStoredReadGrants(
        stored,
        [onChain(grantId), onChain(otherId)],
        '02'.repeat(32),
      ),
    ).toEqual([grantId, otherId]);
    expect(
      unsealedStoredReadGrants(
        stored,
        [onChain(grantId), onChain(otherId)],
        liveKey,
      ),
    ).toEqual([otherId]);
  });

  it('leaves out revoked grants, grants that do not read and grants issued by another client', () => {
    expect(
      unsealedStoredReadGrants(
        { [grantId]: { ...grant(), view: { readPublicKey } } },
        [onChain(grantId, { active: false }), onChain(otherId)],
        liveKey,
      ),
    ).toEqual([]);
    expect(
      unsealedStoredReadGrants(
        { [grantId]: { ...grant(), view: { readPublicKey } } },
        [onChain(grantId, { read: false })],
        liveKey,
      ),
    ).toEqual([]);
  });
});
