import {
  GrantId,
  GrantScopeSalt,
  GrantSlot,
  TokenColor,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import {
  circuitScope,
  deriveGrantId,
  granteePoint,
  grantObjectCommit,
  originHash,
} from '../acc/grants';

import { storedGranteeScheme } from './types';

import type { SealedViews } from './rotation';
import type {
  PassportAccountRecord,
  StoredGrant,
  StoredGrantObject,
  StoredGrants,
  StoredGrantView,
} from './types';
import type { GrantOpenings, GrantSlots } from '../acc/read-grants';
import type {
  GranteeScheme,
  GrantRecord,
  GrantRecordPart,
  PassportAccountInfo,
} from '@lace-contract/passport';

/**
 * The slot each stored grant was derived under, keyed by id, as the
 * roster decoder takes them.
 */
export const storedGrantSlots = (
  stored: StoredGrants | undefined,
): GrantSlots =>
  new Map(
    Object.entries(stored ?? {}).map(([id, { slot }]) => [
      GrantId(id),
      GrantSlot(slot),
    ]),
  );

/**
 * The opening of each stored grant whose object fields were kept, keyed by
 * id, as the roster decoder attaches them. A read grant whose seal this
 * client holds carries it in the opening's view, with the `enc_key` whose
 * secret it seals.
 */
export const storedGrantOpenings = (
  stored: StoredGrants | undefined,
): GrantOpenings =>
  new Map(
    Object.entries(stored ?? {}).flatMap(([id, grant]) =>
      grant.object
        ? [
            [
              GrantId(id),
              {
                scopeSalt: GrantScopeSalt(grant.scopeSalt),
                granteeScheme: storedGranteeScheme(grant),
                granteePublicKey: grant.granteePublicKey,
                origin: grant.origin,
                color: TokenColor(grant.object.color),
                recipient: grant.object.recipient,
                maxCoinValue: grant.object.maxCoinValue,
                ...(grant.view?.seal === undefined ||
                grant.view.sealedEncKey === undefined
                  ? {}
                  : {
                      view: {
                        readPublicKey: grant.view.readPublicKey,
                        seal: grant.view.seal,
                        sealedEncKey: grant.view.sealedEncKey,
                      },
                    }),
              },
            ] as const,
          ]
        : [],
    ),
  );

/**
 * The stored grants with the view of one grant replaced: its read key
 * and, when given, the seal towards it of the secret of `sealedEncKey`.
 */
export const withStoredGrantView = (
  stored: StoredGrants,
  grantId: GrantId,
  view: StoredGrantView,
): StoredGrants => {
  const grant = stored[grantId];
  if (!grant) return stored;
  return { ...stored, [grantId]: { ...grant, view } };
};

/**
 * The read grants this client holds the read key of and the chain still
 * lists active, other than `except`: the grants a rotation seals the new
 * secret to again. A read grant issued by another client has no stored
 * key here, so it is not among them.
 */
export const liveStoredReadGrants = (
  stored: StoredGrants | undefined,
  roster: readonly GrantRecord[],
  except?: GrantId,
): { grantId: GrantId; readPublicKey: string }[] => {
  const active = new Set(
    roster
      .filter(record => record.active && record.scope.read)
      .map(({ id }) => id),
  );
  return Object.entries(stored ?? {}).flatMap(([id, grant]) =>
    grant.view && active.has(GrantId(id)) && id !== except
      ? [{ grantId: GrantId(id), readPublicKey: grant.view.readPublicKey }]
      : [],
  );
};

/**
 * The active read grants this client holds the read key of whose stored
 * seal does not hold the secret of `encKey`, the ledger's current one:
 * their grantees read nothing newer until a rotation seals to them again
 * or they are issued again. A read grant issued by another client has no
 * stored key here, so it is not among them.
 */
export const unsealedStoredReadGrants = (
  stored: StoredGrants | undefined,
  roster: readonly GrantRecord[],
  encKey: string,
): GrantId[] =>
  liveStoredReadGrants(stored, roster)
    .filter(({ grantId }) => stored?.[grantId]?.view?.sealedEncKey !== encKey)
    .map(({ grantId }) => grantId);

/** The stored grants with one more entry, under its grant id. */
export const withStoredGrant = (
  stored: StoredGrants | undefined,
  grantId: GrantId,
  grant: StoredGrant,
): StoredGrants => ({ ...stored, [grantId]: grant });

/**
 * The record a completed account persists: its identity, this device's
 * use counter, the grant bookkeeping when there is any, and the roster of
 * devices the account keys were sealed to when it is known. It never
 * carries a deployment, so a write of it completes a pending record.
 */
export const completedRecord = (
  {
    address,
    bindingVersion,
  }: Pick<PassportAccountInfo, 'address' | 'bindingVersion'>,
  localUseCounter: string,
  { grants }: Pick<PassportAccountRecord, 'grants'>,
): PassportAccountRecord => ({
  address,
  bindingVersion,
  localUseCounter,
  ...(grants ? { grants } : {}),
});

/**
 * The stored grants with the seals of a rotation applied: each sealed
 * grant's view carries its new seal and the `enc_key` it holds, and each
 * unsealed one keeps its read key alone.
 */
export const withSealedViews = (
  stored: StoredGrants | undefined,
  { sealed, unsealed }: Pick<SealedViews, 'sealed' | 'unsealed'>,
): StoredGrants | undefined => {
  if (!stored) return stored;
  let next = stored;
  for (const { grantId, readPublicKey, seal, sealedEncKey } of sealed) {
    next = withStoredGrantView(next, grantId, {
      readPublicKey,
      seal,
      sealedEncKey,
    });
  }
  for (const grantId of unsealed) {
    const readPublicKey = next[grantId]?.view?.readPublicKey;
    if (readPublicKey !== undefined) {
      next = withStoredGrantView(next, grantId, { readPublicKey });
    }
  }
  return next;
};

/** Where rebuilt bookkeeping is checked: the account and the origin its grants were issued under. */
export type BookkeepingScope = {
  address: string;
  origin: string;
  /** The ledger's `enc_key` as lowercase hex, which tells a current seal from a stale one. */
  encKey: string;
};

/** The parts of one grant's bookkeeping, newest of each kind. */
type GrantParts = {
  grant?: Extract<GrantRecordPart, { part: 'grant' }>;
  object?: Extract<GrantRecordPart, { part: 'object' }>;
  view?: Extract<GrantRecordPart, { part: 'view' }>;
};

/** Each grant's parts by id, the later of two parts of a kind winning. */
const partsByGrant = (
  parts: readonly GrantRecordPart[],
): Map<string, GrantParts> => {
  const byGrant = new Map<string, GrantParts>();
  for (const part of parts) {
    const held = byGrant.get(part.grantId) ?? {};
    byGrant.set(part.grantId, { ...held, [part.part]: part });
  }
  return byGrant;
};

/**
 * What a grant's on-chain commitments are opened from, whether rebuilt
 * from grant records or kept in the account record.
 */
type GrantOpeningFields = {
  slot: number;
  scopeSalt: string;
  granteeScheme: GranteeScheme;
  granteePublicKey: string;
  origin: string;
  object: StoredGrantObject;
  readPublicKey?: string;
};

/**
 * Whether a grant's bookkeeping opens its on-chain commitments under the
 * account at `address`: the id derives from the account, the grantee
 * key under its scheme, the origin and the slot, the object commitment
 * from the salt and the object fields, and the read key hashes to the
 * one the contract holds, or is absent for a grant that does not read.
 * Anyone can append any bytes to the inbox, and another client of the
 * account issuing to the same grantee from the same origin lands on the
 * same id with its own salt, so this check, not where the bookkeeping
 * came from, is what makes it trusted.
 */
const opensOnChain = async (
  record: GrantRecord,
  fields: GrantOpeningFields,
  address: string,
): Promise<boolean> => {
  try {
    const grantee = {
      scheme: fields.granteeScheme,
      publicKey: fields.granteePublicKey,
    };
    const grantId = deriveGrantId({
      contractAddress: ByteArray.fromHex(HexBytes(address)),
      granteePublicKey: granteePoint(grantee),
      originHash: await originHash(fields.origin),
      slot: GrantSlot(fields.slot),
    });
    const encoded = circuitScope({
      grantee,
      operations: [],
      color: TokenColor(fields.object.color),
      recipient: fields.object.recipient,
      maxCoinValue: fields.object.maxCoinValue,
      perCallCap: '0',
      cap: '0',
      expiresAt: null,
      ...(fields.readPublicKey === undefined
        ? {}
        : { readPublicKey: fields.readPublicKey }),
    });
    return (
      grantId === record.id &&
      grantObjectCommit(
        ByteArray.fromHex(HexBytes(fields.scopeSalt)),
        encoded,
      ) === record.scope.objectCommit &&
      HexBytes.fromByteArray(encoded.readPkHash) === record.scope.readPkHash &&
      (fields.readPublicKey !== undefined) === record.scope.read
    );
  } catch {
    return false;
  }
};

/**
 * The stored grants narrowed to the ones that still open what the chain
 * holds under their id, or undefined once none is left. A grant the
 * chain no longer holds is dropped, and so is one whose kept fields do
 * not open its commitments: the entry an issue wrote before a call that
 * never landed, once another client of the account issued over the same
 * id, or an entry written before the object fields were kept, which
 * cannot be checked. A revoked grant stays in the contract's map as a
 * tombstone, so its slot and salt are kept until a revoke-all clears the
 * map or a new grant overwrites the id.
 */
export const retainStoredGrants = async (
  stored: StoredGrants | undefined,
  roster: readonly GrantRecord[],
  address: string,
): Promise<StoredGrants | undefined> => {
  if (!stored) return undefined;
  const retained: StoredGrants = {};
  for (const record of roster) {
    const grant = stored[record.id];
    if (!grant?.object) continue;
    const isOpened = await opensOnChain(
      record,
      {
        ...grant,
        granteeScheme: storedGranteeScheme(grant),
        object: grant.object,
        ...(grant.view === undefined
          ? {}
          : { readPublicKey: grant.view.readPublicKey }),
      },
      address,
    );
    if (isOpened) retained[record.id] = grant;
  }
  return Object.keys(retained).length > 0 ? retained : undefined;
};

/**
 * The bookkeeping of grants this device issued, rebuilt from the grant
 * records it opened in the inbox, for the grants the chain still holds:
 * each grant whose parts open its on-chain commitments under this
 * account and origin, with its read key and, when the newest view record
 * holds the seal of the ledger's `enc_key`, that seal. A grant whose
 * parts do not check out, or whose grant or object part is missing, is
 * left out. Undefined when nothing is rebuilt.
 */
export const rebuildStoredGrants = async (
  parts: readonly GrantRecordPart[],
  roster: readonly GrantRecord[],
  scope: BookkeepingScope,
): Promise<StoredGrants | undefined> => {
  const byGrant = partsByGrant(parts);
  const rebuilt: StoredGrants = {};
  for (const record of roster) {
    const held = byGrant.get(record.id);
    if (!held?.grant || !held.object) continue;
    const { grant, object, view } = held;
    const isOpened = await opensOnChain(
      record,
      { ...grant, origin: scope.origin, object: object.object },
      scope.address,
    );
    if (!isOpened) continue;
    const readPublicKey = grant.readPublicKey;
    const isCurrent =
      view !== undefined && scope.encKey.startsWith(view.encKeyPrefix);
    rebuilt[record.id] = {
      slot: grant.slot,
      scopeSalt: grant.scopeSalt,
      granteeScheme: grant.granteeScheme,
      granteePublicKey: grant.granteePublicKey,
      origin: scope.origin,
      object: object.object,
      ...(readPublicKey === undefined
        ? {}
        : {
            view: isCurrent
              ? { readPublicKey, seal: view.seal, sealedEncKey: scope.encKey }
              : { readPublicKey },
          }),
    };
  }
  return Object.keys(rebuilt).length > 0 ? rebuilt : undefined;
};

/**
 * The record's bookkeeping with every rebuilt grant it lacks added: what
 * the record holds is kept, so a record that survived is never
 * overwritten by the chain's copy, except for a view whose seal is not of
 * `encKey`, the ledger's current one, when the rebuilt view's seal is:
 * the record write after a rotation can be lost while its seal reached
 * the inbox. Run over the bookkeeping {@link retainStoredGrants} checked,
 * a rebuilt grant takes the place of an entry that did not open.
 */
export const withRebuiltGrants = (
  stored: StoredGrants | undefined,
  rebuilt: StoredGrants | undefined,
  encKey: string,
): StoredGrants | undefined => {
  if (!rebuilt) return stored;
  const merged: StoredGrants = { ...rebuilt, ...stored };
  for (const [id, fromChain] of Object.entries(rebuilt)) {
    const held = stored?.[id];
    if (
      held &&
      held.view?.sealedEncKey !== encKey &&
      fromChain.view?.sealedEncKey === encKey
    ) {
      merged[id] = { ...held, view: fromChain.view };
    }
  }
  return merged;
};
