import { Serialization } from '@cardano-sdk/core';
import { derivePendingActivityFromCbor } from '@lace-contract/cardano-context';
import { Err, Ok } from '@lace-lib/util';
import { TimeoutError } from 'rxjs';

import { submitCardanoTx } from '../submit-cardano-tx';

import { CardanoCustodyOutcomeUnknownError } from './cardano-custody-errors';
import {
  custodyInputRolesOf,
  staleSubmissionErrorOf,
} from './cardano-custody-stale-answers';

import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { Cardano } from '@cardano-sdk/core';
import type {
  CardanoCustodyActivityMetadata,
  CardanoCustodyOperationKind,
  CardanoPaymentAddress,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { HexBytes, Result } from '@lace-lib/util';

/** A custody transaction the provider accepted. */
export type CardanoCustodySubmission = {
  txId: Cardano.TransactionId;
  /**
   * The last slot the transaction may be included in. Pass it to
   * `waitForCardanoCustodyOperation`.
   */
  invalidHereafter: Cardano.Slot;
  /**
   * The slot of the grant an `issue-grant` or `replace-grant` operation
   * issues. Once the operation settles, pass it to
   * `exportCardanoCustodyAgentPolicy`. Absent for every other operation.
   */
  grantSlot?: bigint;
};

type SubmitCardanoCustodyTransactionProps = {
  signedTransaction: HexBytes;
  accountId: AccountId;
  /** The custody account's address. */
  address: Cardano.PaymentAddress;
  /** Every UTxO the transaction spends or references, the account's included. */
  resolvedInputs: readonly Cardano.Utxo[];
  invalidHereafter: Cardano.Slot;
  operation: CardanoCustodyOperationKind;
  /** The caller's own reference, kept on the pending activity. */
  reference?: string;
};

/**
 * Records a submitted custody transaction as the account's pending activity,
 * derived from the signed bytes, so the in-flight view drops the control,
 * grant and fund UTxOs it spends at once. The activity carries the
 * transaction's upper validity bound, so the wallet drops it once the
 * transaction can no longer settle, whether or not anyone waits for it, and
 * whether a device or an agent authorised it. It also carries the operation,
 * the submission status and the caller's reference, so the operation can be
 * listed and reconciled after a restart.
 */
const recordPendingActivity = (
  wallet: WalletWithCardanoCustody,
  {
    signedTransaction,
    accountId,
    address,
    resolvedInputs,
    invalidHereafter,
    operation,
    reference,
  }: SubmitCardanoCustodyTransactionProps,
  status: CardanoCustodyActivityMetadata['status'],
): void => {
  try {
    const activity = derivePendingActivityFromCbor({
      serializedTx: signedTransaction,
      accountId,
      accountAddresses: [address as unknown as CardanoPaymentAddress],
      accountUtxos: resolvedInputs.filter(
        ([, output]) => output.address === address,
      ),
      custody: {
        invalidHereafter,
        operation,
        status,
        ...(reference !== undefined && { reference }),
      },
    });
    if (activity) {
      wallet.dispatch('activities.upsertActivities', {
        accountId,
        activities: [activity],
      });
    }
  } catch {
    // The provider may have accepted the transaction, so this answer must
    // not read as a failure. Without the activity, the builder's own chain
    // read still refuses to build on the spent control UTxO.
  }
};

/**
 * Submits a signed custody transaction and records it as the account's
 * pending activity, so builds for the account wait until it settles.
 *
 * A submission that does not answer in time has an unknown outcome: the
 * transaction may still settle, so it is recorded as pending all the same,
 * and the answer is {@link CardanoCustodyOutcomeUnknownError}. A refused
 * submission records nothing. A refusal because inputs are no longer on
 * chain answers the typed error for the input that moved: the control
 * UTxO, a grant UTxO or funds.
 */
export const submitCardanoCustodyTransaction = async (
  wallet: WalletWithCardanoCustody,
  props: SubmitCardanoCustodyTransactionProps,
): Promise<Result<CardanoCustodySubmission, Error>> => {
  const { signedTransaction, accountId, invalidHereafter } = props;
  const txId = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(signedTransaction),
  ).getId();
  const submitted = await submitCardanoTx(wallet, {
    serializedTx: signedTransaction,
  });
  if (submitted.isErr()) {
    if (!(submitted.error instanceof TimeoutError)) {
      return Err(
        staleSubmissionErrorOf(
          submitted.error,
          custodyInputRolesOf(
            signedTransaction,
            props.resolvedInputs,
            props.address,
          ),
        ) ?? submitted.error,
      );
    }
    recordPendingActivity(wallet, props, 'outcome-unknown');
    return Err(
      new CardanoCustodyOutcomeUnknownError(accountId, {
        txId,
        invalidHereafter,
      }),
    );
  }
  recordPendingActivity(wallet, props, 'pending');
  return Ok({ txId, invalidHereafter });
};
