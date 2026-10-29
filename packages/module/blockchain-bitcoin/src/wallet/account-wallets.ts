import { BehaviorSubject } from 'rxjs';

import type { BitcoinWallet } from './BitcoinWallet';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * A BehaviorSubject that holds a record of Bitcoin wallets associated with account IDs.
 * The keys are AccountId strings, and the values are BitcoinWallet instances.
 * It is a single module-level subject, so every wallet loaded in the same
 * JavaScript realm registers its accounts here.
 */
export const bitcoinAccountWallets$ = new BehaviorSubject<
  Record<AccountId, BitcoinWallet>
>({});
