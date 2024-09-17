import { renderHook } from '@testing-library/react-hooks';
import { BehaviorSubject, of } from 'rxjs';

import { useAccount } from './account';

import type {
  WalletManagerApi,
  WalletRepositoryApi,
} from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';

const mockAddAccount = jest.fn().mockResolvedValue(undefined);
const mockActivateAccount = jest.fn().mockResolvedValue(undefined);
const mockRemoveAccount = jest.fn().mockResolvedValue(undefined);
const mockUpdateAccountMetadata = jest.fn().mockResolvedValue(undefined);

const walletRepository = [
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
        accountIndex: 2,
        metadata: {
          name: 'Account 2',
          namiMode: { avatar: 'avatar2', address: 'address2' },
        },
      },
      {
        accountIndex: 1,
        metadata: {
          name: 'Account 1',
          namiMode: { avatar: 'avatar1', address: 'address1' },
        },
      },
    ],
  },
];

type Wallets$ = WalletRepositoryApi<
  Wallet.WalletMetadata,
  Wallet.AccountMetadata
>['wallets$'];

describe('useAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return accounts info', () => {
    const wallets$ = of(walletRepository) as Wallets$;
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 1,
    }) as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccount({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
        activateAccount: mockActivateAccount,
        addAccount: mockAddAccount,
        removeAccount: mockRemoveAccount,
      }),
    );

    expect(result.current.activeAccount).toEqual({
      index: 1,
      name: 'Account 1',
      avatar: 'avatar1',
      address: 'address1',
    });

    expect(result.current.nonActiveAccounts).toEqual([
      {
        index: 0,
        name: 'Account 0',
        avatar: 'avatar0',
        address: 'address0',
      },
      {
        index: 2,
        name: 'Account 2',
        avatar: 'avatar2',
        address: 'address2',
      },
    ]);

    expect(result.current.allAccounts).toEqual([
      result.current.nonActiveAccounts[0],
      result.current.activeAccount,
      result.current.nonActiveAccounts[1],
    ]);
  });

  it('should call updateAccountMetadata with correct arguments', async () => {
    const wallets$ = of(walletRepository) as Wallets$;
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccount({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
        activateAccount: mockActivateAccount,
        addAccount: mockAddAccount,
        removeAccount: mockRemoveAccount,
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
    const wallets$ = of(walletRepository) as Wallets$;
    const activeWalletId$ = of({
      walletId: undefined,
      accountIndex: undefined,
    }) as unknown as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccount({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
        activateAccount: mockActivateAccount,
        addAccount: mockAddAccount,
        removeAccount: mockRemoveAccount,
      }),
    );

    expect(result.current.activeAccount).toEqual({
      name: '',
      index: 0,
      avatar: undefined,
    });

    await result.current.updateAccountMetadata({ name: 'Updated Account' });

    expect(mockUpdateAccountMetadata).not.toHaveBeenCalled();
  });

  it('should return correct next index', () => {
    const wallets$ = new BehaviorSubject(walletRepository);
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as unknown as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccount({
        wallets$: wallets$ as unknown as Wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
        activateAccount: mockActivateAccount,
        addAccount: mockAddAccount,
        removeAccount: mockRemoveAccount,
      }),
    );

    expect(result.current.nextIndex).toEqual(3);

    wallets$.next([
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
            accountIndex: 3,
            metadata: {
              name: 'Account 3',
              namiMode: { avatar: 'avatar3', address: 'address3' },
            },
          },
          {
            accountIndex: 1,
            metadata: {
              name: 'Account 1',
              namiMode: { avatar: 'avatar1', address: 'address1' },
            },
          },
        ],
      },
    ]);

    expect(result.current.nextIndex).toEqual(2);
  });
});
