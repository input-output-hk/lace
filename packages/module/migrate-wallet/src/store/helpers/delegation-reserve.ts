import type { RequiredProtocolParameters } from '@lace-contract/cardano-context';

/**
 * Head-room for the destination's delegation fee. A certificate-only
 * transaction costs a fraction of this; the margin is deliberate, because the
 * fee cannot be priced before the sweep lands (the destination has no UTxOs to
 * build against) and under-reserving is what strands a migrated wallet
 * undelegated.
 */
const DELEGATION_FEE_RESERVE = 500_000n;

/**
 * Lovelace the sweep must leave the destination able to spend on its own
 * delegation, or `0n` when no delegation will run — which makes the shortfall
 * gate inert rather than special-cased at the call site.
 *
 * The stake-key deposit is reserved whenever a target exists, including for a
 * destination that already stakes and will therefore not pay one. Reading the
 * destination's registration state here would tie discovery — which runs
 * against the source — to the destination's sync, and over-reserving one
 * deposit only refuses migrations already within ~2 ADA of the floor.
 */
export const delegationReserve = ({
  hasDelegationTarget,
  protocolParameters,
}: {
  hasDelegationTarget: boolean;
  protocolParameters: Pick<RequiredProtocolParameters, 'stakeKeyDeposit'>;
}): bigint =>
  hasDelegationTarget
    ? BigInt(protocolParameters.stakeKeyDeposit) + DELEGATION_FEE_RESERVE
    : 0n;
