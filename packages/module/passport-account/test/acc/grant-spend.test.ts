/**
 * The grant spend builders are checked against the contract's own
 * challenge mirrors called with literal arguments, and the preparation
 * against the withdrawal circuits' declared arity and the scope rules the
 * contract asserts. The simulated account accepting the prepared calls is
 * shown in the grant spend sim.
 */
import { GrantSlot, GrantSpendRefusedError } from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { jubjub } from '@noble/curves/misc.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Contract, pureCircuits } from '../../src/acc/acc-module';
import { prepareGrantSpend } from '../../src/acc/grant-spend';
import { grantSpendAuthorisationArgs } from '../../src/acc/grant-spend-authorisation';
import { grantSpendChallenges } from '../../src/acc/grant-spend-challenges';
import { deriveGrantId, granteePoint, originHash } from '../../src/acc/grants';

import type { GrantSpend, GrantSpendPolicy } from '../../src/acc/grant-spend';
import type { GrantShieldedWithdrawal } from '../../src/acc/grant-spend-challenges';
import type { GranteeScheme } from '@lace-contract/passport';

const CONTRACT_ADDRESS = Uint8Array.from(
  { length: 32 },
  (_, index) => index + 1,
);
const GRANT_ID = new Uint8Array(32).fill(0x31);
const COLOR = new Uint8Array(32).fill(0x0c);
const RECIPIENT = new Uint8Array(32).fill(0x44);
const SIG_R = { x: 5n, y: 6n };
const ISSUED_AT = 1_800_000_000n;
const NONCE = 3n;

const K256_SECRET = 0x5eed_c0ffeen;
const K256_PUBLIC_KEY = HexBytes.fromByteArray(
  secp256k1.Point.BASE.multiply(K256_SECRET).toBytes(true),
);
const k256Pk = pureCircuits.compute_public_point_with_k256(K256_SECRET);
const jubjubPk = pureCircuits.compute_public_point_with_jubjub(55n);
const JUBJUB_PUBLIC_KEY = HexBytes.fromByteArray(
  jubjub.Point.fromAffine(jubjubPk).toBytes(),
);

const context = (granteePublicKey: string) => ({
  contractAddress: CONTRACT_ADDRESS,
  granteePublicKey,
  grantId: GRANT_ID,
  issuedAt: ISSUED_AT,
  nonce: NONCE,
});

const unshielded = { color: COLOR, amount: 40n, recipient: RECIPIENT };
const shielded: GrantShieldedWithdrawal = {
  ...unshielded,
  changeEntry: new Uint8Array(192).fill(0x0e),
  encPublicKey: new Uint8Array(32).fill(0x0f),
  coin: {
    nonce: new Uint8Array(32).fill(0x0a),
    color: COLOR,
    value: 90n,
    mtIndex: 12n,
  },
};
const coin = {
  nonce: shielded.coin.nonce,
  color: COLOR,
  value: 90n,
  mt_index: 12n,
};

describe('grantSpendChallenges', () => {
  it('reproduces the k256 unshielded mirror', () => {
    expect(
      grantSpendChallenges['secp256k1-ecdsa']['withdraw-unshielded'](
        context(K256_PUBLIC_KEY),
        unshielded,
      ),
    ).toEqual(
      pureCircuits.challenge_withdraw_unshielded_with_grant_k256(
        { bytes: CONTRACT_ADDRESS },
        k256Pk,
        GRANT_ID,
        ISSUED_AT,
        COLOR,
        40n,
        { bytes: RECIPIENT },
        NONCE,
      ),
    );
  });

  it.each([
    [
      'withdraw-shielded',
      pureCircuits.challenge_withdraw_shielded_with_grant_k256,
    ],
    [
      'withdraw-shielded-to-contract',
      pureCircuits.challenge_withdraw_shielded_to_contract_with_grant_k256,
    ],
  ] as const)('reproduces the k256 %s mirror', (operation, mirror) => {
    expect(
      grantSpendChallenges['secp256k1-ecdsa'][operation](
        context(K256_PUBLIC_KEY),
        shielded,
      ),
    ).toEqual(
      mirror(
        { bytes: CONTRACT_ADDRESS },
        k256Pk,
        GRANT_ID,
        ISSUED_AT,
        { bytes: RECIPIENT },
        COLOR,
        40n,
        shielded.changeEntry,
        shielded.encPublicKey,
        coin,
        NONCE,
      ),
    );
  });

  it('reproduces the jubjub unshielded mirror for any announcement and grind nonce', () => {
    const challenge = grantSpendChallenges['jubjub-schnorr'][
      'withdraw-unshielded'
    ](context(JUBJUB_PUBLIC_KEY), unshielded);

    expect(challenge(SIG_R, 9n)).toEqual(
      pureCircuits.challenge_withdraw_unshielded_with_grant_jubjub(
        { bytes: CONTRACT_ADDRESS },
        SIG_R,
        jubjubPk,
        GRANT_ID,
        ISSUED_AT,
        COLOR,
        40n,
        { bytes: RECIPIENT },
        NONCE,
        9n,
      ),
    );
    expect(challenge(SIG_R, 10n)).not.toEqual(challenge(SIG_R, 9n));
  });

  it.each([
    [
      'withdraw-shielded',
      pureCircuits.challenge_withdraw_shielded_with_grant_jubjub,
    ],
    [
      'withdraw-shielded-to-contract',
      pureCircuits.challenge_withdraw_shielded_to_contract_with_grant_jubjub,
    ],
  ] as const)('reproduces the jubjub %s mirror', (operation, mirror) => {
    expect(
      grantSpendChallenges['jubjub-schnorr'][operation](
        context(JUBJUB_PUBLIC_KEY),
        shielded,
      )(SIG_R, 9n),
    ).toEqual(
      mirror(
        { bytes: CONTRACT_ADDRESS },
        SIG_R,
        jubjubPk,
        GRANT_ID,
        ISSUED_AT,
        { bytes: RECIPIENT },
        COLOR,
        40n,
        shielded.changeEntry,
        shielded.encPublicKey,
        coin,
        NONCE,
        9n,
      ),
    );
  });
});

describe('grantSpendAuthorisationArgs', () => {
  it('expands a secp256k1 signature to the one signature argument', () => {
    expect(
      grantSpendAuthorisationArgs({ scheme: 'secp256k1-ecdsa', r: 1n, s: 2n }),
    ).toEqual([{ r: 1n, s: 2n }]);
  });

  it('expands a jubjub signature to the announcement, response and grind nonce', () => {
    expect(
      grantSpendAuthorisationArgs({
        scheme: 'jubjub-schnorr',
        sigR: SIG_R,
        sigS: 7n,
        grindNonce: 8n,
      }),
    ).toEqual([SIG_R, 7n, 8n]);
  });
});

const ORIGIN = 'lace.io';
const SLOT = 4;

/** A consistent policy for a grantee of `scheme`, its id derived from its own fields. */
const policyFor = async (
  scheme: GranteeScheme,
  overrides: Partial<GrantSpendPolicy> = {},
): Promise<GrantSpendPolicy> => {
  const granteePublicKey =
    scheme === 'secp256k1-ecdsa' ? K256_PUBLIC_KEY : JUBJUB_PUBLIC_KEY;
  return {
    account: HexBytes.fromByteArray(CONTRACT_ADDRESS),
    grantId: deriveGrantId({
      contractAddress: CONTRACT_ADDRESS,
      granteePublicKey: granteePoint({ scheme, publicKey: granteePublicKey }),
      originHash: await originHash(ORIGIN),
      slot: GrantSlot(SLOT),
    }),
    slot: SLOT,
    granteeScheme: scheme,
    granteePublicKey,
    scopeSalt: '33'.repeat(32),
    color: HexBytes.fromByteArray(COLOR),
    recipient: { kind: 'any' },
    maxCoinValue: '100',
    perCallCap: '50',
    cap: '120',
    operations: [
      'withdraw-unshielded',
      'withdraw-shielded',
      'withdraw-shielded-to-contract',
    ],
    origin: ORIGIN,
    expiresAt: null,
    ...overrides,
  };
};

const ledgerState = { issuedAt: ISSUED_AT, nonce: NONCE, spent: 30n };
const unshieldedSpend: GrantSpend = {
  operation: 'withdraw-unshielded',
  amount: 40n,
  recipient: RECIPIENT,
  ...ledgerState,
};
const shieldedSpend: GrantSpend = {
  operation: 'withdraw-shielded',
  amount: 40n,
  recipient: RECIPIENT,
  changeEntry: shielded.changeEntry,
  encPublicKey: shielded.encPublicKey,
  coin: shielded.coin,
  ...ledgerState,
};

const circuits = new Contract({
  held_coin: () => {
    throw new Error('No coin is held here');
  },
}).impureCircuits as unknown as Record<
  string,
  (...args: unknown[]) => Promise<unknown>
>;

/**
 * The arguments a circuit declares after its context, as its generated
 * entry point reports them when called with none.
 */
const declaredArity = async (circuit: string): Promise<number> => {
  const refusal = await circuits[circuit]().then(
    () => '',
    (error: Error) => error.message,
  );
  const expected = /expected (\d+) arguments/.exec(refusal);
  if (!expected) throw new Error(`${circuit} reported no arity: ${refusal}`);
  return Number(expected[1]) - 1;
};

describe('prepareGrantSpend', () => {
  it('lays a secp256k1 unshielded spend out as the k256 withdrawal takes it, signing the SHA-256 of the challenge', async () => {
    const policy = await policyFor('secp256k1-ecdsa');

    const call = await prepareGrantSpend(policy, unshieldedSpend);

    expect(call.circuit).toBe('withdraw_unshielded_with_grant_k256');
    expect(call.args).toEqual([
      COLOR,
      40n,
      { bytes: RECIPIENT },
      k256Pk,
      0n,
      await originHash(ORIGIN),
      4n,
      new Uint8Array(32).fill(0x33),
      0n,
      new Uint8Array(32),
      100n,
      30n,
    ]);
    expect(call.args.length + 1).toBe(await declaredArity(call.circuit));
    if (call.scheme !== 'secp256k1-ecdsa') throw new Error('not k256');
    expect(call.challenge).toEqual(
      pureCircuits.challenge_withdraw_unshielded_with_grant_k256(
        { bytes: CONTRACT_ADDRESS },
        k256Pk,
        ByteArray.fromHex(HexBytes(policy.grantId)),
        ISSUED_AT,
        COLOR,
        40n,
        { bytes: RECIPIENT },
        NONCE,
      ),
    );
    expect(call.digest).toEqual(sha256(call.challenge));
    expect(call.digest).toEqual(
      pureCircuits.envelope_digest(0n, call.challenge),
    );
  });

  it.each([
    ['secp256k1-ecdsa', 'withdraw_shielded_with_grant_k256', 1],
    ['jubjub-schnorr', 'withdraw_shielded_with_grant_jubjub', 3],
  ] as const)(
    'gives a %s shielded spend every argument %s declares but the signature',
    async (scheme, circuit, signatureArity) => {
      const call = await prepareGrantSpend(
        await policyFor(scheme),
        shieldedSpend,
      );

      expect(call.circuit).toBe(circuit);
      expect(call.args.slice(0, 5)).toEqual([
        { bytes: RECIPIENT },
        COLOR,
        40n,
        shielded.changeEntry,
        shielded.encPublicKey,
      ]);
      expect(call.args.length + signatureArity).toBe(
        await declaredArity(circuit),
      );
    },
  );

  it('names the to-contract withdrawal and the pinned recipient a contract grant carries', async () => {
    const policy = await policyFor('jubjub-schnorr', {
      recipient: {
        kind: 'contract-address',
        value: HexBytes.fromByteArray(RECIPIENT),
      },
    });

    const call = await prepareGrantSpend(policy, {
      ...shieldedSpend,
      operation: 'withdraw-shielded-to-contract',
    });

    expect(call.circuit).toBe(
      'withdraw_shielded_to_contract_with_grant_jubjub',
    );
    expect(call.args.slice(-4, -2)).toEqual([3n, RECIPIENT]);
    if (call.scheme !== 'jubjub-schnorr') throw new Error('not jubjub');
    expect(call.challenge(SIG_R, 0n)).toHaveLength(32);
  });

  it.each([
    {
      refused: 'an operation outside the scope',
      overrides: { operations: ['withdraw-unshielded'] },
      spend: shieldedSpend,
      reason: 'withdraw-shielded is not in its scope',
    },
    {
      refused: 'an amount above the per-call cap',
      spend: { ...unshieldedSpend, amount: 51n },
      reason: '51 is above the per-call cap 50',
    },
    {
      refused: 'a spend past the cap',
      spend: { ...unshieldedSpend, spent: 90n },
      reason: 'exceeds the cap 120',
    },
    {
      refused: 'a pin of another recipient kind',
      overrides: {
        recipient: { kind: 'coin-public-key', value: '44'.repeat(32) },
      },
      spend: unshieldedSpend,
      reason: 'pins a coin-public-key recipient',
    },
    {
      refused: 'another recipient than the pinned one',
      overrides: {
        recipient: { kind: 'user-address', value: '45'.repeat(32) },
      },
      spend: unshieldedSpend,
      reason: 'the recipient is not the one it pins',
    },
    {
      refused: 'a coin of another colour',
      spend: {
        ...shieldedSpend,
        coin: { ...shielded.coin, color: new Uint8Array(32) },
      },
      reason: 'the coin is not of its colour',
    },
    {
      refused: 'a coin above the coin bound',
      spend: { ...shieldedSpend, coin: { ...shielded.coin, value: 101n } },
      reason: 'above its coin bound 100',
    },
    {
      refused: 'a coin that cannot pay the amount',
      spend: { ...shieldedSpend, coin: { ...shielded.coin, value: 39n } },
      reason: 'the coin of 39 cannot pay the amount 40',
    },
    {
      refused: 'an expired grant',
      overrides: { expiresAt: 1 },
      spend: unshieldedSpend,
      reason: 'it expired at 1',
    },
    {
      refused: 'a grant id that is not the policy own',
      overrides: { grantId: '11'.repeat(32) },
      spend: unshieldedSpend,
      reason: 'does not derive from the policy',
    },
  ] as const)('refuses $refused', async ({ overrides, spend, reason }) => {
    const policy = await policyFor(
      'secp256k1-ecdsa',
      overrides as Partial<GrantSpendPolicy> | undefined,
    );

    const refusal = prepareGrantSpend(policy, spend as GrantSpend);

    await expect(refusal).rejects.toThrow(GrantSpendRefusedError);
    await expect(refusal).rejects.toThrow(reason);
  });

  describe('expiry', () => {
    const EXPIRES_AT = 1_900_000_000;

    afterEach(() => {
      vi.useRealTimers();
    });

    it('refuses a grant from the second it expires, as the contract does', async () => {
      vi.useFakeTimers({ now: EXPIRES_AT * 1000 });
      const policy = await policyFor('secp256k1-ecdsa', {
        expiresAt: EXPIRES_AT,
      });

      await expect(prepareGrantSpend(policy, unshieldedSpend)).rejects.toThrow(
        GrantSpendRefusedError,
      );
    });

    it('prepares a spend in the last second before expiry', async () => {
      vi.useFakeTimers({ now: EXPIRES_AT * 1000 - 1 });
      const policy = await policyFor('secp256k1-ecdsa', {
        expiresAt: EXPIRES_AT,
      });

      await expect(
        prepareGrantSpend(policy, unshieldedSpend),
      ).resolves.toMatchObject({ scheme: 'secp256k1-ecdsa' });
    });
  });
});
