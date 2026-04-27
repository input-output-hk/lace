import { describe, it, expect } from 'vitest';

import { HandleType } from '../../src/value-objects';

import type { AddressAliasType } from '@lace-contract/addresses';

describe('HandleType', () => {
  it('returns "ADA_HANDLE" that is assignable to AddressAliasType', () => {
    const type: AddressAliasType = HandleType();
    expect(type).toBe('ADA_HANDLE');
  });
});
