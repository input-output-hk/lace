import { pureCircuits } from './acc-module';

import type { JubjubPoint } from '@midnight-ntwrk/compact-runtime';

/**
 * The call-site facts every challenge binds: which account the call
 * executes against and the auth nonce it will consume (read before the
 * contract increments it), so a signature authorises exactly one call on
 * exactly one account.
 */
export type CallContext = {
  contractAddress: Uint8Array;
  authNonce: bigint;
};

/**
 * A jubjub-arm challenge builder: the per-circuit challenge preimage hash,
 * closed over the account address, the circuit's arguments, and the
 * observed auth nonce. The signer varies only the announcement and the
 * grind nonce.
 */
export type ChallengeBuilder = (
  sigR: JubjubPoint,
  grindNonce: bigint,
) => Uint8Array;

const address = (context: CallContext) => ({
  bytes: context.contractAddress,
});

/**
 * Per-circuit challenge builders for the jubjub-gated circuits this module
 * calls. The preimage layout is produced by the contract's own exported
 * pure circuits: a per-circuit domain separation tag, the account address,
 * the signature announcement, the device public key, the circuit's
 * arguments in declaration order, the auth nonce, and the grind nonce.
 * `activate_initial_device_with_jubjub` is permissionless and has no
 * challenge.
 */
export const jubjubChallenges = {
  /** Challenge over the new device's derived entry. */
  addDevice:
    (
      context: CallContext,
      pk: JubjubPoint,
      newEntry: Uint8Array,
    ): ChallengeBuilder =>
    (sigR, grindNonce) =>
      pureCircuits.challenge_add_device_with_jubjub(
        address(context),
        sigR,
        pk,
        newEntry,
        context.authNonce,
        grindNonce,
      ),

  /** Challenge over the removed device's stored entry. */
  removeDevice:
    (
      context: CallContext,
      pk: JubjubPoint,
      entry: Uint8Array,
    ): ChallengeBuilder =>
    (sigR, grindNonce) =>
      pureCircuits.challenge_remove_device_with_jubjub(
        address(context),
        sigR,
        pk,
        entry,
        context.authNonce,
        grindNonce,
      ),
};
