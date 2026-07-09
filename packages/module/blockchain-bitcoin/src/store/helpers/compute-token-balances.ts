import type {
  BitcoinTransactionHistoryEntry,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';

const outpointKey = (ref: { txId: string; index: number }): string =>
  `${ref.txId}#${ref.index}`;

/**
 * Derives the confirmed (`available`) and unconfirmed (`pending`) BTC balances
 * for an account from its confirmed UTxO set and the transactions currently in
 * the mempool.
 *
 * - `available`: confirmed UTxOs **minus** any consumed by an unconfirmed
 *   transaction. Those are in-flight spent and no longer spendable, even though
 *   the provider still reports them as confirmed UTxOs until the next block.
 * - `pending`: value of unconfirmed outputs paying our own addresses — an
 *   incoming receive, or our own change from an outgoing send. These are
 *   recognised by the wallet but not yet finalised by the network.
 *
 * Deriving both from the same pending set avoids double-counting: on an
 * outgoing send the spent UTxO leaves `available` while its change appears in
 * `pending`, so `available + pending` reflects the true post-send balance.
 *
 * Outputs that are themselves spent by another mempool transaction (chained
 * mempool spends) are excluded from `pending` so they are not counted twice.
 */
export const computeBitcoinTokenBalances = ({
  confirmedUtxos,
  pendingTransactions,
  ownAddresses,
}: {
  confirmedUtxos: readonly BitcoinUTxO[];
  pendingTransactions: readonly BitcoinTransactionHistoryEntry[];
  ownAddresses: ReadonlySet<string>;
}): { available: bigint; pending: bigint } => {
  const spentOutpoints = new Set<string>();
  for (const tx of pendingTransactions) {
    for (const input of tx.inputs) {
      spentOutpoints.add(outpointKey(input));
    }
  }

  let available = 0n;
  for (const utxo of confirmedUtxos) {
    if (!spentOutpoints.has(outpointKey(utxo))) {
      available += BigInt(utxo.satoshis);
    }
  }

  let pending = 0n;
  for (const tx of pendingTransactions) {
    for (const [index, output] of tx.outputs.entries()) {
      const isOwn = ownAddresses.has(output.address);
      const isSpentByAnotherPendingTx = spentOutpoints.has(
        outpointKey({ txId: tx.transactionHash, index }),
      );
      if (isOwn && !isSpentByAnotherPendingTx) {
        pending += BigInt(output.satoshis);
      }
    }
  }

  return { available, pending };
};
