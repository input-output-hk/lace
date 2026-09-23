import { describe, expect, it } from 'vitest';

import { realfiProviderDependencyContract } from '../src/provider-contract';

describe('realfiProviderDependencyContract', () => {
  it('is a zero-or-more sideEffectDependency contract', () => {
    expect(realfiProviderDependencyContract.contractType).toBe(
      'sideEffectDependency',
    );
    expect(realfiProviderDependencyContract.instance).toBe('zero-or-more');
    expect(realfiProviderDependencyContract.name).toBe(
      'realfi-provider-dependency',
    );
  });
});
