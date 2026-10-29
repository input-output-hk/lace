import { Cardano } from '@cardano-sdk/core';
import { cardanoCustodyActivityMetadataOf } from '@lace-contract/cardano-context';
import { firstValueFrom } from 'rxjs';

import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { Activity } from '@lace-contract/activities';
import type {
  CardanoCustodyActivityMetadata,
  CardanoCustodyOperationKind,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Timestamp } from '@lace-lib/util';

/**
 * A custody operation this wallet submitted and has not seen settle or
 * expire. It carries what `waitForCardanoCustodyOperation` needs, so a wait
 * can resume from it after a restart.
 */
export type CardanoCustodyUnsettledOperation = {
  accountId: AccountId;
  txId: Cardano.TransactionId;
  /**
   * The kind of operation, or `unknown` for a submission the wallet
   * recorded before it kept the kind: a wait still resumes from the entry.
   */
  operation: CardanoCustodyOperationKind | 'unknown';
  /** The last slot the transaction may be included in. */
  invalidHereafter: Cardano.Slot;
  /** When this wallet recorded the submission. */
  submittedAt: Timestamp;
  /**
   * `pending` once the provider accepted the submission; `outcome-unknown`
   * when the submission did not answer in time, so the transaction may or
   * may not have reached the network. Either way it may still settle. A
   * submission recorded before the wallet kept the status is `pending`.
   */
  status: CardanoCustodyActivityMetadata['status'];
  /** The app's own reference, as given to the operation. */
  reference?: string;
};

const unsettledOperationOf = (
  activity: Activity,
): CardanoCustodyUnsettledOperation | undefined => {
  const custody = cardanoCustodyActivityMetadataOf(activity);
  if (!custody) return undefined;
  const {
    invalidHereafter,
    operation = 'unknown',
    status = 'pending',
    reference,
  } = custody;
  return {
    accountId: activity.accountId,
    txId: Cardano.TransactionId(activity.activityId),
    operation,
    invalidHereafter,
    submittedAt: activity.timestamp,
    status,
    ...(reference !== undefined && { reference }),
  };
};

/**
 * The custody operations this wallet submitted on the account and has not
 * seen settle or expire, newest first, as the wallet persists them: after a
 * restart, the app reconciles its own records against this list and resumes
 * `waitForCardanoCustodyOperation` from each entry. An operation leaves the
 * list once its transaction is in the account's synced history, or once the
 * wallet dropped it as expired. Pending transactions that are not custody
 * operations are left out, and an id that names no account lists nothing.
 */
export const readCardanoCustodyUnsettledOperations = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  accountId: AccountId,
): Promise<CardanoCustodyUnsettledOperation[]> => {
  const pendingByAccount = await firstValueFrom(
    wallet.stateObservables.activities.selectPendingActivitiesByAccount$,
  );
  return (pendingByAccount[accountId] ?? []).flatMap(activity => {
    const unsettled = unsettledOperationOf(activity);
    return unsettled ? [unsettled] : [];
  });
};
