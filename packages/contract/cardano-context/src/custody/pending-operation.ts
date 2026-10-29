import type {
  CardanoCustodyAccountOperation,
  CardanoCustodyCreateOperation,
} from './build-transaction';
import type { Cardano } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';

/** The kind of custody transaction a submission runs. */
export type CardanoCustodyOperationKind =
  | CardanoCustodyAccountOperation['type']
  | CardanoCustodyCreateOperation['type'];

/**
 * What the pending activity of a submitted custody operation carries beside
 * its UTxO metadata. Only custody submissions set it.
 */
export type CardanoCustodyActivityMetadata = {
  /**
   * The transaction's upper validity bound. Past it the transaction can no
   * longer be included, so a pending activity the chain never settled is
   * dropped once the account has synced far enough beyond it.
   */
  invalidHereafter: Cardano.Slot;
  operation: CardanoCustodyOperationKind;
  /**
   * `pending` once the provider accepted the submission; `outcome-unknown`
   * when the submission did not answer in time, so the transaction may or
   * may not have reached the network.
   */
  status: 'outcome-unknown' | 'pending';
  /** The submitting app's own reference, such as a payment-intent id. */
  reference?: string;
};

/**
 * The custody metadata as the wallet persisted it. An activity recorded
 * before the operation and the status were kept carries only the validity
 * bound, so a reader must not count on either.
 */
type CardanoCustodyStoredActivityMetadata = Partial<
  Pick<CardanoCustodyActivityMetadata, 'operation' | 'status'>
> &
  Pick<CardanoCustodyActivityMetadata, 'invalidHereafter' | 'reference'>;

const isCustodyStatus = (
  value: unknown,
): value is CardanoCustodyActivityMetadata['status'] =>
  value === 'pending' || value === 'outcome-unknown';

/**
 * The custody metadata of a pending activity; absent on any other activity,
 * and on one whose custody entry has no validity bound. A field the entry
 * holds in another shape than the wallet writes is left out.
 */
export const cardanoCustodyActivityMetadataOf = (
  activity: Activity,
): CardanoCustodyStoredActivityMetadata | undefined => {
  const custody = (
    activity.blockchainSpecific as
      | { Cardano?: { custody?: unknown } }
      | undefined
  )?.Cardano?.custody;
  if (typeof custody !== 'object' || custody === null) return undefined;
  const { invalidHereafter, operation, status, reference } = custody as Record<
    string,
    unknown
  >;
  if (typeof invalidHereafter !== 'number') return undefined;
  return {
    invalidHereafter: invalidHereafter as Cardano.Slot,
    ...(typeof operation === 'string' && {
      operation: operation as CardanoCustodyOperationKind,
    }),
    ...(isCustodyStatus(status) && { status }),
    ...(typeof reference === 'string' && { reference }),
  };
};
