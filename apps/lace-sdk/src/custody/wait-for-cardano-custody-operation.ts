import { Cardano } from '@cardano-sdk/core';
import { UTXO_SYNC_CONFIRMATION_DEPTH } from '@lace-contract/cardano-context';
import { parseCustodyAccountTokenName } from '@lace-lib/cardano-custody';
import { Err, Ok } from '@lace-lib/util';
import { combineLatest, filter, firstValueFrom, map, timeout } from 'rxjs';

import { CardanoCustodyOperationExpiredError } from './cardano-custody-errors';
import { readCardanoCustodyAccount } from './cardano-custody-wallet';

import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { CardanoTransactionHistoryItem } from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Milliseconds, Result } from '@lace-lib/util';

export type WaitForCardanoCustodyOperationProps = {
  accountId: AccountId;
  /** The submitted transaction. */
  txId: Cardano.TransactionId;
  /** The transaction's upper validity bound, as its submission returned it. */
  invalidHereafter: Cardano.Slot;
  /** Gives up with a `TimeoutError` after this long; waits without limit when absent. */
  timeout?: Milliseconds;
};

type Settlement = 'expired' | 'settled' | undefined;

const isLaterThan = (
  candidate: CardanoTransactionHistoryItem,
  reference: CardanoTransactionHistoryItem,
): boolean =>
  candidate.blockNumber > reference.blockNumber ||
  (candidate.blockNumber === reference.blockNumber &&
    candidate.txIndex > reference.txIndex);

/** Whether an output holds a token of the account: its state NFT or a grant token. */
const holdsAccountToken = (
  [, output]: Cardano.Utxo,
  {
    accountValidatorHash,
    stakeScriptHash,
  }: { accountValidatorHash: string; stakeScriptHash: string },
): boolean =>
  [...(output.value.assets ?? [])].some(
    ([assetId, quantity]) =>
      quantity > 0n &&
      Cardano.AssetId.getPolicyId(assetId) === accountValidatorHash &&
      parseCustodyAccountTokenName(Cardano.AssetId.getAssetName(assetId))
        ?.stakeScriptHash === stakeScriptHash,
  );

/**
 * Waits until a submitted custody operation settles in the wallet, so the
 * next operation on the account can run. That needs the synced UTxOs to show
 * the account after the transaction. Every custody transaction recreates an
 * account token: an owner operation its control UTxO, a grant spend its
 * grant UTxO. So it has settled once a synced UTxO holding an account token
 * is the transaction's output, or, once the transaction is in the
 * account's history and no longer pending, the output of a later
 * transaction in that history. A transaction in history alone is not
 * enough: until the UTxOs are synced again they still hold the UTxOs it
 * spent, and a build on them fails.
 *
 * The wait ends with {@link CardanoCustodyOperationExpiredError} only once
 * the wallet has dropped the transaction's pending activity, the chain tip
 * is past its validity bound plus the depth the wallet allows its provider
 * to catch up, and the account's history does not hold it. The wallet drops
 * that activity only after a sync round that started past the bound found
 * the transaction nowhere; the account can then run operations again. A tip
 * past the bound alone is not enough: after a long time in the background,
 * the tip moves before the next sync round fetches the history, and a
 * confirmed transaction must not read as expired.
 */
export const waitForCardanoCustodyOperation = async (
  wallet: WalletWithCardanoCustody,
  {
    accountId,
    txId,
    invalidHereafter,
    timeout: timeoutMs,
  }: WaitForCardanoCustodyOperationProps,
): Promise<Result<{ txId: Cardano.TransactionId }, Error>> => {
  try {
    const { blockchainSpecific: account } = await readCardanoCustodyAccount(
      wallet,
      accountId,
    );
    const { cardanoContext, activities } = wallet.stateObservables;
    const settlement$ = combineLatest([
      cardanoContext.selectAccountUtxos$,
      cardanoContext.selectTransactionHistoryGroupedByAccount$,
      activities.selectPendingActivitiesByAccount$,
      cardanoContext.selectTip$,
    ]).pipe(
      map(
        ([
          utxosByAccount,
          historyByAccount,
          pendingByAccount,
          tip,
        ]): Settlement => {
          const tokenTxIds = (utxosByAccount[accountId] ?? [])
            .filter(utxo => holdsAccountToken(utxo, account))
            .map(([input]) => input.txId);
          if (tokenTxIds.includes(txId)) return 'settled';

          const history = historyByAccount[accountId] ?? [];
          const submitted = history.find(item => item.txId === txId);
          const isPending = (pendingByAccount[accountId] ?? []).some(
            activity => activity.activityId === txId,
          );
          if (!submitted) {
            return !isPending &&
              !!tip &&
              tip.slot > invalidHereafter + UTXO_SYNC_CONFIRMATION_DEPTH
              ? 'expired'
              : undefined;
          }
          // A UTxO a later transaction produced shows the sync is past this
          // one. Grant spends leave the control UTxO and other grants older.
          const isSyncedPast = tokenTxIds.some(tokenTxId => {
            const producer = history.find(item => item.txId === tokenTxId);
            return !!producer && isLaterThan(producer, submitted);
          });
          return !isPending && isSyncedPast ? 'settled' : undefined;
        },
      ),
      filter((settlement): settlement is 'expired' | 'settled' => !!settlement),
    );
    const settlement = await firstValueFrom(
      timeoutMs === undefined
        ? settlement$
        : settlement$.pipe(timeout({ first: timeoutMs })),
    );
    return settlement === 'expired'
      ? Err(new CardanoCustodyOperationExpiredError(txId, invalidHereafter))
      : Ok({ txId });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};
