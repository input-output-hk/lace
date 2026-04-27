import { midnightWallets$ } from '@lace-contract/midnight-context';
import { HexBytes } from '@lace-sdk/util';
import { map, switchMap, take } from 'rxjs';

import type {
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

  public constructor(accountId: AccountId) {
    this.#accountId = accountId;
  }

  public signData(
    request: MidnightSignDataRequest,
  ): Observable<MidnightSignDataResult> {
    return midnightWallets$.pipe(
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
