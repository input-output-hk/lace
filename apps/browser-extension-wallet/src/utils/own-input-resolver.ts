/* eslint-disable unicorn/no-null */
import { ObservableWallet } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { combineLatest, firstValueFrom, map } from 'rxjs';

export const createHistoricalOwnInputResolver = (wallet: ObservableWallet): Wallet.Cardano.InputResolver => ({
  resolveInput({ txId, index }: Wallet.Cardano.TxIn) {
    return firstValueFrom(
      combineLatest([wallet.transactions.history$, wallet.addresses$]).pipe(
        map(([txs, addresses]) => {
          for (const tx of txs) {
            if (txId !== tx.id) {
              continue;
            }
            const output = tx.body.outputs[index];

            if (!output) {
              console.error('Resolving utxo with invalid index', txId, index);
              return null;
            }
            if (addresses.some(({ address }) => address === output.address)) {
              return output;
            }
          }

          return null;
        })
      )
    );
  }
});
