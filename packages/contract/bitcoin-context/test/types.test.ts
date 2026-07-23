import { describe, expect, it } from 'vitest';

import type { BitcoinBip32AccountProps } from '../src/types';

describe('BitcoinBip32AccountProps (hardware account shape)', () => {
  it('accepts a watch-only account with only the native segwit key and an xfp', () => {
    const hardwareAccount: BitcoinBip32AccountProps = {
      accountIndex: 0,
      masterFingerprint: 'deadbeef',
      extendedAccountPublicKeys: {
        nativeSegWit: 'xpub-native-segwit',
      },
    };

    expect(hardwareAccount.extendedAccountPublicKeys.nativeSegWit).toBe(
      'xpub-native-segwit',
    );
    expect(hardwareAccount.extendedAccountPublicKeys.legacy).toBeUndefined();
    expect(hardwareAccount.masterFingerprint).toBe('deadbeef');
  });

  it('still accepts an in-memory account with every script type and no xfp', () => {
    const inMemoryAccount: BitcoinBip32AccountProps = {
      accountIndex: 0,
      extendedAccountPublicKeys: {
        nativeSegWit: 'xpub-native',
        legacy: 'xpub-legacy',
        segWit: 'xpub-segwit',
        taproot: 'xpub-taproot',
      },
    };

    expect(inMemoryAccount.masterFingerprint).toBeUndefined();
    expect(inMemoryAccount.extendedAccountPublicKeys.taproot).toBe(
      'xpub-taproot',
    );
  });
});
