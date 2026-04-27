import { DappId } from '@lace-contract/dapp-connector';
import { WalletId } from '@lace-contract/wallet-repo';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { handleRequestValidation } from '../../src/store/dependencies/dapp-connector';

import type { AuthorizedDappsDataSlice } from '@lace-contract/dapp-connector';
import type { Observable } from 'rxjs';
import type { Runtime } from 'webextension-polyfill';

vi.mock('webextension-polyfill', () => ({
  Runtime: {
    MessageSender: vi.fn(),
  },
  runtime: {
    reload: vi.fn(),
  },
}));

const authorizedDapps$: Observable<AuthorizedDappsDataSlice> = of({
  Midnight: [
    {
      walletId: WalletId('13e603103d9f6d5aa0cb445ed0d801a9'),
      blockchain: 'Midnight',
      isPersisted: true,
      dapp: {
        id: DappId('authorized-dapp-id'),
        name: 'New Tab',
        origin: 'https://authorized-test-dapp.com',
        imageUrl: '',
      },
    },
  ],
});

// TODO: skipping tests until dapp connector is fully implemented and tested
describe.skip('handleRequestValidation', () => {
  const isUnlocked$ = of(true);

  it('should throw an error if the origin is not authorized', async () => {
    const sender = {
      id: 'sender-id',
      origin: 'https://example.com',
      url: 'https://example.com',
    } as Runtime.MessageSender;

    await expect(async () => {
      await handleRequestValidation(sender, authorizedDapps$, isUnlocked$);
    }).rejects.toThrow();
  });

  it('should not throw an error if the origin is authorized', () => {
    const sender = {
      id: 'sender-id',
      origin: 'https://authorized-test-dapp.com',
      url: 'https://authorized-test-dapp.com',
    } as Runtime.MessageSender;

    expect(async () => {
      await handleRequestValidation(sender, authorizedDapps$, isUnlocked$);
    }).not.toThrow();
  });
});

describe('handleRequestValidation lock-state integration', () => {
  it('should throw when app is locked', async () => {
    const sender = {
      id: 'sender-id',
      origin: 'https://authorized-test-dapp.com',
      url: 'https://authorized-test-dapp.com',
    } as Runtime.MessageSender;

    await expect(
      handleRequestValidation(sender, authorizedDapps$, of(false)),
    ).rejects.toThrow('Wallet is locked');
  });

  it('should not throw when app is unlocked and origin is authorized', async () => {
    const sender = {
      id: 'sender-id',
      origin: 'https://authorized-test-dapp.com',
      url: 'https://authorized-test-dapp.com',
    } as Runtime.MessageSender;

    await expect(
      handleRequestValidation(sender, authorizedDapps$, of(true)),
    ).resolves.toBeUndefined();
  });
});
