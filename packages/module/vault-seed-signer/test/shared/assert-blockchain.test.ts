import { describe, expect, it } from 'vitest';

import { assertBlockchain } from '../../src/shared/assert-blockchain';

describe('assertBlockchain', () => {
  it('passes when the actual blockchain matches the expected one', () => {
    expect(() => {
      assertBlockchain('Cardano', 'Cardano', 'Seed signer');
    }).not.toThrow();
  });

  it('throws a device-labeled error on a blockchain mismatch', () => {
    expect(() => {
      assertBlockchain('Bitcoin', 'Cardano', 'Bitcoin seed signer');
    }).toThrow('Bitcoin seed signer only supports Bitcoin, got Cardano');
  });
});
