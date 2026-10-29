import { defaultIfEmpty, firstValueFrom, map } from 'rxjs';

import type { ReadKeyScope } from './approved-read-keys';
import type { KeyValueStorageFactory } from '@lace-contract/module';

const COLLECTION_ID = 'passport-retired-enc-keys';

/**
 * What the signer keeps for one account on one network: the `enc_key`
 * values retired there, and the rotations it signed that no later session
 * has yet shown landed, each as the new key mapped to the key it replaces,
 * all lowercase hex.
 */
type NetworkKeys = { retired: string[]; pending: Record<string, string> };

/** Everything kept for one account, by network id. */
type AccountKeys = Record<string, NetworkKeys>;

/**
 * The `enc_key` values this signer saw an account rotate away from, by
 * account and network. `link` records a rotation the signer just signed,
 * from one key to the next, without retiring anything, since a signed
 * rotation may never land. `confirm` is told each key a later session's
 * keyring names: a key a pending rotation stepped to proves the chain
 * moved, and the key it replaced is then retired, with every key before
 * it along the chain of pending rotations, since the chain moved past all
 * of them. `isRetired` answers
 * whether a keyring names a retired key, which the signer then refuses.
 */
export type RetiredEncKeys = {
  link: (scope: ReadKeyScope, from: string, to: string) => Promise<void>;
  confirm: (scope: ReadKeyScope, encKey: string) => Promise<void>;
  isRetired: (scope: ReadKeyScope, encKey: string) => Promise<boolean>;
};

/**
 * The signer's own record of the keys it retired and the rotations it is
 * waiting to see land, public keys only, kept on the signer origin where
 * no dApp request writes. It grows by one key per rotation seen to land;
 * a fresh signer storage remembers nothing, so it guards only the
 * rotations made through it.
 */
export const createRetiredEncKeys = (
  createKeyValueStorage: KeyValueStorageFactory,
): RetiredEncKeys => {
  const storage = createKeyValueStorage<string, AccountKeys>({
    collectionId: COLLECTION_ID,
  });
  const read = async (account: string): Promise<AccountKeys> =>
    firstValueFrom(
      storage.getValues([account]).pipe(
        map(([stored]) => stored),
        defaultIfEmpty({}),
      ),
    );
  const update = async (
    { account, networkId }: ReadKeyScope,
    change: (current: NetworkKeys) => NetworkKeys,
  ): Promise<void> => {
    const stored = await read(account);
    await firstValueFrom(
      storage
        .setValue(account, {
          ...stored,
          [networkId]: change(
            stored[networkId] ?? { retired: [], pending: {} },
          ),
        })
        .pipe(defaultIfEmpty(void 0)),
    );
  };
  return {
    link: async (scope, from, to) =>
      update(scope, current => ({
        ...current,
        pending: { ...current.pending, [to]: from },
      })),
    confirm: async (scope, encKey) => {
      const stored = await read(scope.account);
      const pending = stored[scope.networkId]?.pending ?? {};
      const chain: string[] = [];
      for (
        let to = encKey, from = pending[to];
        from !== undefined && !chain.includes(from);
        to = from, from = pending[to]
      ) {
        chain.push(from);
      }
      if (chain.length === 0) return;
      const passed = new Set([encKey, ...chain]);
      await update(scope, ({ retired, pending: links }) => ({
        retired: [...new Set([...retired, ...chain])],
        pending: Object.fromEntries(
          Object.entries(links).filter(([to]) => !passed.has(to)),
        ),
      }));
    },
    isRetired: async ({ account, networkId }, encKey) =>
      (await read(account))[networkId]?.retired.includes(encKey) ?? false,
  };
};
