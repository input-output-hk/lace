import { describe, expect, it } from 'vitest';

import { assertBlockchain } from '../../src/shared/assert-blockchain';

describe('assertBlockchain', () => {
  it('passes when the actual blockchain matches the expected one', () => {
    expect(() => {
      assertBlockchain('Cardano', 'Cardano', 'Keystone');
    }).not.toThrow();
  });

  it('throws a device-labeled error on a blockchain mismatch', () => {
    expect(() => {
      assertBlockchain('Cardano', 'Bitcoin', 'Keystone');
    }).toThrow('Keystone only supports Cardano, got Bitcoin');
  });
});
