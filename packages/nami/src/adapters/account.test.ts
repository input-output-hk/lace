import { renderHook } from '@testing-library/react-hooks';
import { of } from 'rxjs';

import { useInitializeNamiMetadata, useUpdateAccount } from './account';

import type {
  AnyWallet,
  WalletManagerApi,
  WalletRepositoryApi,
} from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';

const mockUpdateAccountMetadata = jest.fn().mockResolvedValue(undefined);

const mockWallets = [
  {
    walletId: 'wallet1',
    accounts: [
      { accountIndex: 0, metadata: { name: 'Account 0' } },
      { accountIndex: 1, metadata: { name: 'Account 1' } },
    ],
  },
] as AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[];

describe('useInitializeNamiMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update account metadata if namiMode is not present', () => {
    const wallets$ = of(mockWallets);
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];

    renderHook(() => {
      useInitializeNamiMetadata({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
      });
    });

    expect(mockUpdateAccountMetadata).toHaveBeenCalledWith({
      walletId: 'wallet1',
      accountIndex: 0,
      metadata: expect.objectContaining({
        namiMode: { avatar: expect.any(String) },
      }),
    });
  });

  it('should not update account metadata if walletId or accountIndex is undefined', () => {
    const wallets$ = of(mockWallets);
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: undefined,
    }) as WalletManagerApi['activeWalletId$'];

    renderHook(() => {
      useInitializeNamiMetadata({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
      });
    });

    expect(mockUpdateAccountMetadata).not.toHaveBeenCalled();
  });

  it('should not update account metadata if namiMode is present', () => {
    const wallets$ = of([
      {
        walletId: 'wallet1',
        accounts: [
          {
            accountIndex: 0,
            metadata: {
              name: 'Account 0',
              namiMode: { avatar: 'existing-avatar' },
            },
          },
        ],
      },
    ]) as WalletRepositoryApi<
      Wallet.WalletMetadata,
      Wallet.AccountMetadata
    >['wallets$'];

    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];

    renderHook(() => {
      useInitializeNamiMetadata({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
      });
    });

    expect(mockUpdateAccountMetadata).not.toHaveBeenCalled();
  });
});

describe('useUpdateAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return account metadata and update function', async () => {
    const wallets$ = of([
      {
        walletId: 'wallet1',
        accounts: [
          {
            accountIndex: 0,
            metadata: {
              name: 'Account 0',
              namiMode: { avatar: 'existing-avatar' },
            },
          },
        ],
      },
    ]) as WalletRepositoryApi<
      Wallet.WalletMetadata,
      Wallet.AccountMetadata
    >['wallets$'];
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useUpdateAccount({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
      }),
    );

    expect(result.current.accountName).toBe('Account 0');
    expect(result.current.accountAvatar).toBe('existing-avatar');

    await result.current.updateAccountMetadata({ name: 'Updated Account 0' });

    expect(mockUpdateAccountMetadata).toHaveBeenCalledWith({
      walletId: 'wallet1',
      accountIndex: 0,
      metadata: {
        name: 'Updated Account 0',
        namiMode: { avatar: 'existing-avatar' },
      },
    });
  });

  it('should handle undefined walletId or accountIndex', async () => {
    const wallets$ = of(mockWallets);
    const activeWalletId$ = of({
      walletId: undefined,
      accountIndex: undefined,
    }) as unknown as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useUpdateAccount({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
      }),
    );

    expect(result.current.accountName).toBe('');
    expect(result.current.accountAvatar).toBeUndefined();

    await result.current.updateAccountMetadata({ name: 'Updated Account' });

    expect(mockUpdateAccountMetadata).not.toHaveBeenCalled();
  });
});
