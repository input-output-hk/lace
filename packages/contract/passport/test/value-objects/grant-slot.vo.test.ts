import { describe, expect, it } from 'vitest';

import { GrantSlot, GrantSlotError } from '../../src/value-objects';

describe('GrantSlot', () => {
  it('accepts the bounds of the 8-bit range', () => {
    expect(GrantSlot(0)).toBe(0);
    expect(GrantSlot(255)).toBe(255);
  });

  it('rejects a negative slot', () => {
    expect(() => GrantSlot(-1)).toThrow(GrantSlotError);
  });

  it('rejects a slot above 255', () => {
    expect(() => GrantSlot(256)).toThrow(GrantSlotError);
  });

  it('rejects a fractional slot', () => {
    expect(() => GrantSlot(1.5)).toThrow(GrantSlotError);
  });
});
