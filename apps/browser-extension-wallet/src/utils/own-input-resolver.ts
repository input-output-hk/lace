/* eslint-disable unicorn/no-null */
import { ObservableWalletState } from '@hooks/useWalletState';
import { Wallet } from '@lace/cardano';
import { logger } from '@lace/common';

export type HistoricalOwnInputResolverArgs = Pick<ObservableWalletState, 'addresses'> & {
  transactions: Pick<ObservableWalletState['transactions'], 'history'>;
};

export const createHistoricalOwnInputResolver = ({
  transactions: { history: txs },
  addresses
}: HistoricalOwnInputResolverArgs): Wallet.Cardano.InputResolver => ({
  async resolveInput({ txId, index }: Wallet.Cardano.TxIn) {
    for (const tx of txs) {
      if (txId !== tx.id) {
        continue;
      }
      const output = tx.body.outputs[index];

      if (!output) {
        logger.error('Resolving utxo with invalid index', txId, index);
        return null;
      }
      if (addresses.some(({ address }) => address === output.address)) {
        return output;
      }
    }

    return null;
  }
});
