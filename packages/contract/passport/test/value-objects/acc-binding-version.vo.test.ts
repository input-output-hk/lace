import { describe, expect, it } from 'vitest';

import { AccBindingVersion } from '../../src/value-objects';

describe('AccBindingVersion', () => {
  it('wraps the given version string', () => {
    expect(AccBindingVersion('1.0.0')).toBe('1.0.0');
  });
});
