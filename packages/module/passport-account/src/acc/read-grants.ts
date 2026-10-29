import { GrantId, GrantSlot } from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';

import type { Ledger } from './acc-module';
import type {
  GrantOpening,
  GrantOperation,
  GrantRecord,
  GrantRecordScope,
} from '@lace-contract/passport';

/** A grant record as the generated ledger decoder presents it. */
type LedgerGrant = ReturnType<Ledger['grants']['lookup']>;

/**
 * The slice of the decoded Account Custody Contract ledger state the
 * roster reads: the grants map keyed by grant id.
 */
type GrantLedgerState = Pick<Ledger, 'grants'>;

/** Slot each grant this client issued was derived under, keyed by id. */
export type GrantSlots = ReadonlyMap<GrantId, GrantSlot>;

/** Opening of each grant this client issued and still holds, keyed by id. */
export type GrantOpenings = ReadonlyMap<GrantId, GrantOpening>;

const NO_SLOTS: GrantSlots = new Map();

const NO_OPENINGS: GrantOpenings = new Map();

/** The slot reported for a grant whose slot this client never learned. */
const UNKNOWN_SLOT = GrantSlot(0);

const toNumber = (field: string, value: bigint): number => {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Grant field ${field} exceeds the safe integer range`);
  }
  return Number(value);
};

const toOperations = (scope: LedgerGrant['scope']): GrantOperation[] => {
  const operations: GrantOperation[] = [];
  if (scope.op_withdraw_unshielded) operations.push('withdraw-unshielded');
  if (scope.op_withdraw_shielded) operations.push('withdraw-shielded');
  if (scope.op_withdraw_shielded_to_contract) {
    operations.push('withdraw-shielded-to-contract');
  }
  return operations;
};

const toScope = (scope: LedgerGrant['scope']): GrantRecordScope => ({
  operations: toOperations(scope),
  read: scope.read,
  objectCommit: HexBytes.fromByteArray(scope.object_commit),
  perCallCap: scope.per_call_cap.toString(),
  cap: scope.cap.toString(),
  expiresAt:
    scope.expires_at === 0n ? null : toNumber('expires_at', scope.expires_at),
  rpCommit: HexBytes.fromByteArray(scope.rp_commit),
  readPkHash: HexBytes.fromByteArray(scope.read_pk_hash),
  window:
    scope.window_len === 0n
      ? null
      : {
          lengthSeconds: toNumber('window_len', scope.window_len),
          cap: scope.window_cap.toString(),
        },
  callerCommit: HexBytes.fromByteArray(scope.caller_commit),
});

const toRecord = (
  id: GrantId,
  record: LedgerGrant,
  { slot, opening }: { slot: GrantSlot; opening?: GrantOpening },
): GrantRecord => ({
  id,
  slot,
  active: record.active,
  epoch: toNumber('epoch', record.epoch),
  generation: toNumber('gen', record.gen),
  issuedAt: toNumber('issued_at', record.issued_at),
  scope: toScope(record.scope),
  spentWindow: {
    start: toNumber('window_start', record.window_start),
    spent: record.window_spent.toString(),
  },
  ...(opening ? { opening } : {}),
});

/**
 * Decodes the account's grant roster from the ledger's grants map, in the
 * map's order. Plain fields decode to the read model's numbers and
 * decimal strings, commitments stay as hex, and an expiry or window of
 * zero reads as none. A revoked grant stays in the map as an inactive
 * tombstone and is listed as such. The contract stores no slot: the
 * caller supplies the slots of the grants it issued, and a grant issued by
 * another client of the account reports slot 0. The openings the caller
 * holds are attached to their grants.
 */
export const readGrants = (
  ledgerState: GrantLedgerState,
  slots: GrantSlots = NO_SLOTS,
  openings: GrantOpenings = NO_OPENINGS,
): GrantRecord[] =>
  Array.from(ledgerState.grants, ([rawId, record]) => {
    const id = GrantId(HexBytes.fromByteArray(rawId));
    return toRecord(id, record, {
      slot: slots.get(id) ?? UNKNOWN_SLOT,
      opening: openings.get(id),
    });
  });
