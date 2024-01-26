/* eslint-disable unicorn/no-null */
import { Wallet } from '@lace/cardano';
import { Observable, combineLatest, firstValueFrom, map } from 'rxjs';

interface Args {
  transactionsHistory$: Observable<Wallet.Cardano.HydratedTx[]>;
  addresses$: Observable<Wallet.WalletAddress[]>;
}

export const createHistoricalOwnInputResolver = ({
  transactionsHistory$,
  addresses$
}: Args): Wallet.Cardano.InputResolver => ({
  resolveInput({ txId, index }: Wallet.Cardano.TxIn) {
    return firstValueFrom(
      combineLatest([transactionsHistory$, addresses$]).pipe(
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
