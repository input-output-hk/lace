import { describe, expect, it } from 'vitest';

import { UseCounter } from '../../src/value-objects';

describe('UseCounter', () => {
  it('wraps the given counter value', () => {
    expect(UseCounter(0n)).toBe(0n);
    expect(UseCounter(42n)).toBe(42n);
  });
});
