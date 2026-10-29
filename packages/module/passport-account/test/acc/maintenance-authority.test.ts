import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  AccAddress,
  MaintenanceAuthorityMismatchError,
  MaintenanceUpdateRefusedError,
} from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { HexBytes } from '@lace-lib/util';
import * as ledger from '@midnightntwrk/ledger-v9';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  authorityOf,
  signableChanges,
  signMaintenanceUpdate,
} from '../../src/acc/maintenance-authority';
import { verifierKeyInsert } from '../../src/acc/verifier-key-insert';

import type { MaintenanceVerifyingKey } from '@lace-contract/passport';

type MaintenanceLedger = Parameters<typeof authorityOf>[0];

const pins = vi.hoisted(() => ({ expectedVk: {} as Record<string, string> }));

vi.mock('../../src/acc/acc-module', () => pins);

const ACCOUNT = AccAddress('ac'.repeat(32));
const PINNED_OPERATION = 'issue_grant_with_jubjub';
const HEADERLESS_OPERATION = 'revoke_grant_with_jubjub';
const UNPINNED_OPERATION = 'remove_device_with_jubjub';
const RECOVERY_OPERATION = 'recover_submit';
const K256_ARM_OPERATION = 'add_device_with_k256';

/**
 * A verifier key the pinned compiler line emits, for a one-circuit
 * counter contract. It stands in for a pinned Account Custody Contract
 * key: the test pins its digest for {@link PINNED_OPERATION}.
 */
const verifierKey = new Uint8Array(
  await readFile(path.join(__dirname, 'fixtures', 'counter-bump.verifier')),
);
const headerless = verifierKey.slice(8);

pins.expectedVk[PINNED_OPERATION] = HexBytes.fromByteArray(sha256(verifierKey));
pins.expectedVk[RECOVERY_OPERATION] = pins.expectedVk[PINNED_OPERATION];
pins.expectedVk[K256_ARM_OPERATION] = pins.expectedVk[PINNED_OPERATION];
pins.expectedVk[HEADERLESS_OPERATION] = HexBytes.fromByteArray(
  sha256(headerless),
);

const rosterKey = (fill: number): Uint8Array => new Uint8Array(32).fill(fill);

/** The authority secret of a roster key, as HKDF-SHA256 with the cma info derives it. */
const authoritySecret = async (key: Uint8Array): Promise<Uint8Array> => {
  const material = await crypto.subtle.importKey(
    'raw',
    key as Uint8Array<ArrayBuffer>,
    'HKDF',
    false,
    ['deriveBits'],
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(0),
        info: new TextEncoder().encode('lace-passport:cma:v1'),
      },
      material,
      256,
    ),
  );
};

/** Captures every HKDF output the code under test derives. */
const captureDerivedBits = (): ArrayBuffer[] => {
  const deriveBits = crypto.subtle.deriveBits.bind(crypto.subtle);
  const derived: ArrayBuffer[] = [];
  vi.spyOn(crypto.subtle, 'deriveBits').mockImplementation(
    async (...args: Parameters<SubtleCrypto['deriveBits']>) => {
      const bits = await deriveBits(...args);
      derived.push(bits);
      return bits;
    },
  );
  return derived;
};

const isZeroed = (bits: ArrayBuffer): boolean =>
  new Uint8Array(bits).every(byte => byte === 0);

const replaceUpdate = (
  installed: MaintenanceVerifyingKey,
  counter: bigint,
): ledger.MaintenanceUpdate =>
  new ledger.MaintenanceUpdate(
    ACCOUNT,
    [
      new ledger.ReplaceAuthority(
        new ledger.ContractMaintenanceAuthority([installed], 1, counter + 1n),
      ),
    ],
    counter,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('authorityOf', () => {
  it('derives the BIP-340 key of HKDF-SHA256 over the roster key under the cma info', async () => {
    await expect(authorityOf(ledger, rosterKey(1))).resolves.toEqual({
      tag: 'schnorr',
      value: 'b766e93092bb190bd3986b4e432582886a7aaca35eba3a3242b7c43326203355',
    });
    expect(HexBytes.fromByteArray(await authoritySecret(rosterKey(1)))).toBe(
      '430c81232040a9fdae91caac91fc2176959da991ce620060a5323436a2956f63',
    );
  });

  it('derives the same authority from the same roster key and another from another', async () => {
    const first = await authorityOf(ledger, rosterKey(2));

    await expect(authorityOf(ledger, rosterKey(2))).resolves.toEqual(first);
    await expect(authorityOf(ledger, rosterKey(3))).resolves.not.toEqual(first);
  });

  it('zeroes the derived secret before it settles', async () => {
    const derived = captureDerivedBits();

    await authorityOf(ledger, rosterKey(4));

    expect(derived).toHaveLength(1);
    expect(isZeroed(derived[0])).toBe(true);
  });

  it('refuses a derived secret that is not a valid BIP-340 secret key, zeroing it', async () => {
    const derived = captureDerivedBits();
    const refusing = {
      ...ledger,
      signingKeyFromBip340: () => {
        throw new Error('signature error');
      },
    } as MaintenanceLedger;

    await expect(authorityOf(refusing, rosterKey(5))).rejects.toThrow(
      'The maintenance authority secret a roster key derives is not a valid BIP-340 secret key.',
    );
    expect(isZeroed(derived[0])).toBe(true);
  });
});

describe('signableChanges', () => {
  it('passes a replace and an install of pinned verifier keys', async () => {
    const replace = {
      kind: 'replace-authority',
      authority: await authorityOf(ledger, rosterKey(1)),
    } as const;
    const install = {
      kind: 'insert-verifier-keys',
      inserts: [{ operation: PINNED_OPERATION, verifierKey }],
    } as const;

    await expect(signableChanges(replace)).resolves.toEqual(replace);
    await expect(signableChanges(install)).resolves.toEqual(install);
  });

  it('answers a copy the caller no longer owns', async () => {
    const owned = verifierKey.slice();
    const authority = await authorityOf(ledger, rosterKey(1));
    const replace = { kind: 'replace-authority', authority } as const;

    const install = await signableChanges({
      kind: 'insert-verifier-keys',
      inserts: [{ operation: PINNED_OPERATION, verifierKey: owned }],
    });
    const replaced = await signableChanges(replace);
    owned.fill(0);

    expect(install).toEqual({
      kind: 'insert-verifier-keys',
      inserts: [{ operation: PINNED_OPERATION, verifierKey }],
    });
    expect(replaced).toEqual(replace);
    expect(replaced).not.toBe(replace);
    expect(
      replaced.kind === 'replace-authority' && replaced.authority,
    ).not.toBe(authority);
  });

  it.each([
    ['no verifier key at all', [], 'at least one verifier key'],
    [
      'a recovery circuit, though its key is the pinned one',
      [{ operation: RECOVERY_OPERATION, verifierKey }],
      `'${RECOVERY_OPERATION}' is not an operation this module deploys.`,
    ],
    [
      'a k256 device arm circuit, though its key is the pinned one',
      [{ operation: K256_ARM_OPERATION, verifierKey }],
      `'${K256_ARM_OPERATION}' is not an operation this module deploys.`,
    ],
    [
      'an operation without a pin',
      [{ operation: UNPINNED_OPERATION, verifierKey }],
      `No verifier key is pinned for '${UNPINNED_OPERATION}'.`,
    ],
    [
      'a key that is not the pinned one',
      [{ operation: PINNED_OPERATION, verifierKey: verifierKey.slice(1) }],
      `The verifier key of '${PINNED_OPERATION}' is not the pinned one.`,
    ],
    [
      'a pinned key under another header',
      [{ operation: HEADERLESS_OPERATION, verifierKey: headerless }],
      `The verifier key of '${HEADERLESS_OPERATION}' is not a midnight:verifier-key[v7]: key`,
    ],
  ])('refuses an install of %s', async (_case, inserts, message) => {
    const refusal = signableChanges({
      kind: 'insert-verifier-keys',
      inserts,
    });

    await expect(refusal).rejects.toBeInstanceOf(MaintenanceUpdateRefusedError);
    await expect(refusal).rejects.toThrow(message);
  });
});

describe('signMaintenanceUpdate', () => {
  it('signs a replace with the earlier roster key the chain holds and installs the live one', async () => {
    const live = rosterKey(6);
    const earlier = rosterKey(7);
    const onChain = await authorityOf(ledger, earlier);
    const installed = await authorityOf(ledger, live);

    const signed = await signMaintenanceUpdate(ledger, {
      address: ACCOUNT,
      rosterKeys: [live, earlier],
      authority: onChain,
      counter: 4n,
      changes: { kind: 'replace-authority', authority: installed },
    });

    expect(signed.authority).toEqual(installed);
    expect(
      ledger.verifySignature(
        onChain,
        replaceUpdate(installed, 4n).dataToSign,
        signed.signature,
      ),
    ).toBe(true);
    expect(
      ledger.verifySignature(
        installed,
        replaceUpdate(installed, 4n).dataToSign,
        signed.signature,
      ),
    ).toBe(false);
  });

  it('signs an install of pinned verifier keys and reports no new authority', async () => {
    const onChain = await authorityOf(ledger, rosterKey(8));

    const signed = await signMaintenanceUpdate(ledger, {
      address: ACCOUNT,
      rosterKeys: [rosterKey(8)],
      authority: onChain,
      counter: 2n,
      changes: {
        kind: 'insert-verifier-keys',
        inserts: [{ operation: PINNED_OPERATION, verifierKey }],
      },
    });
    const update = new ledger.MaintenanceUpdate(
      ACCOUNT,
      [verifierKeyInsert(ledger, PINNED_OPERATION, verifierKey)],
      2n,
    );

    expect(signed.authority).toBeUndefined();
    expect(
      ledger.verifySignature(onChain, update.dataToSign, signed.signature),
    ).toBe(true);
  });

  it('refuses an on-chain authority no roster key derives', async () => {
    await expect(
      signMaintenanceUpdate(ledger, {
        address: ACCOUNT,
        rosterKeys: [rosterKey(9), rosterKey(10)],
        authority: await authorityOf(ledger, rosterKey(11)),
        counter: 0n,
        changes: {
          kind: 'insert-verifier-keys',
          inserts: [{ operation: PINNED_OPERATION, verifierKey }],
        },
      }),
    ).rejects.toBeInstanceOf(MaintenanceAuthorityMismatchError);
  });

  it('refuses a replace that installs any authority but the live roster key one', async () => {
    const earlier = await authorityOf(ledger, rosterKey(13));

    await expect(
      signMaintenanceUpdate(ledger, {
        address: ACCOUNT,
        rosterKeys: [rosterKey(12), rosterKey(13)],
        authority: earlier,
        counter: 0n,
        changes: { kind: 'replace-authority', authority: earlier },
      }),
    ).rejects.toThrow(
      new MaintenanceUpdateRefusedError(
        'A replace may only install the authority the live roster key derives.',
      ),
    );
  });

  it('zeroes every derived secret, on success and on refusal', async () => {
    const derived = captureDerivedBits();
    const onChain = await authorityOf(ledger, rosterKey(15));

    await signMaintenanceUpdate(ledger, {
      address: ACCOUNT,
      rosterKeys: [rosterKey(14), rosterKey(15)],
      authority: onChain,
      counter: 0n,
      changes: {
        kind: 'replace-authority',
        authority: await authorityOf(ledger, rosterKey(14)),
      },
    });
    await expect(
      signMaintenanceUpdate(ledger, {
        address: ACCOUNT,
        rosterKeys: [rosterKey(14), rosterKey(15)],
        authority: onChain,
        counter: 0n,
        changes: { kind: 'replace-authority', authority: onChain },
      }),
    ).rejects.toBeInstanceOf(MaintenanceUpdateRefusedError);

    expect(derived.length).toBeGreaterThan(0);
    expect(derived.every(bits => isZeroed(bits))).toBe(true);
  });
});
