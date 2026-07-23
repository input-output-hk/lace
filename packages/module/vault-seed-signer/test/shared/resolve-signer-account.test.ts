import { describe, expect, it } from 'vitest';

import { resolveSignerAccount } from '../../src/shared/resolve-signer-account';

import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';

const account = (overrides: Partial<AnyAccount> = {}): AnyAccount =>
  ({
    accountType: 'HardwareSeedSigner',
    blockchainName: 'Cardano',
    accountId: 'acc-1' as AccountId,
    ...overrides,
  } as AnyAccount);

const wallet = (accounts: AnyAccount[]): AnyWallet =>
  ({ accounts } as AnyWallet);

describe('resolveSignerAccount', () => {
  it('returns the matching account when the factory supports it', () => {
    const signerAccount = account();

    const resolved = resolveSignerAccount({
      wallet: wallet([signerAccount]),
      accountId: signerAccount.accountId,
      canSign: () => true,
      factoryName: 'TestFactory',
    });

    expect(resolved).toBe(signerAccount);
  });

  it('throws with the factory name when the account is missing', () => {
    expect(() =>
      resolveSignerAccount({
        wallet: wallet([]),
        accountId: 'missing' as AccountId,
        canSign: () => true,
        factoryName: 'TestFactory',
      }),
    ).toThrow('TestFactory does not support account type: unknown');
  });

  it('throws with the account type when the factory rejects it', () => {
    const signerAccount = account({
      accountType: 'InMemory',
    } as Partial<AnyAccount>);

    expect(() =>
      resolveSignerAccount({
        wallet: wallet([signerAccount]),
        accountId: signerAccount.accountId,
        canSign: () => false,
        factoryName: 'TestFactory',
      }),
    ).toThrow('TestFactory does not support account type: InMemory');
  });
});
