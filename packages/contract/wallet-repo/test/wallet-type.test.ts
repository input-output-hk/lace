import { describe, expect, it } from 'vitest';

import { WalletType } from '../src/wallet-type';
import { WalletType as StableWalletType } from '../src/wallet-type.stable';

describe('WalletType of the stable SDK build', () => {
  it('is every wallet type but the Cardano custody one, with the same values', () => {
    const { CardanoCustody, ...others } = WalletType;
    expect(CardanoCustody).toBe('CardanoCustody');
    expect({ ...StableWalletType }).toEqual(others);
  });
});
