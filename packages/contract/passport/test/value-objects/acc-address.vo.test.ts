import { describe, expect, it } from 'vitest';

import { AccAddress } from '../../src/value-objects';

describe('AccAddress', () => {
  it('wraps the given address string', () => {
    expect(AccAddress('acc1address')).toBe('acc1address');
  });
});
