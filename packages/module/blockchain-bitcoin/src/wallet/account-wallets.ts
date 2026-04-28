import { BehaviorSubject } from 'rxjs';

import type { BitcoinWallet } from './BitcoinWallet';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * A BehaviorSubject that holds a record of Bitcoin wallets associated with account IDs.
 * The keys are AccountId strings, and the values are BitcoinWallet instances.
 */
export const bitcoinAccountWallets$ = new BehaviorSubject<
  Record<AccountId, BitcoinWallet>
>({});
