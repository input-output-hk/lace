import {
  SerialisedWalletState,
  UnreadableDustSnapshotError,
} from '@lace-contract/midnight-context';
import { coreStateOf as v1CoreState } from '@midnightntwrk/wallet-sdk/dust/v1';
import { coreStateOf as v2CoreState } from '@midnightntwrk/wallet-sdk/dust/v2';
import { Option } from 'effect';
import { defaultIfEmpty, firstValueFrom, defer, take, timeout } from 'rxjs';

import { getPendingDustNullifiersForReset } from './dust-sync';

import type {
  PendingDustNullifiersByAccount,
  MidnightSDKNetworkId,
  MidnightWalletsByAccountId,
  SerializedMidnightWallet,
} from '@lace-contract/midnight-context';
import type { CollectionStorage } from '@lace-contract/storage';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/** Include saved wallets and live reservations, which can precede submission and persistence. */
export const inspectDustSyncReset = (
  networkId: MidnightSDKNetworkId,
  accountIds: AccountId[],
  {
    storage,
    wallets$,
  }: {
    storage: Pick<CollectionStorage<SerializedMidnightWallet>, 'getAll'>;
    wallets$: Observable<MidnightWalletsByAccountId>;
  },
): Observable<PendingDustNullifiersByAccount> =>
  defer(async () => {
    const [saved, wallets] = await Promise.all([
      firstValueFrom(storage.getAll().pipe(defaultIfEmpty([]))),
      firstValueFrom(wallets$.pipe(take(1))),
    ]);
    const pending: PendingDustNullifiersByAccount = {};
    const inspect = (accountId: AccountId, snapshot: string) => {
      let reservations: string[];
      try {
        reservations = getPendingDustNullifiersForReset(snapshot);
      } catch (cause) {
        throw new UnreadableDustSnapshotError(accountId, cause);
      }
      if (reservations.length)
        pending[accountId] = [
          ...new Set([...(pending[accountId] ?? []), ...reservations]),
        ];
    };
    for (const wallet of saved) {
      if (wallet.networkId === networkId)
        inspect(
          wallet.accountId,
          SerialisedWalletState.toJSON(wallet.serializedState.dust),
        );
    }
    for (const wallet of Object.values(wallets)) {
      if (wallet.networkId !== networkId) continue;
      const { dust } = await firstValueFrom(
        wallet.state().pipe(take(1), timeout(10_000)),
      );
      const core = Option.getOrUndefined(v2CoreState(dust));
      if (!core) {
        if (Option.isNone(v1CoreState(dust)))
          throw new Error('Cannot inspect the live Dust variant');
        continue;
      }
      if (core.syncKind === 'projections' && core.pendingDust.length) {
        pending[wallet.accountId] = [
          ...new Set([
            ...(pending[wallet.accountId] ?? []),
            ...core.pendingDust.map(({ nullifier }) => String(nullifier)),
          ]),
        ];
      }
    }
    for (const accountId of accountIds) {
      if (
        wallets[accountId]?.networkId !== networkId &&
        !saved.some(
          wallet =>
            wallet.accountId === accountId && wallet.networkId === networkId,
        )
      )
        throw new Error('A wallet is not ready for the pending Dust check');
    }
    return pending;
  });
