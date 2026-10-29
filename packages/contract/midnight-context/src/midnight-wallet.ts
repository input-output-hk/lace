import { BehaviorSubject } from 'rxjs';

import type { MidnightWallet } from './types';
import type { ModuleInitProps } from '@lace-contract/module';
import type { AccountId } from '@lace-contract/wallet-repo';

export type MidnightWalletsByAccountId = Record<AccountId, MidnightWallet>;

const registries = new WeakMap<
  ModuleInitProps['runtime'],
  BehaviorSubject<MidnightWalletsByAccountId>
>();

/**
 * The engine's running wallets of one app instance, keyed by account. Every
 * module of an instance receives the same `runtime` object, so its modules
 * share one registry and separate instances never share theirs.
 */
export const midnightWalletsForRuntime = (
  runtime: ModuleInitProps['runtime'],
): BehaviorSubject<MidnightWalletsByAccountId> => {
  let wallets = registries.get(runtime);
  if (!wallets) {
    wallets = new BehaviorSubject<MidnightWalletsByAccountId>({});
    registries.set(runtime, wallets);
  }
  return wallets;
};
