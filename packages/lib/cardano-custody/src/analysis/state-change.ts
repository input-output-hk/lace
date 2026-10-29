import type { CustodyAccountState } from '../codecs/account-state';
import type { HexBlob } from '@cardano-sdk/util';

/** A counter of the control state that a rewrite moves. */
interface CustodyCounterChange {
  readonly before: bigint;
  readonly after: bigint;
}

/**
 * What a device rewrite changes, from the decoded control states. Devices
 * compare by key hash and revoked slots by number; a reordering with no
 * other change shows only in `isReordered`. Grants live in their own UTxOs,
 * so a rewrite changes them only through its counters and revoked list.
 */
export interface CustodyStateChange {
  readonly before: CustodyAccountState;
  readonly after: CustodyAccountState;
  /** Present when the rewrite names another logic: an upgrade, which inspection refuses. */
  readonly logic?: {
    readonly before: HexBlob;
    readonly after: HexBlob;
  };
  readonly devicesAdded: readonly HexBlob[];
  readonly devicesRemoved: readonly HexBlob[];
  /** Slots the rewrite revokes, in the order the new state lists them. */
  readonly revokedAdded: readonly bigint[];
  /** Slots the rewrite takes off the revoked list, in the order the old state lists them. */
  readonly revokedRemoved: readonly bigint[];
  /** Present when the grant generation changes. */
  readonly grantGeneration?: CustodyCounterChange;
  /** Present when the next slot changes: grants were issued. */
  readonly nextSlot?: CustodyCounterChange;
  /** Present when the outstanding count changes: grants were issued or swept. */
  readonly outstanding?: CustodyCounterChange;
  /** Whether devices or revoked slots kept by both states appear in another order. */
  readonly isReordered: boolean;
}

const isSameOrder = <T>(before: readonly T[], after: readonly T[]): boolean => {
  const kept = before.filter(item => after.includes(item));
  const keptAfter = after.filter(item => before.includes(item));
  return kept.every((item, index) => item === keptAfter[index]);
};

const counterChange = (
  before: bigint,
  after: bigint,
): CustodyCounterChange | undefined =>
  before === after ? undefined : { before, after };

export const diffCustodyStates = (
  before: CustodyAccountState,
  after: CustodyAccountState,
): CustodyStateChange => {
  const generation = counterChange(
    before.grantGeneration,
    after.grantGeneration,
  );
  const nextSlot = counterChange(before.nextSlot, after.nextSlot);
  const outstanding = counterChange(before.outstanding, after.outstanding);
  return {
    before,
    after,
    ...(before.logic === after.logic
      ? {}
      : { logic: { before: before.logic, after: after.logic } }),
    devicesAdded: after.devices.filter(
      device => !before.devices.includes(device),
    ),
    devicesRemoved: before.devices.filter(
      device => !after.devices.includes(device),
    ),
    revokedAdded: after.revoked.filter(slot => !before.revoked.includes(slot)),
    revokedRemoved: before.revoked.filter(
      slot => !after.revoked.includes(slot),
    ),
    ...(generation ? { grantGeneration: generation } : {}),
    ...(nextSlot ? { nextSlot } : {}),
    ...(outstanding ? { outstanding } : {}),
    isReordered:
      !isSameOrder(before.devices, after.devices) ||
      !isSameOrder(before.revoked, after.revoked),
  };
};
