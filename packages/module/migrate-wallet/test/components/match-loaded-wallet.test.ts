import { WalletId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import { matchLoadedWallet } from '../../src/components/match-loaded-wallet';

// Two distinct valid 24-word mnemonics.
const DESTINATION_WORDS =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'.split(
    ' ',
  );
const OTHER_WORDS =
  'legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth title'.split(
    ' ',
  );
const UNRELATED_WORDS =
  'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote'.split(
    ' ',
  );

const destinationWalletId = WalletId.deriveFromMnemonic(DESTINATION_WORDS);
const otherWalletId = WalletId.deriveFromMnemonic(OTHER_WORDS);

describe('matchLoadedWallet', () => {
  it('reports the destination when the phrase derives the wallet this migration created', () => {
    expect(
      matchLoadedWallet(DESTINATION_WORDS, {
        destinationWalletId,
        loadedWalletIds: [destinationWalletId, otherWalletId],
      }),
    ).toBe('destination');
  });

  it('reports another loaded wallet, which is a different mistake from entering the new phrase', () => {
    expect(
      matchLoadedWallet(OTHER_WORDS, {
        destinationWalletId,
        loadedWalletIds: [destinationWalletId, otherWalletId],
      }),
    ).toBe('other');
  });

  it('matches nothing when the phrase derives no loaded wallet', () => {
    expect(
      matchLoadedWallet(UNRELATED_WORDS, {
        destinationWalletId,
        loadedWalletIds: [destinationWalletId, otherWalletId],
      }),
    ).toBeUndefined();
  });

  it('matches nothing when no wallet is loaded', () => {
    expect(
      matchLoadedWallet(DESTINATION_WORDS, {
        destinationWalletId: undefined,
        loadedWalletIds: [],
      }),
    ).toBeUndefined();
  });

  // The destination is also in loadedWalletIds, so classification must not fall
  // through to 'other' just because the membership test would also match.
  it('prefers the destination over the generic loaded match', () => {
    expect(
      matchLoadedWallet(DESTINATION_WORDS, {
        destinationWalletId,
        loadedWalletIds: [destinationWalletId],
      }),
    ).toBe('destination');
  });

  // Pins the derivation itself: a change to how a walletId is derived from a
  // phrase would silently stop matching the ids wallet-repo actually registers.
  it('derives the same walletId the wallet repository registers', () => {
    expect(WalletId.deriveFromMnemonic(DESTINATION_WORDS)).toBe(
      '282583b3fa084d98ec89472610e60d99',
    );
  });
});
