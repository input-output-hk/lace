import { describe, expect, it } from 'vitest';

import { createWalletIdentity } from '../../src/exposed-modules/wallet-identity';

import type { AnyAccount } from '@lace-contract/wallet-repo';

const cardanoAccount = (xpub?: string): AnyAccount =>
  ({
    blockchainName: 'Cardano',
    blockchainSpecific: xpub ? { extendedAccountPublicKey: xpub } : {},
  } as unknown as AnyAccount);

describe('Cardano WalletIdentity', () => {
  const identity = createWalletIdentity();

  it('has the Cardano blockchain name', () => {
    expect(identity.blockchainName).toBe('Cardano');
  });

  it('returns the extended account public key as the identity key', () => {
    expect(identity.getAccountIdentityKey(cardanoAccount('xpub-abc'))).toBe(
      'xpub-abc',
    );
  });

  it('returns undefined when the account has no extended public key', () => {
    expect(identity.getAccountIdentityKey(cardanoAccount())).toBeUndefined();
  });

  it('returns undefined for non-Cardano accounts', () => {
    const bitcoinAccount = {
      blockchainName: 'Bitcoin',
      blockchainSpecific: { extendedAccountPublicKeys: {} },
    } as unknown as AnyAccount;
    expect(identity.getAccountIdentityKey(bitcoinAccount)).toBeUndefined();
  });
});
