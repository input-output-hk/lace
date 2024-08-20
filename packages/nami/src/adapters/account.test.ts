import { renderHook } from '@testing-library/react-hooks';
import { of } from 'rxjs';

import { useInitializeNamiMetadata, useAccount } from './account';

import type {
  WalletManagerApi,
  WalletRepositoryApi,
} from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';

const mockUpdateAccountMetadata = jest.fn().mockResolvedValue(undefined);

type Wallets$ = WalletRepositoryApi<
  Wallet.WalletMetadata,
  Wallet.AccountMetadata
>['wallets$'];

describe('useInitializeNamiMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update account metadata if address and avatar are not present', () => {
    const wallets$ = of([
      {
        walletId: 'wallet1',
        accounts: [{ accountIndex: 0, metadata: { name: 'Account 0' } }],
      },
    ]) as Wallets$;
    const addresses$ = of([
      { address: 'address1' },
    ]) as Wallet.ObservableWallet['addresses$'];
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];

    renderHook(() => {
      useInitializeNamiMetadata({
        addresses$,
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
      });
    });

    expect(mockUpdateAccountMetadata).toHaveBeenCalledWith({
      walletId: 'wallet1',
      accountIndex: 0,
      metadata: expect.objectContaining({
        name: 'Account 0',
        namiMode: { avatar: expect.any(String), address: 'address1' },
      }),
    });
  });

  it('should not update account metadata if walletId or accountIndex is undefined', () => {
    const wallets$ = of([
      {
        walletId: 'wallet1',
        accounts: [{ accountIndex: 0, metadata: { name: 'Account 0' } }],
      },
    ]) as Wallets$;
    const addresses$ = of([
      { address: 'address1' },
    ]) as Wallet.ObservableWallet['addresses$'];
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: undefined,
    }) as WalletManagerApi['activeWalletId$'];

    renderHook(() => {
      useInitializeNamiMetadata({
        addresses$,
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
      });
    });

    expect(mockUpdateAccountMetadata).not.toHaveBeenCalled();
  });

  it('should update account metadata if address is not present', () => {
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
    ]) as Wallets$;
    const addresses$ = of([
      { address: 'address1' },
    ]) as Wallet.ObservableWallet['addresses$'];
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];

    renderHook(() => {
      useInitializeNamiMetadata({
        addresses$,
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
      });
    });

    expect(mockUpdateAccountMetadata).toHaveBeenCalledWith({
      walletId: 'wallet1',
      accountIndex: 0,
      metadata: expect.objectContaining({
        name: 'Account 0',
        namiMode: { avatar: 'existing-avatar', address: 'address1' },
      }),
    });
  });
});

describe('useAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return accounts info and update function', () => {
    const wallets$ = of([
      {
        walletId: 'wallet1',
        accounts: [
          {
            accountIndex: 0,
            metadata: {
              name: 'Account 0',
              namiMode: { avatar: 'avatar0', address: 'address0' },
            },
          },
          {
            accountIndex: 1,
            metadata: {
              name: 'Account 1',
              namiMode: { avatar: 'avatar1', address: 'address1' },
            },
          },
          {
            accountIndex: 2,
            metadata: {
              name: 'Account 2',
              namiMode: { avatar: 'avatar2', address: 'address2' },
            },
          },
        ],
      },
    ]) as Wallets$;
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccount({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
      }),
    );

    expect(result.current.activeAccount).toEqual({
      name: 'Account 0',
      avatar: 'avatar0',
      recentSendToAddress: undefined,
    });

    expect(result.current.accounts).toEqual([
      {
        name: 'Account 1',
        avatar: 'avatar1',
        address: 'address1',
      },
      {
        name: 'Account 2',
        avatar: 'avatar2',
        address: 'address2',
      },
    ]);

    expect(result.current.updateAccountMetadata).toEqual(expect.any(Function));
  });

  it('should call updateAccountMetadata with correct arguments', async () => {
    const wallets$ = of([
      {
        walletId: 'wallet1',
        accounts: [
          {
            accountIndex: 0,
            metadata: {
              name: 'Account 0',
              namiMode: { avatar: 'avatar0', address: 'address0' },
            },
          },
        ],
      },
    ]) as Wallets$;
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccount({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
      }),
    );

    await result.current.updateAccountMetadata({ name: 'Updated Account 0' });

    expect(mockUpdateAccountMetadata).toHaveBeenNthCalledWith(1, {
      walletId: 'wallet1',
      accountIndex: 0,
      metadata: {
        name: 'Updated Account 0',
        namiMode: { avatar: 'avatar0', address: 'address0' },
      },
    });

    await result.current.updateAccountMetadata({
      namiMode: { avatar: 'avatar1' },
    });

    expect(mockUpdateAccountMetadata).toHaveBeenNthCalledWith(2, {
      walletId: 'wallet1',
      accountIndex: 0,
      metadata: {
        name: 'Account 0',
        namiMode: { avatar: 'avatar1', address: 'address0' },
      },
    });
  });

  it('should handle undefined walletId or accountIndex', async () => {
    const wallets$ = of([
      {
        walletId: 'wallet1',
        accounts: [
          {
            accountIndex: 0,
            metadata: {
              name: 'Account 0',
            },
          },
        ],
      },
    ]) as Wallets$;
    const activeWalletId$ = of({
      walletId: undefined,
      accountIndex: undefined,
    }) as unknown as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccount({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
      }),
    );

    expect(result.current.activeAccount).toEqual({
      name: '',
      avatar: undefined,
      recentSendToAddress: undefined,
    });

    await result.current.updateAccountMetadata({ name: 'Updated Account' });

    expect(mockUpdateAccountMetadata).not.toHaveBeenCalled();
  });
});
