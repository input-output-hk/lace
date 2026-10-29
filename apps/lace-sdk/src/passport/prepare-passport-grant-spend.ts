import { loadGrantSpend } from '@lace-module/passport-account/sdk';

import type { PassportParsedAgentPolicy } from './parse-passport-agent-policy';
import type {
  GrantSpend,
  GrantSpendCall,
  GrantSpendChallenges,
} from '@lace-module/passport-account/sdk';

/**
 * Prepares a spend under the grant of an agent policy, as the agent
 * submits it: the withdrawal circuit to call, its arguments up to the
 * signature, and the challenge to sign, built with the account contract's
 * own challenge circuits. The agent signs the challenge with its grant
 * key, appends `grantSpendAuthorisationArgs(signature)` to `args` and
 * calls the circuit on the account.
 *
 * A shielded spend's `coin` is bound into the challenge but is not a call
 * argument: the contract reads it through its `held_coin` witness, so a
 * shielded call must run with that witness returning exactly `spend.coin`,
 * `mt_index` included, for the grant's colour.
 *
 * A secp256k1 grantee signs `digest`, the SHA-256 of the challenge, as
 * plain ECDSA with no further hashing or message prefix; a jubjub grantee
 * Schnorr-signs the challenge function, grinding its nonce until the
 * challenge falls below the jubjub subgroup order.
 *
 * The spend's `issuedAt` and `nonce` are what the grant's record holds on
 * the ledger before the call, and `spent` is what the grant has spent
 * before it, so a stale value fails on the contract. The spend is checked
 * against the grant's scope as the policy states it, which the contract
 * checks again: the policy is a snapshot, so a grant revoked since it was
 * exported is refused by the contract alone. The first call loads the
 * Midnight runtime.
 *
 * @throws {@link GrantSpendRefusedError} When the grant does not allow
 *   the spend: a grant past its expiry by this machine's clock, an
 *   operation outside its scope, an amount above the per-call cap or past
 *   the cap, a recipient its pin does not admit, a coin of another colour,
 *   above its coin bound or below the amount, or a grant id that does not
 *   derive from the policy's own fields.
 */
export const preparePassportGrantSpend = async (
  policy: PassportParsedAgentPolicy,
  spend: GrantSpend,
): Promise<GrantSpendCall> => {
  const { prepareGrantSpend } = await loadGrantSpend();
  return prepareGrantSpend(policy, spend);
};

/**
 * The challenge builders of every grant withdrawal, by grantee scheme and
 * operation, for an agent that assembles its call itself. Each builds the
 * exact bytes the account contract hashes, from the contract's own
 * challenge circuits. Loads the Midnight runtime on the first call.
 */
export const loadPassportGrantSpendChallenges =
  async (): Promise<GrantSpendChallenges> =>
    (await loadGrantSpend()).grantSpendChallenges;
