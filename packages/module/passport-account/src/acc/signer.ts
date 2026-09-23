import { pureCircuits } from './acc-module';

import type { ChallengeBuilder } from './challenges';
import type { Authorisation } from '@lace-contract/passport';
import type { JubjubPoint } from '@midnight-ntwrk/compact-runtime';

/** Order of the JubJub prime-order subgroup, the Schnorr scalar field. */
export const JUBJUB_R = BigInt(
  '0x0e7db4ea6533afa906673b0101343b00a6682093ccc81082d0970e5ed6f72cb7',
);

/** Uniform scalar in [1, JUBJUB_R), by rejection sampling. */
export const randomJubjubScalar = (): bigint => {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const candidate = [...bytes].reduce(
      (value, byte) => (value << 8n) | BigInt(byte),
      0n,
    );
    if (candidate > 0n && candidate < JUBJUB_R) return candidate;
  }
};

/**
 * Little-endian integer interpretation of a hash, the reading the Account
 * Custody Contract applies when it compares a ground challenge against
 * JUBJUB_R.
 */
export const bytesToBigIntLE = (bytes: Uint8Array): bigint => {
  let result = 0n;
  for (let index = bytes.length - 1; index >= 0; index--) {
    result = (result << 8n) | BigInt(bytes[index]);
  }
  return result;
};

/**
 * A JubJub Schnorr device key for the Account Custody Contract's jubjub
 * authorisation arm. The key is an independent scalar, never derived from
 * a seed shared with any other device. All curve and hash operations go
 * through the contract's own exported pure circuits, so the device
 * inherits the compiler's field-aligned encoding bit-exactly.
 */
export class JubjubDevice {
  public readonly pk: JubjubPoint;

  public constructor(readonly sk: bigint) {
    this.pk = pureCircuits.compute_public_point_with_jubjub(sk);
  }

  public static generate(): JubjubDevice {
    return new JubjubDevice(randomJubjubScalar());
  }

  /** The device's rolling entry at a given account, epoch, and counter. */
  public entryAt(
    contractAddress: Uint8Array,
    epoch: bigint,
    counter: bigint,
  ): Uint8Array {
    return pureCircuits.derive_device_entry_with_jubjub(
      { bytes: contractAddress },
      this.pk,
      epoch,
      counter,
    );
  }

  /** The boot commitment binding this device's key to a boot salt. */
  public bootCommitment(salt: Uint8Array): Uint8Array {
    return pureCircuits.derive_boot_commitment_with_jubjub(salt, this.pk);
  }

  /**
   * Schnorr-signs the call the builder describes. Computes the
   * announcement R = nonce * G, grinds the challenge hash by incrementing
   * the grind nonce until its little-endian value falls below JUBJUB_R,
   * then closes with s = nonce + challenge * sk mod JUBJUB_R.
   *
   * `useCounter` is carried alongside for the contract's anti-replay entry
   * consumption; it is bound by the consumed entry, not the challenge.
   * `nonce` defaults to a fresh uniform scalar and must never repeat
   * across signatures, or the secret key leaks.
   */
  public sign(
    challenge: ChallengeBuilder,
    useCounter: bigint,
    nonce: bigint = randomJubjubScalar(),
  ): Authorisation {
    const sigR = pureCircuits.compute_public_point_with_jubjub(nonce);

    let grindNonce = 0n;
    let challengeScalar: bigint;
    for (;;) {
      const hash = bytesToBigIntLE(challenge(sigR, grindNonce));
      if (hash < JUBJUB_R) {
        challengeScalar = hash;
        break;
      }
      grindNonce++;
    }

    const sigS =
      (nonce +
        (((challengeScalar % JUBJUB_R) * (this.sk % JUBJUB_R)) % JUBJUB_R)) %
      JUBJUB_R;
    return {
      scheme: 'jubjub-schnorr',
      pk: this.pk,
      useCounter,
      sigR,
      sigS,
      grindNonce,
    };
  }
}

/**
 * The trailing circuit arguments an Authorisation expands to, in the order
 * the jubjub-gated circuits declare them after their own arguments.
 */
export const authArgs = (authorisation: Authorisation): unknown[] => [
  authorisation.pk,
  authorisation.useCounter,
  authorisation.sigR,
  authorisation.sigS,
  authorisation.grindNonce,
];
