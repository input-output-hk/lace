import { BehaviorSubject } from 'rxjs';

import type { MidnightWallet } from './types';
import type { AccountId } from '@lace-contract/wallet-repo';

export type MidnightWalletsByAccountId = Record<AccountId, MidnightWallet>;

export const midnightWallets$ = new BehaviorSubject<MidnightWalletsByAccountId>(
  {},
);
