import { Err, Ok } from '@lace-lib/util';

import {
  isSharedCollateralRefusal,
  sponsorKeyHashOf,
} from './cardano-custody-operation-guards';
import { CardanoCustodySponsorError } from './cardano-custody-sponsor';
import { persistentSponsorRefusalOf } from './cardano-custody-sponsor-refusals';

import type {
  CardanoCustodySponsor,
  CardanoCustodySponsorLease,
} from './cardano-custody-sponsor';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  CardanoCustodyBuildResult,
  CardanoCustodyFeeFunding,
} from '@lace-contract/cardano-context';
import type { Result } from '@lace-lib/util';

/** The service no longer holds a lease it reports so; releasing it fails. */
const DROPPED_LEASE_CODES = new Set([
  'lease_consumed',
  'lease_expired',
  'unknown_lease',
]);

/**
 * Whether a failed witness request certainly issued no witness: the service
 * refused it with one of its documented errors. A transport failure or an
 * unreadable answer may follow a witness, which consumes the lease.
 */
const isRefusedBeforeWitness = (error: unknown): boolean =>
  error instanceof CardanoCustodySponsorError &&
  error.code !== 'unexpected_response' &&
  !DROPPED_LEASE_CODES.has(error.code);

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/** Gives a lease back, leaving it to lapse at its expiry when that fails. */
const releaseLeaseQuietly = async (
  sponsor: CardanoCustodySponsor,
  lease: CardanoCustodySponsorLease,
): Promise<void> => {
  try {
    await sponsor.releaseLease(lease.leaseId);
  } catch {
    // The lease lapses at its expiry instead.
  }
};

/** The fee-mode funding of a build on a lease, valid until the lease lapses. */
export const leaseFundingOf = (
  lease: CardanoCustodySponsorLease,
): CardanoCustodyFeeFunding => ({
  mode: 'fee',
  feeUtxo: lease.feeUtxo,
  collateralUtxo: lease.collateralUtxo,
  sponsorAddress: lease.sponsorAddress,
  maxSponsoredLovelace: lease.maxSponsoredLovelace,
  validUntil: lease.expiresAt,
});

/** A build that ended without a transaction; none when `Stop` is `never`. */
type Stopped<Stop> = [Stop] extends [never]
  ? never
  : { readonly status: 'stopped'; readonly value: Stop };

type BuiltOnLease<Built> = {
  readonly status: 'built';
  readonly result: CardanoCustodyBuildResult;
  readonly built: Built;
};

/**
 * A transaction built on a lease, with what the caller derived from it, or
 * the value the build stopped with instead of a transaction.
 */
export type LeasedBuild<Built, Stop = never> =
  | BuiltOnLease<Built>
  | Stopped<Stop>;

/** A build on a lease the sponsor signed, or the value a build stopped with. */
export type LeasedSponsorWitness<Built, Stop = never> =
  | Stopped<Stop>
  | {
      readonly status: 'signed';
      readonly result: CardanoCustodyBuildResult;
      readonly built: Built;
      readonly sponsorKeyHash: Ed25519KeyHashHex;
      readonly sponsorWitnessSet: string;
    };

const isBuilt = <Built, Stop>(
  outcome: LeasedBuild<Built, Stop>,
): outcome is BuiltOnLease<Built> => outcome.status === 'built';

/**
 * Leases a fee UTxO, builds on it and has the sponsor sign: fee mode, which
 * serves an account creation only.
 *
 * The lease is released whenever the build fails or stops, since no witness
 * was asked for yet, and when the sponsor certainly refused the witness.
 * A lease the sponsor may have signed for is never released: its witness
 * consumed it. A sponsor that replaced its shared collateral after the lease
 * named it refuses under `uses_shared_collateral`; the transaction is then
 * built once more on a new lease, which names the current collateral. A
 * refusal no build can avoid, such as of the logic the creation runs,
 * answers its typed error.
 *
 * A sponsor address without a payment key is refused before the build.
 */
export const buildWithLeasedSponsorWitness = async <Built, Stop = never>(
  sponsor: CardanoCustodySponsor,
  build: (
    lease: CardanoCustodySponsorLease,
  ) => Promise<Result<LeasedBuild<Built, Stop>, Error>>,
): Promise<Result<LeasedSponsorWitness<Built, Stop>, Error>> => {
  for (let attempt = 0; ; attempt++) {
    const lease = await sponsor.lease();
    let sponsorKeyHash: Ed25519KeyHashHex;
    let built: Result<LeasedBuild<Built, Stop>, Error>;
    try {
      sponsorKeyHash = sponsorKeyHashOf(lease.sponsorAddress);
      built = await build(lease);
    } catch (error) {
      await releaseLeaseQuietly(sponsor, lease);
      throw error;
    }
    if (built.isErr()) {
      await releaseLeaseQuietly(sponsor, lease);
      return Err(built.error);
    }
    const outcome = built.value;
    if (!isBuilt(outcome)) {
      await releaseLeaseQuietly(sponsor, lease);
      return Ok(outcome);
    }
    const { result } = outcome;
    try {
      const sponsorWitnessSet = await sponsor.signLeased(
        lease.leaseId,
        result.transaction,
      );
      return Ok({
        status: 'signed',
        result,
        built: outcome.built,
        sponsorKeyHash,
        sponsorWitnessSet,
      });
    } catch (error) {
      if (isRefusedBeforeWitness(error)) {
        await releaseLeaseQuietly(sponsor, lease);
      }
      if (attempt > 0 || !isSharedCollateralRefusal(error)) {
        return Err(persistentSponsorRefusalOf(error) ?? toError(error));
      }
    }
  }
};
