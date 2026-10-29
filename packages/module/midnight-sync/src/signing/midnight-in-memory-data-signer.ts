import { HexBytes } from '@lace-lib/util';
import { map, switchMap, take } from 'rxjs';

import type {
  MidnightWalletsByAccountId,
  MidnightDataSigner,
  MidnightSignDataRequest,
  MidnightSignDataResult,
} from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/** Signs arbitrary data using the Midnight unshielded key. No per-request auth needed —
 *  the wallet SDK manages key lifecycle via AccountKeyManager idle timeout. */
export class MidnightInMemoryDataSigner implements MidnightDataSigner {
  readonly #accountId: AccountId;

  readonly #wallets$: Observable<MidnightWalletsByAccountId>;

  public constructor(
    accountId: AccountId,
    wallets$: Observable<MidnightWalletsByAccountId>,
  ) {
    this.#accountId = accountId;
    this.#wallets$ = wallets$;
  }

  public signData(
    request: MidnightSignDataRequest,
  ): Observable<MidnightSignDataResult> {
    return this.#wallets$.pipe(
      take(1),
      switchMap(wallets => {
        const wallet = wallets[this.#accountId];
        if (!wallet) {
          throw new Error(
            `Could not load midnight wallet for account ${this.#accountId}`,
          );
        }
        return wallet.signData(request.data).pipe(
          map(({ signature, verifyingKey }) => ({
            signature: HexBytes(signature),
            verifyingKey: HexBytes(verifyingKey),
          })),
        );
      }),
    );
  }
}
