import { AccountId, HardwareWalletId } from '../value-objects';

import type { WalletEntity } from '../entities';
import type { WalletsState } from '../store';
import type { WalletId } from '../value-objects';
import type { PersistedState } from '@lace-contract/module';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

/**
 * Rewrites hardware wallet ids to the canonical descriptor encoding (Ledger
 * USB productIds carry app/firmware-dependent interface bits that are now
 * masked at id construction) and merges wallet entities that collapse into
 * the same id, so devices that were duplicated by a productId drift become a
 * single wallet again. Account ids embed the wallet id as their prefix, so
 * they are rewritten along with the walletId fields.
 */
export const normalizeHardwareWalletIds = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<WalletsState['wallets']>;
  if (!typedState.entities) return typedState;
  const renames = new Map<WalletId, WalletId>();
  for (const oldId of Object.keys(typedState.entities) as WalletId[]) {
    const descriptor = HardwareWalletId.parse(oldId);
    if (!descriptor) continue;
    const newId: WalletId = HardwareWalletId(descriptor);
    if (newId === oldId) continue;
    renames.set(oldId, newId);
    const wallet = typedState.entities[oldId];
    for (const account of wallet.accounts) {
      account.walletId = newId;
      account.accountId = AccountId(account.accountId.replace(oldId, newId));
    }
    const target = typedState.entities[newId];
    typedState.entities[newId] = target
      ? ({
          ...target,
          accounts: [
            ...target.accounts,
            ...wallet.accounts.filter(account =>
              target.accounts.every(
                existing => existing.accountId !== account.accountId,
              ),
            ),
          ],
        } as WalletEntity)
      : { ...wallet, walletId: newId };
    delete typedState.entities[oldId];
    if (typedState.activeAccountContext?.walletId === oldId) {
      typedState.activeAccountContext = {
        walletId: newId,
        accountId: AccountId(
          typedState.activeAccountContext.accountId.replace(oldId, newId),
        ),
      };
    }
  }
  if (renames.size > 0) {
    typedState.ids = [
      ...new Set(typedState.ids.map(id => renames.get(id) ?? id)),
    ];
  }
  return typedState;
};
