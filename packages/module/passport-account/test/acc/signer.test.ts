/**
 * Cross-implementation vectors: every expected constant below was produced
 * by the reference Account Custody Contract client (the passport contract
 * repository, src/wallet/signer.ts) over the same fixed scalar, address,
 * salt, entry, auth nonce, and signing nonce, so these tests prove this
 * port bit-identical to the deployed reference.
 */
import { HexBytes } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { jubjubChallenges } from '../../src/acc/challenges';
import {
  authArgs,
  bytesToBigIntLE,
  JUBJUB_R,
  JubjubDevice,
  randomJubjubScalar,
} from '../../src/acc/signer';

const SK = BigInt(
  '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
);
const FIXED_NONCE = BigInt(
  '0x0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba',
);

const CONTRACT_ADDRESS = Uint8Array.from(
  { length: 32 },
  (_, index) => index + 1,
);
const BOOT_SALT = new Uint8Array(32).fill(0xa5);
const NEW_ENTRY = new Uint8Array(32).fill(0x5a);
const AUTH_NONCE = 7n;

const EXPECTED_PK_X = BigInt(
  '0x09b5a8331d01ee2bae5f0a79aeb181cbf0d0c30624e91b168f92a1ee141f1eb5',
);
const EXPECTED_PK_Y = BigInt(
  '0x04cace00c5ac40ee25037dac862ee498605d93ff626ac4930edb43ef08d575c5',
);
const EXPECTED_ENTRY =
  '73b71bbbedfc07c5a859cc3c48e64fef1182818d19527ebf314e7194b2d4a1a8';
const EXPECTED_BOOT =
  'a399808dced4eba0747fb5c9a5d18e4154478516d54343a599125c45b92603fe';
const EXPECTED_SIG_R_X = BigInt(
  '0x1641a65e4fdff32ce13dce7772e2ed907ed69aa145206ad7ef5b4bd7bdaae530',
);
const EXPECTED_SIG_R_Y = BigInt(
  '0x5862a1cc2ca4992c32c2466640959126c2b5532d0422d0470678c6f703383f29',
);
const EXPECTED_ADD_CHALLENGE_AT_ZERO =
  '0150ab7e588d40e7c9ba022405b7a6079104a3a47d93e4dd5150d4dd768607e2';
const EXPECTED_GRIND_NONCE = 19n;
const EXPECTED_SIG_S = BigInt(
  '0x04a5e09ab29449dcc0b18f36d694dd065922d00b2f0af6ff3ec896402eec03c4',
);
const EXPECTED_REMOVE_CHALLENGE =
  '53e7692e6a3635984f63e2a9ed33f08e33fd3cfb2fe29ffc10bc3ca0a175bdd0';

describe('bytesToBigIntLE', () => {
  it('reads bytes as a little-endian integer', () => {
    expect(bytesToBigIntLE(new Uint8Array([]))).toBe(0n);
    expect(bytesToBigIntLE(new Uint8Array([1, 0, 0]))).toBe(1n);
    expect(bytesToBigIntLE(new Uint8Array([0x12, 0x34]))).toBe(0x34_12n);
  });
});

describe('randomJubjubScalar', () => {
  it('samples scalars in [1, JUBJUB_R)', () => {
    for (let run = 0; run < 32; run++) {
      const scalar = randomJubjubScalar();
      expect(scalar).toBeGreaterThan(0n);
      expect(scalar).toBeLessThan(JUBJUB_R);
    }
  });
});

describe('JubjubDevice', () => {
  const device = new JubjubDevice(SK);

  it('computes the reference public key for the fixed scalar', () => {
    expect(device.pk.x).toBe(EXPECTED_PK_X);
    expect(device.pk.y).toBe(EXPECTED_PK_Y);
  });

  it('derives the reference rolling entry', () => {
    expect(
      HexBytes.fromByteArray(device.entryAt(CONTRACT_ADDRESS, 0n, 0n)),
    ).toBe(EXPECTED_ENTRY);
  });

  it('derives the reference boot commitment', () => {
    expect(HexBytes.fromByteArray(device.bootCommitment(BOOT_SALT))).toBe(
      EXPECTED_BOOT,
    );
  });

  it('builds the reference addDevice and removeDevice challenges', () => {
    const context = {
      contractAddress: CONTRACT_ADDRESS,
      authNonce: AUTH_NONCE,
    };
    const sigR = { x: EXPECTED_SIG_R_X, y: EXPECTED_SIG_R_Y };

    const addChallenge = jubjubChallenges.addDevice(
      context,
      device.pk,
      NEW_ENTRY,
    )(sigR, 0n);
    expect(HexBytes.fromByteArray(addChallenge)).toBe(
      EXPECTED_ADD_CHALLENGE_AT_ZERO,
    );

    const removeChallenge = jubjubChallenges.removeDevice(
      context,
      device.pk,
      device.entryAt(CONTRACT_ADDRESS, 0n, 0n),
    )(sigR, 0n);
    expect(HexBytes.fromByteArray(removeChallenge)).toBe(
      EXPECTED_REMOVE_CHALLENGE,
    );
  });

  it('reproduces the reference signature for the fixed nonce', () => {
    const builder = jubjubChallenges.addDevice(
      { contractAddress: CONTRACT_ADDRESS, authNonce: AUTH_NONCE },
      device.pk,
      NEW_ENTRY,
    );

    const authorisation = device.sign(builder, 3n, FIXED_NONCE);

    expect(authorisation).toEqual({
      scheme: 'jubjub-schnorr',
      pk: { x: EXPECTED_PK_X, y: EXPECTED_PK_Y },
      useCounter: 3n,
      sigR: { x: EXPECTED_SIG_R_X, y: EXPECTED_SIG_R_Y },
      sigS: EXPECTED_SIG_S,
      grindNonce: EXPECTED_GRIND_NONCE,
    });
  });

  it('grinds to the smallest nonce whose challenge is below JUBJUB_R', () => {
    const builder = jubjubChallenges.addDevice(
      { contractAddress: CONTRACT_ADDRESS, authNonce: AUTH_NONCE },
      device.pk,
      NEW_ENTRY,
    );
    const { sigR, grindNonce } = device.sign(builder, 0n, FIXED_NONCE);

    expect(bytesToBigIntLE(builder(sigR, grindNonce))).toBeLessThan(JUBJUB_R);
    for (let nonce = 0n; nonce < grindNonce; nonce++) {
      expect(bytesToBigIntLE(builder(sigR, nonce))).toBeGreaterThanOrEqual(
        JUBJUB_R,
      );
    }
  });

  it('terminates grinding quickly on average across random nonces', () => {
    const builder = jubjubChallenges.addDevice(
      { contractAddress: CONTRACT_ADDRESS, authNonce: AUTH_NONCE },
      device.pk,
      NEW_ENTRY,
    );

    let attempts = 0n;
    for (let run = 0; run < 32; run++) {
      const authorisation = device.sign(builder, 0n);
      attempts += authorisation.grindNonce + 1n;
      expect(authorisation.sigS).toBeLessThan(JUBJUB_R);
    }
    expect(attempts / 32n).toBeLessThan(64n);
  });
});

describe('authArgs', () => {
  it('expands an authorisation in circuit declaration order', () => {
    const device = new JubjubDevice(SK);
    const builder = jubjubChallenges.addDevice(
      { contractAddress: CONTRACT_ADDRESS, authNonce: AUTH_NONCE },
      device.pk,
      NEW_ENTRY,
    );
    const authorisation = device.sign(builder, 3n, FIXED_NONCE);

    expect(authArgs(authorisation)).toEqual([
      authorisation.pk,
      3n,
      authorisation.sigR,
      authorisation.sigS,
      authorisation.grindNonce,
    ]);
  });
});
