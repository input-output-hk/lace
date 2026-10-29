import { MAX_GRANTS } from '@lace-contract/passport';
import { defaultIfEmpty, firstValueFrom, map } from 'rxjs';

import type { KeyValueStorageFactory } from '@lace-contract/module';

const COLLECTION_ID = 'passport-read-keys';

/** The account and network a read key belongs to. */
export type ReadKeyScope = { account: string; networkId: string };

/**
 * A read key the signer forgot because the user signed its grant's
 * revocation, with the hostname of the dApp origin that asked for the
 * revocation.
 */
type SignedRevocation = { readPublicKey: string; origin: string };

/**
 * What the signer keeps for one account on one network: the read key of
 * each live read grant the user approved, by grant id, and the read keys
 * of the grants whose revocation the user signed, by grant id, at most
 * the {@link MAX_GRANTS} latest.
 */
type NetworkReadKeys = {
  readKeys: Record<string, string>;
  signedRevocations?: Record<string, SignedRevocation>;
};

/** Everything kept for one account, by network id. */
type AccountReadKeys = Record<string, NetworkReadKeys>;

/**
 * The read keys the user approved read grants for on this signer, by
 * account and network. `remember` records the key of a grant the signer
 * just signed the issue of, and `isApproved` answers whether a grant was
 * approved with exactly that key, which is what a later rotation may seal
 * the new secret towards. `forget` drops one grant once its revocation is
 * signed and `forgetAll` every grant of an account once a revoke-all is,
 * on every network the account is kept under, since a revocation names
 * no network. Each forgotten key is marked as revoked for the origin that
 * asked for the revocation, when one was reported, and
 * `isRevocationSigned` answers whether that origin's grant was forgotten
 * so with exactly that key, which tells a revocation that never landed
 * from a key that was never approved. Neither answer makes a key
 * approved again; only a later `remember` does, and it clears the mark.
 */
export type ApprovedReadKeys = {
  remember: (
    scope: ReadKeyScope,
    grantId: string,
    readPublicKey: string,
  ) => Promise<void>;
  isApproved: (
    scope: ReadKeyScope,
    grantId: string,
    readPublicKey: string,
  ) => Promise<boolean>;
  forget: (
    account: string,
    grantId: string,
    origin: string | undefined,
  ) => Promise<void>;
  forgetAll: (account: string, origin: string | undefined) => Promise<void>;
  isRevocationSigned: (
    scope: ReadKeyScope,
    grantId: string,
    revocation: SignedRevocation,
  ) => Promise<boolean>;
};

/**
 * Moves the keys of the grants `isRevoked` names from the approved keys to
 * the signed revocations, marked for `origin`, keeping the
 * {@link MAX_GRANTS} latest marks; with no origin the keys are only
 * dropped.
 */
const withRevoked = (
  { readKeys, signedRevocations = {} }: NetworkReadKeys,
  isRevoked: (grantId: string) => boolean,
  origin: string | undefined,
): NetworkReadKeys => {
  const revoked = Object.entries(readKeys).filter(([grantId]) =>
    isRevoked(grantId),
  );
  const marked: [string, SignedRevocation][] =
    origin === undefined
      ? []
      : revoked.map(([grantId, readPublicKey]) => [
          grantId,
          { readPublicKey, origin },
        ]);
  const marks = [
    ...Object.entries(signedRevocations).filter(
      ([grantId]) => !marked.some(([markedId]) => markedId === grantId),
    ),
    ...marked,
  ];
  return {
    readKeys: Object.fromEntries(
      Object.entries(readKeys).filter(([grantId]) => !isRevoked(grantId)),
    ),
    signedRevocations: Object.fromEntries(marks.slice(-MAX_GRANTS)),
  };
};

/**
 * The signer's own record of which read keys the user approved: public
 * keys only, kept on the signer origin where no dApp request writes, so
 * a re-seal after a rotation can be held to keys that were shown at a
 * consent screen rather than to whatever the dApp's account record says.
 * It is kept per account, so it holds at most the account's live read
 * grants and a bounded number of revoked ones. A later approval for the
 * same grant id replaces the key and clears its revocation mark, since
 * the id is reused only once the earlier grant is gone.
 */
export const createApprovedReadKeys = (
  createKeyValueStorage: KeyValueStorageFactory,
): ApprovedReadKeys => {
  const storage = createKeyValueStorage<string, AccountReadKeys>({
    collectionId: COLLECTION_ID,
  });
  const read = async (account: string): Promise<AccountReadKeys> =>
    firstValueFrom(
      storage.getValues([account]).pipe(
        map(([stored]) => stored),
        defaultIfEmpty({}),
      ),
    );
  const write = async (
    account: string,
    value: AccountReadKeys,
  ): Promise<void> =>
    firstValueFrom(
      storage.setValue(account, value).pipe(defaultIfEmpty(void 0)),
    );
  const update = async (
    { account, networkId }: ReadKeyScope,
    change: (current: NetworkReadKeys) => NetworkReadKeys,
  ): Promise<void> => {
    const stored = await read(account);
    await write(account, {
      ...stored,
      [networkId]: change(stored[networkId] ?? { readKeys: {} }),
    });
  };
  const forgetWhere = async (
    account: string,
    isRevoked: (grantId: string) => boolean,
    origin: string | undefined,
  ): Promise<void> => {
    const stored = await read(account);
    await write(
      account,
      Object.fromEntries(
        Object.entries(stored).map(([networkId, kept]) => [
          networkId,
          withRevoked(kept, isRevoked, origin),
        ]),
      ),
    );
  };
  return {
    remember: async (scope, grantId, readPublicKey) =>
      update(scope, ({ readKeys, signedRevocations = {} }) => ({
        readKeys: { ...readKeys, [grantId]: readPublicKey },
        signedRevocations: Object.fromEntries(
          Object.entries(signedRevocations).filter(
            ([revoked]) => revoked !== grantId,
          ),
        ),
      })),
    isApproved: async ({ account, networkId }, grantId, readPublicKey) =>
      (await read(account))[networkId]?.readKeys[grantId] === readPublicKey,
    forget: async (account, grantId, origin) =>
      forgetWhere(account, revoked => revoked === grantId, origin),
    forgetAll: async (account, origin) =>
      forgetWhere(account, () => true, origin),
    isRevocationSigned: async (
      { account, networkId },
      grantId,
      { readPublicKey, origin },
    ) => {
      const mark = (await read(account))[networkId]?.signedRevocations?.[
        grantId
      ];
      return mark?.readPublicKey === readPublicKey && mark.origin === origin;
    },
  };
};
