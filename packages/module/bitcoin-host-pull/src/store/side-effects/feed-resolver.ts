import { ignoreElements, tap } from 'rxjs';

import type { SideEffect } from '../..';
import type { BitcoinWalletResolver } from '../../wallet-resolver';

/**
 * Keep the address → account resolver fed from wallet-repo state (host projection):
 * bitcoin-host-pull does NOT hydrate; it reads the Bitcoin accounts the
 * cardano-host-pull hydrator already projected. A `getUTxOs` call carries only
 * the queried address, so the resolver needs the current account set to map it
 * back to the (walletId, accountIndex) the host wire wants. Reacts to every
 * wallet-repo change (create/import/add-account) and emits no actions.
 */
export const feedBitcoinResolver =
  (resolver: BitcoinWalletResolver): SideEffect =>
  (_actions, { wallets: { selectActiveNetworkAccounts$ } }) =>
    selectActiveNetworkAccounts$.pipe(
      tap(accounts => {
        resolver.setAccounts(accounts);
      }),
      ignoreElements(),
    );
