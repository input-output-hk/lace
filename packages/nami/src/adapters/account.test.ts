import { act, renderHook } from '@testing-library/react-hooks';
import { BehaviorSubject, of } from 'rxjs';

import { getNextAccountIndex, useAccountUtil } from './account';

import type {
  AnyWallet,
  WalletManagerApi,
  WalletRepositoryApi,
} from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';

const mockAddAccount = jest.fn().mockResolvedValue(undefined);
const mockActivateAccount = jest.fn().mockResolvedValue(undefined);
const mockRemoveAccount = jest.fn().mockResolvedValue(undefined);
const mockUpdateAccountMetadata = jest.fn().mockResolvedValue(undefined);
const mockRemoveWallet = jest.fn().mockResolvedValue(undefined);

const genMetadata = (index: number) => ({
  accountIndex: index,
  metadata: {
    name: `Account ${index}`,
    namiMode: { avatar: `avatar${index}`, address: `address${index}` },
  },
});

const acc0 = genMetadata(0);
const acc1 = genMetadata(1);
const acc2 = genMetadata(2);

const genWallet = (
  walletId: string,
  type: string,
): AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata> =>
  ({
    walletId,
    type,
    accounts: [acc0, acc1, acc2],
  }) as AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;

const wallet1 = genWallet('wallet1', 'InMemory');
const wallet2 = genWallet('wallet2', 'InMemory');
const trezorWallet1 = genWallet('trezor wallet1', 'Trezor');
const trezorWallet2 = genWallet('trezor wallet2', 'Trezor');
const ledgerWallet1 = genWallet('ledger wallet1', 'Ledger');
const ledgerrWallet2 = genWallet('ledger wallet2', 'Ledger');

const walletRepository = [
  wallet1,
  wallet2,
  trezorWallet1,
  trezorWallet2,
  ledgerWallet1,
  ledgerrWallet2,
];

const getAccountData = (
  wallet: Readonly<AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>>,
  accIndex: number,
) => {
  const acc =
    'accounts' in wallet
      ? wallet.accounts.find(a => a.accountIndex === accIndex)
      : {
          metadata: { name: '', namiMode: {} },
        };
  return {
    index: accIndex,
    walletId: wallet.walletId,
    name: acc?.metadata?.name || `${wallet.type} ${accIndex}`,
    type: wallet.type,
    ...acc?.metadata?.namiMode,
  };
};

type Wallets$ = WalletRepositoryApi<
  Wallet.WalletMetadata,
  Wallet.AccountMetadata
>['wallets$'];

describe('useAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return properly sorted accounts info for active non hw account', () => {
    const wallets$ = of(walletRepository) as Wallets$;
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 1,
    }) as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccountUtil({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
        activateAccount: mockActivateAccount,
        addAccount: mockAddAccount,
        removeAccount: mockRemoveAccount,
        removeWallet: mockRemoveWallet,
      }),
    );

    expect(result.current.activeAccount).toEqual(getAccountData(wallet1, 1));

    expect(result.current.nonActiveAccounts).toEqual([
      getAccountData(wallet1, 0),
      getAccountData(wallet1, 2),
      getAccountData(trezorWallet1, 0),
      getAccountData(trezorWallet1, 1),
      getAccountData(trezorWallet1, 2),
      getAccountData(ledgerWallet1, 0),
      getAccountData(ledgerWallet1, 1),
      getAccountData(ledgerWallet1, 2),
    ]);

    expect(result.current.allAccounts).toEqual([
      getAccountData(wallet1, 0),
      getAccountData(wallet1, 1),
      getAccountData(wallet1, 2),
      getAccountData(trezorWallet1, 0),
      getAccountData(trezorWallet1, 1),
      getAccountData(trezorWallet1, 2),
      getAccountData(ledgerWallet1, 0),
      getAccountData(ledgerWallet1, 1),
      getAccountData(ledgerWallet1, 2),
    ]);
  });

  it('should return properly sorted accounts info for active hw account', () => {
    const wallets$ = of(walletRepository) as Wallets$;
    const activeWalletId$ = of({
      walletId: 'trezor wallet1',
      accountIndex: 1,
    }) as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccountUtil({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
        activateAccount: mockActivateAccount,
        addAccount: mockAddAccount,
        removeAccount: mockRemoveAccount,
        removeWallet: mockRemoveWallet,
      }),
    );

    expect(result.current.activeAccount).toEqual(
      getAccountData(trezorWallet1, 1),
    );

    expect(result.current.nonActiveAccounts).toEqual([
      getAccountData(wallet1, 0),
      getAccountData(wallet1, 1),
      getAccountData(wallet1, 2),
      getAccountData(trezorWallet1, 0),
      getAccountData(trezorWallet1, 2),
      getAccountData(ledgerWallet1, 0),
      getAccountData(ledgerWallet1, 1),
      getAccountData(ledgerWallet1, 2),
    ]);

    expect(result.current.allAccounts).toEqual([
      getAccountData(wallet1, 0),
      getAccountData(wallet1, 1),
      getAccountData(wallet1, 2),
      getAccountData(trezorWallet1, 0),
      getAccountData(trezorWallet1, 1),
      getAccountData(trezorWallet1, 2),
      getAccountData(ledgerWallet1, 0),
      getAccountData(ledgerWallet1, 1),
      getAccountData(ledgerWallet1, 2),
    ]);
  });

  it('should call updateAccountMetadata with correct arguments', async () => {
    const wallets$ = of(walletRepository) as Wallets$;
    const activeWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccountUtil({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
        activateAccount: mockActivateAccount,
        addAccount: mockAddAccount,
        removeAccount: mockRemoveAccount,
        removeWallet: mockRemoveWallet,
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
      useAccountUtil({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
        activateAccount: mockActivateAccount,
        addAccount: mockAddAccount,
        removeAccount: mockRemoveAccount,
        removeWallet: mockRemoveWallet,
      }),
    );

    expect(result.current.activeAccount).toEqual(getAccountData(wallet1, 0));

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
      useAccountUtil({
        wallets$: wallets$ as unknown as Wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
        activateAccount: mockActivateAccount,
        addAccount: mockAddAccount,
        removeAccount: mockRemoveAccount,
        removeWallet: mockRemoveWallet,
      }),
    );

    expect(getNextAccountIndex(result.current.allAccounts, 'wallet1')).toEqual(
      3,
    );

    act(() => {
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
        } as AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>,
      ]);
    });

    expect(getNextAccountIndex(result.current.allAccounts, 'wallet1')).toEqual(
      2,
    );
  });

  it('should call removeWallet with correct arguments', async () => {
    const wallets$ = of(walletRepository) as Wallets$;
    const activeWalletId$ = of({
      walletId: 'trezor wallet1',
      accountIndex: 1,
    }) as unknown as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccountUtil({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
        activateAccount: mockActivateAccount,
        addAccount: mockAddAccount,
        removeAccount: mockRemoveAccount,
        removeWallet: mockRemoveWallet,
      }),
    );

    await result.current.removeAccount({
      accountIndex: 1,
      walletId: 'trezor wallet1',
    });

    expect(mockRemoveAccount).toHaveBeenCalledWith({
      accountIndex: 1,
      walletId: 'trezor wallet1',
    });

    expect(mockRemoveWallet).not.toHaveBeenCalled();
  });

  it('should call removeAccount with correct arguments', async () => {
    const wallets$ = of([
      {
        walletId: 'wallet',
        accounts: [acc1],
      } as AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>,
    ]) as Wallets$;
    const activeWalletId$ = of({
      walletId: 'wallet',
      accountIndex: 1,
    }) as unknown as WalletManagerApi['activeWalletId$'];

    const { result } = renderHook(() =>
      useAccountUtil({
        wallets$,
        activeWalletId$,
        updateAccountMetadata: mockUpdateAccountMetadata,
        activateAccount: mockActivateAccount,
        addAccount: mockAddAccount,
        removeAccount: mockRemoveAccount,
        removeWallet: mockRemoveWallet,
      }),
    );

    await result.current.removeAccount({
      accountIndex: 1,
      walletId: 'wallet',
    });

    expect(mockRemoveWallet).toHaveBeenCalledWith('wallet');

    expect(mockRemoveAccount).not.toHaveBeenCalled();
  });
});
