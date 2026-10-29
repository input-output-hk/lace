import { WalletId } from '@lace-contract/wallet-repo';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  createLazyAccountsFromAccountPublicKey,
  initializeWallet,
} from '../src/in-memory-wallet-integration';

const words =
  'fame coconut utility print giraffe common twin evil alone exclude great echo since cart erode noise icon repair amused drip awake coral hat unveil'.split(
    ' ',
  );

describe('lazy in-memory wallet integration', () => {
  it('discards its unlock passphrase after deriving the public account', async () => {
    const passphrase = new Uint8Array(32).fill(7);
    const random = vi
      .spyOn(crypto, 'getRandomValues')
      .mockImplementationOnce(() => passphrase);
    try {
      const result = await initializeWallet(
        {
          walletId: WalletId.deriveFromMnemonic(words),
          recoveryPhrase: words,
          walletName: 'Preprod',
          order: 0,
        },
        { logger: dummyLogger },
      );
      expect(result.accounts.length).toBeGreaterThan(0);
      expect(passphrase).toEqual(new Uint8Array(32));
    } finally {
      random.mockRestore();
    }
  });

  it('builds the same accounts from the extended account public key alone', async () => {
    const walletId = WalletId.deriveFromMnemonic(words);
    const { accounts } = await initializeWallet(
      { walletId, recoveryPhrase: words, walletName: 'Preprod', order: 0 },
      { logger: dummyLogger },
    );
    const { extendedAccountPublicKey } = accounts[0].blockchainSpecific;

    expect(
      createLazyAccountsFromAccountPublicKey({
        walletId,
        accountIndex: 0,
        extendedAccountPublicKey,
      }),
    ).toEqual(accounts);
    expect(
      createLazyAccountsFromAccountPublicKey({
        walletId,
        accountIndex: 2,
        extendedAccountPublicKey,
        accountName: 'Savings',
      }).map(({ accountId, accountType, metadata }) => ({
        accountId,
        accountType,
        metadata,
      })),
    ).toEqual(
      accounts.map(({ accountId }) => ({
        accountId: accountId.replace(/-0-/, '-2-'),
        accountType: 'LazyInMemory',
        metadata: { name: 'Savings' },
      })),
    );
  });
});
