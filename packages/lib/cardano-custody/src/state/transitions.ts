// Ported from Biglup/cardano-account-custody-contract offchain/src/state.ts at
// revision b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for
// Lace: each transformation checks what it introduces and returns a typed
// result; revoke and replace require a current grant, a sweep prunes the
// slots it burns from the revoked list, the last usable device cannot be
// removed, devices never hold grants, and an agent key holds at most one
// current grant.

import { custodyGrantLiveness } from '../classify';
import { isHash28Hex } from '../hex';
import { fail, ok } from '../result';
import { CUSTODY_SLOT_LIMIT } from '../tokens';

import {
  CUSTODY_MAX_DEVICES,
  CUSTODY_MAX_GRANT_BATCH,
  CUSTODY_MAX_GRANTS,
  CUSTODY_MAX_REVOKED,
  findCustodyGrantViolations,
  isCustodyGrantCurrent,
  isCustodyGrantExpired,
} from './rules';

import type { CustodyGrantLiveness } from '../classify';
import type {
  CustodyAccountState,
  CustodyGrant,
  CustodyScope,
} from '../codecs/account-state';
import type { CustodyResult } from '../result';
import type { CustodyGrantViolation } from './rules';
import type { HexBlob } from '@cardano-sdk/util';

export type CustodyStateTransitionError =
  | {
      readonly code: 'device-is-grantee';
      readonly device: HexBlob;
      readonly slots: readonly bigint[];
    }
  | {
      readonly code: 'grant-expired';
      readonly expiresAt: bigint;
      readonly slot: bigint;
    }
  /** Revoke and replace need a grant the contract would still let its grantee spend. */
  | {
      readonly code: 'grant-not-current';
      readonly liveness: CustodyGrantLiveness;
      readonly slot: bigint;
    }
  /** A sweep needs every grant dead against the state before the sweep. */
  | {
      readonly code: 'grant-not-dead';
      readonly liveness: CustodyGrantLiveness;
      readonly slot: bigint;
    }
  /**
   * The grantee already holds the current grant in `slot`. An agent key
   * holds one current grant; replace that grant to change its scope.
   */
  | {
      readonly code: 'grantee-has-grant';
      readonly grantee: HexBlob;
      readonly slot: bigint;
    }
  | {
      readonly code: 'invalid-grant';
      readonly violations: readonly CustodyGrantViolation[];
    }
  | {
      readonly code: 'sweep-batch-limit';
      readonly count: number;
      readonly limit: number;
    }
  | { readonly code: 'device-already-listed'; readonly device: HexBlob }
  | { readonly code: 'device-limit'; readonly limit: number }
  | { readonly code: 'device-not-listed'; readonly device: string }
  | { readonly code: 'duplicate-grant-slot'; readonly slot: bigint }
  /** The account holds `CUSTODY_MAX_GRANTS` outstanding grants; sweep dead ones first. */
  | { readonly code: 'grant-limit'; readonly limit: number }
  | { readonly code: 'grant-not-found'; readonly slot: bigint }
  | { readonly code: 'grantee-is-device'; readonly grantee: HexBlob }
  | { readonly code: 'invalid-device-key-hash'; readonly device: string }
  | { readonly code: 'invalid-logic-hash'; readonly logic: string }
  /** `now` is NaN or infinite, so no expiry can be judged against it. */
  | { readonly code: 'invalid-now'; readonly now: number }
  /** No usable device key would remain to authorise owner operations. */
  | { readonly code: 'last-device'; readonly device: HexBlob }
  /** The revoked list holds `CUSTODY_MAX_REVOKED` slots; sweep revoked grants to prune it. */
  | { readonly code: 'revoked-list-full'; readonly limit: number }
  /** Every slot a grant token name can carry has been issued. */
  | { readonly code: 'slot-space-exhausted'; readonly nextSlot: bigint }
  | { readonly code: 'sweep-empty' };

export interface CustodyGrantRequest {
  readonly grantee: HexBlob;
  readonly scope: CustodyScope;
  /** Finite POSIX milliseconds; the grant must expire after this instant. */
  readonly now: number;
}

interface ReplaceCustodyGrantRequest extends CustodyGrantRequest {
  /** The slot of the current grant the new one replaces. */
  readonly slot: bigint;
}

/** A state that issues one grant, and the datum of the grant UTxO it issues. */
export interface IssuedCustodyGrant {
  readonly state: CustodyAccountState;
  readonly grant: CustodyGrant;
}

/** A state after a sweep, and the time the sweep's validity must start after. */
interface SweptCustodyGrants {
  readonly state: CustodyAccountState;
  /**
   * POSIX milliseconds the sweep transaction's validity interval must start
   * strictly after: the latest expiry among grants dead by expiry alone.
   * Absent when every swept grant is superseded or revoked.
   */
  readonly startsAfter?: bigint;
}

/**
 * The state Lace creates an account with: `logic` as its rules, the creator
 * as the only device, generation zero and zero counters. The logic accepts
 * any generation at creation; consent refuses every other initial state.
 *
 * @param logic - the applied hash of the logic the account runs, normally the
 *   contract version's `currentLogicHash`
 */
export const createInitialCustodyAccountState = (
  creatorKeyHash: string,
  logic: string,
): CustodyResult<CustodyAccountState, CustodyStateTransitionError> => {
  if (!isHash28Hex(logic)) return fail({ code: 'invalid-logic-hash', logic });
  return isHash28Hex(creatorKeyHash)
    ? ok({
        logic,
        devices: [creatorKeyHash],
        grantGeneration: 0n,
        nextSlot: 0n,
        revoked: [],
        outstanding: 0n,
      })
    : fail({ code: 'invalid-device-key-hash', device: creatorKeyHash });
};

/** Checks a grant Lace is about to write: authoring rules, expiry, separation. */
const checkAuthoredGrant = (
  state: CustodyAccountState,
  grant: CustodyGrant,
  now: number,
): CustodyStateTransitionError | undefined => {
  const violations = findCustodyGrantViolations(grant);
  if (violations.length > 0) return { code: 'invalid-grant', violations };
  if (!Number.isFinite(now)) return { code: 'invalid-now', now };
  if (isCustodyGrantExpired(grant, now)) {
    return {
      code: 'grant-expired',
      slot: grant.slot,
      expiresAt: grant.scope.expiresAt,
    };
  }
  if (state.devices.includes(grant.grantee)) {
    return { code: 'grantee-is-device', grantee: grant.grantee };
  }
  return undefined;
};

/**
 * Refuses a grantee that still holds a grant it could spend. One grant per
 * agent key keeps each agent's authority in one place, so a revocation or a
 * replacement always covers all of it. A grant judged against an older
 * state than its own counts too: it is in flight and about to be current.
 */
const checkGranteeHoldsNoCurrentGrant = (
  state: CustodyAccountState,
  grants: readonly CustodyGrant[],
  { grantee, now }: { grantee: HexBlob; now: number },
): CustodyStateTransitionError | undefined => {
  const held = grants.find(grant => {
    if (grant.grantee !== grantee) return false;
    const liveness = custodyGrantLiveness(grant, state, now);
    return liveness === 'current' || liveness === 'future-generation';
  });
  return held
    ? { code: 'grantee-has-grant', grantee, slot: held.slot }
    : undefined;
};

/**
 * Issues one grant in the state's next slot under its current generation:
 * the next slot and the outstanding count move by one, and the result
 * carries the datum of the new grant UTxO.
 *
 * @param grants - every grant of the account, from its grant UTxOs and from
 *   issues still in flight, to keep one current grant per agent key
 */
export const issueCustodyGrant = (
  state: CustodyAccountState,
  { grantee, scope, now }: CustodyGrantRequest,
  grants: readonly CustodyGrant[],
): CustodyResult<IssuedCustodyGrant, CustodyStateTransitionError> => {
  if (state.nextSlot >= CUSTODY_SLOT_LIMIT) {
    return fail({ code: 'slot-space-exhausted', nextSlot: state.nextSlot });
  }
  const grant: CustodyGrant = {
    slot: state.nextSlot,
    grantee,
    generation: state.grantGeneration,
    scope,
  };
  const error =
    checkAuthoredGrant(state, grant, now) ??
    checkGranteeHoldsNoCurrentGrant(state, grants, { grantee, now });
  if (error) return fail(error);
  if (state.outstanding >= BigInt(CUSTODY_MAX_GRANTS)) {
    return fail({ code: 'grant-limit', limit: CUSTODY_MAX_GRANTS });
  }
  return ok({
    state: {
      ...state,
      nextSlot: state.nextSlot + 1n,
      outstanding: state.outstanding + 1n,
    },
    grant,
  });
};

/**
 * Revokes the current grant in `slot` by appending the slot to the revoked
 * list. The grant UTxO stays until a sweep burns its token.
 *
 * @param grants - every grant of the account; the one in `slot` must be current
 */
export const revokeCustodyGrant = (
  state: CustodyAccountState,
  slot: bigint,
  grants: readonly CustodyGrant[],
): CustodyResult<CustodyAccountState, CustodyStateTransitionError> => {
  const grant = grants.find(candidate => candidate.slot === slot);
  if (!grant) return fail({ code: 'grant-not-found', slot });
  if (!isCustodyGrantCurrent(grant, state)) {
    return fail({
      code: 'grant-not-current',
      slot,
      // A grant that is not current is dead whatever the time.
      liveness: custodyGrantLiveness(grant, state, 0),
    });
  }
  if (state.revoked.length >= CUSTODY_MAX_REVOKED) {
    return fail({ code: 'revoked-list-full', limit: CUSTODY_MAX_REVOKED });
  }
  return ok({ ...state, revoked: [...state.revoked, slot] });
};

/**
 * Revokes the current grant in `request.slot` and issues its replacement in
 * the next slot, in one state. Both happen in one transaction; the old
 * grant UTxO stays until a later sweep.
 *
 * @param grants - every grant of the account, as for `issueCustodyGrant`
 */
export const replaceCustodyGrant = (
  state: CustodyAccountState,
  { slot, ...request }: ReplaceCustodyGrantRequest,
  grants: readonly CustodyGrant[],
): CustodyResult<IssuedCustodyGrant, CustodyStateTransitionError> => {
  const revoked = revokeCustodyGrant(state, slot, grants);
  return revoked.ok
    ? issueCustodyGrant(revoked.value, request, grants)
    : revoked;
};

/** Kills every grant: the generation moves on and the revoked list clears. */
export const revokeAllCustodyGrants = (
  state: CustodyAccountState,
): CustodyAccountState => ({
  ...state,
  grantGeneration: state.grantGeneration + 1n,
  revoked: [],
});

/**
 * Sweeps dead grants: their tokens burn, the outstanding count drops, and
 * their slots leave the revoked list. Pruning is safe because slots are never
 * reissued, and it keeps the list from filling up. Each grant must be dead
 * against `state`, the state before the sweep.
 *
 * @param grants - the grants to sweep, at most `CUSTODY_MAX_GRANT_BATCH`
 * @param now - POSIX milliseconds; a grant dead by expiry alone must have
 *   expired strictly before it, so a validity interval can start after the
 *   expiry
 */
export const sweepCustodyGrants = (
  state: CustodyAccountState,
  grants: readonly CustodyGrant[],
  now: number,
): CustodyResult<SweptCustodyGrants, CustodyStateTransitionError> => {
  if (!Number.isFinite(now)) return fail({ code: 'invalid-now', now });
  if (grants.length === 0) return fail({ code: 'sweep-empty' });
  if (grants.length > CUSTODY_MAX_GRANT_BATCH) {
    return fail({
      code: 'sweep-batch-limit',
      count: grants.length,
      limit: CUSTODY_MAX_GRANT_BATCH,
    });
  }
  const slots = new Set<bigint>();
  let startsAfter: bigint | undefined;
  for (const grant of grants) {
    if (slots.has(grant.slot)) {
      return fail({ code: 'duplicate-grant-slot', slot: grant.slot });
    }
    slots.add(grant.slot);
    const liveness = custodyGrantLiveness(grant, state, now);
    const { expiresAt } = grant.scope;
    const isSweepable =
      liveness === 'superseded' ||
      liveness === 'revoked' ||
      (liveness === 'expired' && expiresAt < BigInt(Math.floor(now)));
    if (!isSweepable) {
      return fail({ code: 'grant-not-dead', slot: grant.slot, liveness });
    }
    if (
      liveness === 'expired' &&
      (startsAfter === undefined || expiresAt > startsAfter)
    ) {
      startsAfter = expiresAt;
    }
  }
  return ok({
    state: {
      ...state,
      revoked: state.revoked.filter(slot => !slots.has(slot)),
      outstanding: state.outstanding - BigInt(grants.length),
    },
    ...(startsAfter !== undefined && { startsAfter }),
  });
};

/**
 * Lists a new device key. Every device has full owner authority, so a key
 * that holds a current grant is refused: removing the device later would
 * leave the grant in force.
 *
 * @param grants - every grant of the account
 */
export const addCustodyDevice = (
  state: CustodyAccountState,
  device: string,
  grants: readonly CustodyGrant[],
): CustodyResult<CustodyAccountState, CustodyStateTransitionError> => {
  if (!isHash28Hex(device)) {
    return fail({ code: 'invalid-device-key-hash', device });
  }
  if (state.devices.includes(device)) {
    return fail({ code: 'device-already-listed', device });
  }
  if (state.devices.length >= CUSTODY_MAX_DEVICES) {
    return fail({ code: 'device-limit', limit: CUSTODY_MAX_DEVICES });
  }
  const slots = grants
    .filter(
      grant => grant.grantee === device && isCustodyGrantCurrent(grant, state),
    )
    .map(grant => grant.slot);
  if (slots.length > 0) {
    return fail({ code: 'device-is-grantee', device, slots });
  }
  return ok({ ...state, devices: [...state.devices, device] });
};

/**
 * Removes a device key. Refuses when no well-formed device key would remain,
 * because the account would then accept no owner operation ever again. Grants
 * held by the same key stay in force.
 */
export const removeCustodyDevice = (
  state: CustodyAccountState,
  device: string,
): CustodyResult<CustodyAccountState, CustodyStateTransitionError> => {
  const listed = state.devices.find(existing => existing === device);
  if (listed === undefined) {
    return fail({ code: 'device-not-listed', device });
  }
  const devices = state.devices.filter(existing => existing !== device);
  if (!devices.some(remaining => isHash28Hex(remaining))) {
    return fail({ code: 'last-device', device: listed });
  }
  return ok({ ...state, devices });
};
