import { TokenColor } from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';
import { jubjub } from '@noble/curves/misc.js';
import { describe, expect, it } from 'vitest';

import { pureCircuits } from '../../src/acc/acc-module';
import {
  prepareIssueGrant,
  prepareRevokeAllGrants,
  prepareRevokeGrant,
} from '../../src/acc/grants';
import { readGrants } from '../../src/acc/read-grants';
import { JubjubDevice } from '../../src/acc/signer';

import { AccountSim } from './account-sim';

import type { Ledger } from '../../src/acc/acc-module';
import type {
  GrantId,
  GrantScopeInput,
  GrantSlot,
} from '@lace-contract/passport';

const ORIGIN = new Uint8Array(32).fill(0x11);
const RECIPIENT_HEX = 'cd'.repeat(32);
const CALLER_HEX = 'ef'.repeat(32);
const COLOR = TokenColor('ab'.repeat(32));
const EXPIRES_AT = 1_900_000_000;
const ZERO32 = new Uint8Array(32);

/** A grant record as the generated ledger decoder presents it. */
type LedgerGrant = ReturnType<Ledger['grants']['lookup']>;

const grantee = new JubjubDevice(55n);

const spendScope: GrantScopeInput = {
  grantee: {
    scheme: 'jubjub-schnorr',
    publicKey: HexBytes.fromByteArray(
      jubjub.Point.fromAffine(grantee.pk).toBytes(),
    ),
  },
  operations: ['withdraw-unshielded'],
  color: COLOR,
  recipient: { kind: 'user-address', value: RECIPIENT_HEX },
  maxCoinValue: '300',
  perCallCap: '300',
  cap: '450',
  expiresAt: EXPIRES_AT,
  caller: CALLER_HEX,
};

const issue = async (sim: AccountSim, scope: GrantScopeInput = spendScope) => {
  const preparation = prepareIssueGrant({
    contractAddress: sim.address,
    scope,
    originHash: ORIGIN,
    roster: readGrants(sim.ledger()),
  });
  await sim.gated(preparation.call);
  return preparation;
};

describe('readGrants', () => {
  it('reads an empty roster from a fresh account', async () => {
    const sim = await AccountSim.create();

    expect(readGrants(sim.ledger())).toEqual([]);
  });

  it('decodes one grant with its commitments as hex and its plain fields decoded', async () => {
    const sim = await AccountSim.create();
    const { grantId, slot, scopeSalt } = await issue(sim);
    const salt = Uint8Array.from(Buffer.from(scopeSalt, 'hex'));

    const [record] = readGrants(sim.ledger(), new Map([[grantId, slot]]));

    expect(record).toEqual({
      id: grantId,
      slot: 0,
      active: true,
      epoch: 0,
      generation: 0,
      issuedAt: 1,
      scope: {
        operations: ['withdraw-unshielded'],
        read: false,
        objectCommit: HexBytes.fromByteArray(
          pureCircuits.derive_grant_object_commit(
            salt,
            Uint8Array.from(Buffer.from(COLOR, 'hex')),
            1n,
            Uint8Array.from(Buffer.from(RECIPIENT_HEX, 'hex')),
            300n,
          ),
        ),
        perCallCap: '300',
        cap: '450',
        expiresAt: EXPIRES_AT,
        rpCommit: HexBytes.fromByteArray(
          pureCircuits.derive_grant_rp_commit(salt, ZERO32),
        ),
        readPkHash: '00'.repeat(32),
        window: null,
        callerCommit: HexBytes.fromByteArray(
          pureCircuits.derive_grant_caller_commit(salt, {
            is_some: true,
            value: { bytes: Uint8Array.from(Buffer.from(CALLER_HEX, 'hex')) },
          }),
        ),
      },
      spentWindow: { start: 0, spent: '0' },
    });
  });

  it('attaches the opening the caller holds to its grant only', async () => {
    const sim = await AccountSim.create();
    const { grantId, scopeSalt } = await issue(sim);
    const opening = {
      scopeSalt,
      granteeScheme: 'jubjub-schnorr' as const,
      granteePublicKey: 'ab'.repeat(32),
      origin: 'lace.io',
      color: COLOR,
      recipient: { kind: 'user-address' as const, value: RECIPIENT_HEX },
      maxCoinValue: '300',
    };

    const [held] = readGrants(
      sim.ledger(),
      new Map(),
      new Map([[grantId, opening]]),
    );
    const [unheld] = readGrants(sim.ledger());

    expect(held.opening).toEqual(opening);
    expect(unheld).not.toHaveProperty('opening');
  });

  it('reads an expiry of zero as never and an absent caller as the zero commitment', async () => {
    const sim = await AccountSim.create();
    await issue(sim, { ...spendScope, expiresAt: null, caller: undefined });

    const [record] = readGrants(sim.ledger());

    expect(record.scope.expiresAt).toBeNull();
    expect(record.scope.callerCommit).toBe('00'.repeat(32));
  });

  it('reports slot 0 for a grant whose slot the client never learned', async () => {
    const sim = await AccountSim.create();
    await issue(sim);
    const { grantId, slot } = await issue(sim);

    const roster = readGrants(sim.ledger(), new Map([[grantId, slot]]));

    expect(slot).toBe(1);
    expect(roster.map(record => record.slot).sort()).toEqual([0, 1]);
    expect(roster.find(record => record.id === grantId)?.slot).toBe(1);
  });

  it('decodes sixteen grants with distinct ids and slots', async () => {
    const sim = await AccountSim.create();
    const slots = new Map<GrantId, GrantSlot>();
    for (let count = 0; count < 16; count++) {
      const { grantId, slot } = await issue(sim);
      slots.set(grantId, slot);
    }

    const roster = readGrants(sim.ledger(), slots);

    expect(roster).toHaveLength(16);
    expect(new Set(roster.map(record => record.id)).size).toBe(16);
    expect(roster.map(record => record.slot).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 16 }, (_, slot) => slot),
    );
    expect(roster.every(record => record.active)).toBe(true);
  });

  it('marks a revoked grant inactive and keeps it listed', async () => {
    const sim = await AccountSim.create();
    const first = await issue(sim);
    const second = await issue(sim);
    await sim.gated(prepareRevokeGrant(first.grantId));

    const roster = readGrants(sim.ledger());

    expect(roster).toHaveLength(2);
    expect(roster.find(record => record.id === first.grantId)?.active).toBe(
      false,
    );
    expect(roster.find(record => record.id === second.grantId)?.active).toBe(
      true,
    );
  });

  it('reads an empty roster after revoking all', async () => {
    const sim = await AccountSim.create();
    await issue(sim);
    await issue(sim);
    await sim.gated(prepareRevokeAllGrants());

    expect(readGrants(sim.ledger())).toEqual([]);
    expect(sim.ledger().grant_generation).toBe(1n);
  });

  const ledgerGrant = (scope: Partial<LedgerGrant['scope']>): LedgerGrant => ({
    epoch: 0n,
    gen: 0n,
    issued_at: 1n,
    nonce: 0n,
    spent_commit: ZERO32,
    window_start: 0n,
    window_spent: 0n,
    active: true,
    scope: {
      op_withdraw_unshielded: true,
      op_withdraw_shielded: false,
      op_withdraw_shielded_to_contract: false,
      read: false,
      object_commit: ZERO32,
      per_call_cap: 1n,
      cap: 1n,
      expires_at: 0n,
      rp_commit: ZERO32,
      read_pk_hash: ZERO32,
      window_len: 0n,
      window_cap: 0n,
      caller_commit: ZERO32,
      ...scope,
    },
  });

  const ledgerStateOf = (
    record: LedgerGrant,
  ): Parameters<typeof readGrants>[0] => {
    const grants = [[new Uint8Array(32).fill(1), record]] as const;
    return {
      grants: { [Symbol.iterator]: () => grants[Symbol.iterator]() },
    } as unknown as Parameters<typeof readGrants>[0];
  };

  it('decodes every operation flag the contract stores', () => {
    const [record] = readGrants(
      ledgerStateOf(
        ledgerGrant({
          op_withdraw_unshielded: false,
          op_withdraw_shielded: true,
          op_withdraw_shielded_to_contract: true,
        }),
      ),
    );

    expect(record.scope.operations).toEqual([
      'withdraw-shielded',
      'withdraw-shielded-to-contract',
    ]);
  });

  it('decodes a non-zero window into its length and cap', () => {
    const [record] = readGrants(
      ledgerStateOf(ledgerGrant({ window_len: 86_400n, window_cap: 200n })),
    );

    expect(record.scope.window).toEqual({ lengthSeconds: 86_400, cap: '200' });
  });

  it('refuses a plain field beyond the safe integer range', () => {
    expect(() =>
      readGrants(ledgerStateOf(ledgerGrant({ expires_at: 2n ** 64n - 1n }))),
    ).toThrow('Grant field expires_at exceeds the safe integer range');
  });
});
