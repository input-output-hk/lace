import type { Cardano } from '@cardano-sdk/core';
import type { HexBlob } from '@cardano-sdk/util';

/**
 * A fee UTxO the sponsor reserved for one account creation (fee mode).
 *
 * The creation spends {@link feeUtxo} as its only sponsor input, pays its
 * change to {@link sponsorAddress} and declares {@link collateralUtxo} as its
 * collateral, returned to {@link sponsorAddress}.
 */
export type CardanoCustodySponsorLease = {
  /** Names the lease in `signLeased` and `releaseLease`. */
  leaseId: string;
  /**
   * POSIX time in milliseconds when the lease lapses. The transaction's
   * validity upper bound may pass it only by the service's configured margin.
   */
  expiresAt: number;
  /** The leased fee UTxO. Its value is lovelace only. */
  feeUtxo: Cardano.Utxo;
  /**
   * The shared collateral UTxO at the time of the answer. It is not reserved
   * for the lease: the service can replace it, and then refuses the
   * transaction under the `uses_shared_collateral` rule.
   */
  collateralUtxo: Cardano.Utxo;
  /** The address the sponsor change and the collateral return pay. */
  sponsorAddress: Cardano.PaymentAddress;
  /**
   * The most the fee UTxO may be drawn down by, in lovelace: the creation's
   * fee, stake deposit and control output together.
   */
  maxSponsoredLovelace: bigint;
};

/**
 * The shared collateral UTxO lent to a transaction the account pays for
 * (collateral mode). The transaction spends no sponsor UTxO and pays nothing
 * to the sponsor.
 */
export type CardanoCustodySponsorCollateral = {
  /** The shared collateral UTxO. Its value is lovelace only. */
  collateralUtxo: Cardano.Utxo;
  /** The address the collateral return pays. */
  sponsorAddress: Cardano.PaymentAddress;
  /**
   * How far past the witness request the transaction's validity upper bound
   * may reach, in seconds.
   */
  validitySeconds: number;
};

/**
 * Funding for Cardano custody transactions, in the fee sponsor service's two
 * modes. Fee mode leases a sponsor UTxO that pays an account creation, and
 * serves nothing else. Collateral mode lends the shared collateral UTxO to
 * every other transaction, which the account pays for.
 *
 * The sponsor checks each transaction against its policy before it signs,
 * and it never submits. Every witness answer is transaction witness set CBOR
 * that holds one vkey witness, by the sponsor payment key, and nothing else.
 * The caller verifies the signature before it merges it.
 *
 * Implementations reject with {@link CardanoCustodySponsorError} when the
 * sponsor refuses a request.
 */
export interface CardanoCustodySponsor {
  /** Fee mode: reserves one fee UTxO for an account creation. */
  lease(): Promise<CardanoCustodySponsorLease>;
  /**
   * Fee mode: the sponsor witness set for an account creation built on the
   * lease. The service refuses any other transaction (`invalid_transaction`
   * under `sponsor_outflow_bounded`). The first witness consumes the lease.
   * The same transaction asked again on the consumed lease receives the
   * same witness set.
   */
  signLeased(leaseId: string, transaction: HexBlob): Promise<HexBlob>;
  /**
   * Fee mode: gives back a lease that issued no witness, so its fee UTxO is
   * free at once. Releasing a released lease succeeds; releasing a consumed
   * or expired lease rejects.
   */
  releaseLease(leaseId: string): Promise<void>;
  /** Collateral mode: the shared collateral UTxO and its terms. */
  collateral(): Promise<CardanoCustodySponsorCollateral>;
  /**
   * Collateral mode: the sponsor witness set for an account-paid transaction
   * that declares the shared collateral. The sponsor keys the witness by
   * transaction hash, so the same transaction always receives the same
   * witness set.
   */
  signCollateral(transaction: HexBlob): Promise<HexBlob>;
}

/**
 * A request to the fee sponsor service failed. The error never carries the
 * client's API key.
 *
 * `code` is the service's error code, such as `invalid_transaction`,
 * `lease_consumed`, `lease_expired`, `unknown_lease`, `quota_exceeded`,
 * `rate_limited`, `no_utxo_available`, `out_of_funds` or `unauthorized`.
 * It is `unexpected_response` when the answer is not one the service
 * documents: an error status without a service error body (for example from
 * a proxy), an unexpected success status, or a malformed success body.
 */
export class CardanoCustodySponsorError extends Error {
  /** The HTTP status of the answer. */
  public readonly status: number;
  public readonly code: string;
  /** The policy rule that refused the transaction, with `invalid_transaction`. */
  public readonly rule: string | undefined;
  /** The service's explanation, or what was wrong with an unexpected answer. */
  public readonly detail: string | undefined;

  public constructor({
    status,
    code,
    rule,
    detail,
  }: {
    status: number;
    code: string;
    rule?: string;
    detail?: string;
  }) {
    super(
      `Fee sponsor service answered ${status} ${code}${
        rule === undefined ? '' : ` (${rule})`
      }${detail === undefined ? '' : `: ${detail}`}`,
    );
    this.name = 'CardanoCustodySponsorError';
    this.status = status;
    this.code = code;
    this.rule = rule;
    this.detail = detail;
  }
}
