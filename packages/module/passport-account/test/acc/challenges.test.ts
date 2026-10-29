/**
 * The grant challenge builders are checked two ways: against the
 * contract's own challenge mirrors called with literal arguments, and end
 * to end against the contract executed in process, which accepts a
 * signature only when its mirror reproduces the challenge the device
 * signed.
 */
import { TokenColor, UseCounter } from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';
import { jubjub } from '@noble/curves/misc.js';
import { describe, expect, it } from 'vitest';

import { pureCircuits } from '../../src/acc/acc-module';
import { jubjubChallenges } from '../../src/acc/challenges';
import {
  prepareAppendInbox,
  prepareRotateEncKey,
} from '../../src/acc/enc-key-rotation';
import { ISSUE_GRANT_CIRCUIT } from '../../src/acc/grant-circuits';
import {
  prepareIssueGrant,
  prepareRevokeAllGrants,
  prepareRevokeGrant,
} from '../../src/acc/grants';
import { readGrants } from '../../src/acc/read-grants';
import { bytesToBigIntLE, JUBJUB_R, JubjubDevice } from '../../src/acc/signer';

import { AccountSim } from './account-sim';

import type { GrantScopeInput } from '@lace-contract/passport';

const CONTRACT_ADDRESS = Uint8Array.from(
  { length: 32 },
  (_, index) => index + 1,
);
const GRANT_ID = new Uint8Array(32).fill(0x31);
const SCOPE_DIGEST = new Uint8Array(32).fill(0x32);
const ORIGIN = new Uint8Array(32).fill(0x11);
const AUTH_NONCE = 7n;
const SIG_R = { x: 5n, y: 6n };

const device = new JubjubDevice(
  BigInt('0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
);
const context = { contractAddress: CONTRACT_ADDRESS, authNonce: AUTH_NONCE };
const grantee = new JubjubDevice(55n);

const spendScope: GrantScopeInput = {
  grantee: {
    scheme: 'jubjub-schnorr',
    publicKey: HexBytes.fromByteArray(
      jubjub.Point.fromAffine(grantee.pk).toBytes(),
    ),
  },
  operations: ['withdraw-unshielded'],
  color: TokenColor('00'.repeat(32)),
  recipient: { kind: 'any' },
  maxCoinValue: '300',
  perCallCap: '300',
  cap: '450',
  expiresAt: null,
};

const prepareIssue = (sim: AccountSim) =>
  prepareIssueGrant({
    contractAddress: sim.address,
    scope: spendScope,
    originHash: ORIGIN,
    roster: readGrants(sim.ledger()),
  });

describe('jubjubChallenges grant builders', () => {
  it('issueGrant reproduces the contract mirror over the grant id and digest', () => {
    const builder = jubjubChallenges.issueGrant(context, device.pk, {
      grantId: GRANT_ID,
      scopeDigest: SCOPE_DIGEST,
    });

    expect(builder(SIG_R, 9n)).toEqual(
      pureCircuits.challenge_issue_grant_with_jubjub(
        { bytes: CONTRACT_ADDRESS },
        SIG_R,
        device.pk,
        GRANT_ID,
        SCOPE_DIGEST,
        AUTH_NONCE,
        9n,
      ),
    );
  });

  it('revokeGrant reproduces the contract mirror over the grant id', () => {
    const builder = jubjubChallenges.revokeGrant(context, device.pk, GRANT_ID);

    expect(builder(SIG_R, 9n)).toEqual(
      pureCircuits.challenge_revoke_grant_with_jubjub(
        { bytes: CONTRACT_ADDRESS },
        SIG_R,
        device.pk,
        GRANT_ID,
        AUTH_NONCE,
        9n,
      ),
    );
  });

  it('revokeAllGrants reproduces the contract mirror over the context alone', () => {
    const builder = jubjubChallenges.revokeAllGrants(context, device.pk);

    expect(builder(SIG_R, 9n)).toEqual(
      pureCircuits.challenge_revoke_all_grants_with_jubjub(
        { bytes: CONTRACT_ADDRESS },
        SIG_R,
        device.pk,
        AUTH_NONCE,
        9n,
      ),
    );
  });

  it('separates the three circuits and the device circuits by tag', () => {
    const challenges = [
      jubjubChallenges.issueGrant(context, device.pk, {
        grantId: GRANT_ID,
        scopeDigest: SCOPE_DIGEST,
      }),
      jubjubChallenges.revokeGrant(context, device.pk, GRANT_ID),
      jubjubChallenges.revokeAllGrants(context, device.pk),
      jubjubChallenges.removeDevice(context, device.pk, GRANT_ID),
    ].map(builder => HexBytes.fromByteArray(builder(SIG_R, 0n)));

    expect(new Set(challenges).size).toBe(challenges.length);
  });

  it.each([
    [
      'issueGrant',
      jubjubChallenges.issueGrant(context, device.pk, {
        grantId: GRANT_ID,
        scopeDigest: SCOPE_DIGEST,
      }),
    ],
    ['revokeGrant', jubjubChallenges.revokeGrant(context, device.pk, GRANT_ID)],
    ['revokeAllGrants', jubjubChallenges.revokeAllGrants(context, device.pk)],
  ])(
    '%s yields a challenge the device grinds below JUBJUB_R',
    (_name, builder) => {
      const authorisation = device.sign(builder, 0n);

      expect(authorisation.sigS).toBeLessThan(JUBJUB_R);
      expect(
        bytesToBigIntLE(builder(authorisation.sigR, authorisation.grindNonce)),
      ).toBeLessThan(JUBJUB_R);
    },
  );
});

describe('grant circuits against the contract', () => {
  it('issues, revokes and revokes all through the authoriser and the gate', async () => {
    const sim = await AccountSim.create();

    const issued = await sim.gated(prepareIssue(sim).call);
    expect(issued).toBe(1n);
    expect(sim.ledger().grants.size()).toBe(1n);

    const second = prepareIssue(sim);
    expect(second.slot).toBe(1);
    await sim.gated(second.call, UseCounter(issued));
    expect(sim.ledger().grants.size()).toBe(2n);

    await sim.gated(prepareRevokeGrant(second.grantId), UseCounter(2n));
    const afterRevoke = readGrants(sim.ledger());
    expect(afterRevoke.find(({ id }) => id === second.grantId)?.active).toBe(
      false,
    );

    const settled = await sim.gated(prepareRevokeAllGrants(), UseCounter(3n));
    expect(settled).toBe(4n);
    expect(sim.ledger().grants.isEmpty()).toBe(true);
    expect(sim.ledger().grant_generation).toBe(1n);
  });

  it('rejects an issue whose scope differs from the one the device signed', async () => {
    const sim = await AccountSim.create();
    const { call } = prepareIssue(sim);
    const signed = await sim.authoriser.authorise({
      account: sim.account,
      circuit: ISSUE_GRANT_CIRCUIT,
      args: call.args,
      witnessValues: [],
      authNonce: sim.ledger().auth_nonce,
      useCounter: UseCounter(0n),
    });
    const tampered = [...call.args];
    tampered[9] = 451n;

    await expect(
      sim.call(
        ISSUE_GRANT_CIRCUIT,
        ...tampered,
        signed.pk,
        signed.useCounter,
        signed.sigR,
        signed.sigS,
        signed.grindNonce,
      ),
    ).rejects.toThrow();
    expect(sim.ledger().grants.isEmpty()).toBe(true);
  });

  it('rejects a revoke of a grant the contract does not hold', async () => {
    const sim = await AccountSim.create();
    const { grantId } = prepareIssue(sim);

    await expect(sim.gated(prepareRevokeGrant(grantId))).rejects.toThrow(
      /unknown grant/,
    );
  });
});

describe('jubjubChallenges encryption key builders', () => {
  const NEW_KEY = new Uint8Array(32).fill(0x41);
  const ENTRY = new Uint8Array(192).fill(0x42);

  it('rotateEncKey reproduces the contract mirror over the new key', () => {
    const builder = jubjubChallenges.rotateEncKey(context, device.pk, NEW_KEY);

    expect(builder(SIG_R, 9n)).toEqual(
      pureCircuits.challenge_rotate_enc_key_with_jubjub(
        { bytes: CONTRACT_ADDRESS },
        SIG_R,
        device.pk,
        NEW_KEY,
        AUTH_NONCE,
        9n,
      ),
    );
  });

  it('appendInbox reproduces the contract mirror over the entry', () => {
    const builder = jubjubChallenges.appendInbox(context, device.pk, ENTRY);

    expect(builder(SIG_R, 9n)).toEqual(
      pureCircuits.challenge_append_inbox_with_jubjub(
        { bytes: CONTRACT_ADDRESS },
        SIG_R,
        device.pk,
        ENTRY,
        AUTH_NONCE,
        9n,
      ),
    );
  });

  it('rotates enc_key and appends an inbox entry through the real circuits, each consuming one device entry', async () => {
    const sim = await AccountSim.create();

    const afterRotate = await sim.gated(prepareRotateEncKey(NEW_KEY));
    expect(afterRotate).toBe(1n);
    expect(sim.ledger().enc_key).toEqual(NEW_KEY);

    const afterAppend = await sim.gated(prepareAppendInbox(ENTRY), afterRotate);
    expect(afterAppend).toBe(2n);
    expect(sim.ledger().inbox_count).toBe(1n);
    expect(sim.ledger().inbox.lookup(0n)).toEqual(ENTRY);
  });

  it('refuses a rotation signed by a device the account does not hold', async () => {
    const sim = await AccountSim.create();
    const stranger = JubjubDevice.generate();
    const authorisation = stranger.sign(
      jubjubChallenges.rotateEncKey(
        { contractAddress: sim.address, authNonce: sim.ledger().auth_nonce },
        stranger.pk,
        NEW_KEY,
      ),
      0n,
    );

    await expect(
      sim.call(
        'rotate_enc_key_with_jubjub',
        NEW_KEY,
        authorisation.pk,
        authorisation.useCounter,
        authorisation.sigR,
        authorisation.sigS,
        authorisation.grindNonce,
      ),
    ).rejects.toThrow(/unknown device entry/);
  });
});
