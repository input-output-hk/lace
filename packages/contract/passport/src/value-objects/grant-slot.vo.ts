import type { Tagged } from 'type-fest';

const GRANT_SLOT_MAX = 255;

/**
 * Position of a grant in the Account Custody Contract's grants map, an
 * integer the contract stores as an 8-bit unsigned value.
 */
export type GrantSlot = Tagged<number, 'GrantSlot'>;

/**
 * Thrown when a value is not an integer between 0 and GRANT_SLOT_MAX.
 */
export class GrantSlotError extends Error {
  public readonly code = 'out-of-range' as const;

  public constructor(message: string) {
    super(message);
    this.name = 'GrantSlotError';
  }
}

/**
 * Checks that a number is an integer from 0 to 255 and types it as a grant
 * slot.
 *
 * @throws {@link GrantSlotError} when it is not.
 */
export const GrantSlot = (value: number): GrantSlot => {
  if (!Number.isInteger(value) || value < 0 || value > GRANT_SLOT_MAX) {
    throw new GrantSlotError(
      `GrantSlot expects an integer from 0 to ${GRANT_SLOT_MAX}, got ${value}`,
    );
  }
  return value as GrantSlot;
};
