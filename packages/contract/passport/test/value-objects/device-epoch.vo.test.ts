import { describe, expect, it } from 'vitest';

import { DeviceEpoch } from '../../src/value-objects';

describe('DeviceEpoch', () => {
  it('wraps the given epoch value', () => {
    expect(DeviceEpoch(0n)).toBe(0n);
    expect(DeviceEpoch(3n)).toBe(3n);
  });
});
