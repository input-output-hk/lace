import { renderHook } from '@testing-library/react-hooks';
import { of } from 'rxjs';

import { ERROR } from '../config/config';

import { useChangePassword } from './wallet';

import type {
  WalletManagerApi,
  WalletRepositoryApi,
} from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';

const extendedAccountPublicKey =
  'ba4f80dea2632a17c99ae9d8b934abf0' +
  '2643db5426b889fef14709c85e294aa1' +
  '2ac1f1560a893ea7937c5bfbfdeab459' +
  'b1a396f1174b9c5a673a640d01880c35';

describe('useChangePassword', () => {
  const mockCreateWallet = jest.fn();
  const mockGetMnemonic = jest.fn();
  const mockDeleteWallet = jest.fn();
  const mockAddAccount = jest.fn();
  const mockActivateWallet = jest.fn();
  const mockUpdateAccountMetadata = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should change the password correctly for wallet with on account', async () => {
    const mockActiveWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];
    const mockWallets$ = of([
      {
        walletId: 'wallet1',
        metadata: { name: 'test-wallet' },
        accounts: [
          {
            accountIndex: 0,
            metadata: {},
            extendedAccountPublicKey,
          },
        ],
      },
    ]) as WalletRepositoryApi<
      Wallet.WalletMetadata,
      Wallet.AccountMetadata
    >['wallets$'];
    mockGetMnemonic.mockResolvedValue(['mnemonic']);
    mockCreateWallet.mockResolvedValue({
      source: { wallet: { walletId: 'wallet1' } },
    });
    const { result } = renderHook(() =>
      useChangePassword({
        chainId: { networkId: 0, networkMagic: 0 },
        createWallet: mockCreateWallet,
        getMnemonic: mockGetMnemonic,
        deleteWallet: mockDeleteWallet,
        updateAccountMetadata: mockUpdateAccountMetadata,
        wallets$: mockWallets$,
        activeWalletId$: mockActiveWalletId$,
        addAccount: mockAddAccount,
        activateWallet: mockActivateWallet,
      }),
    );

    await result.current('current-password', 'new-password');

    expect(mockGetMnemonic).toHaveBeenCalledWith(
      Buffer.from('current-password'),
    );
    expect(mockDeleteWallet).toHaveBeenCalledWith(false);
    expect(mockCreateWallet).toHaveBeenCalledWith({
      mnemonic: ['mnemonic'],
      name: 'test-wallet',
      password: 'new-password',
    });
    expect(mockUpdateAccountMetadata).toHaveBeenCalled();
    expect(mockAddAccount).not.toHaveBeenCalled();
    expect(mockActivateWallet).toHaveBeenCalledWith({
      chainId: { networkId: 0, networkMagic: 0 },
      walletId: 'wallet1',
      accountIndex: 0,
    });
  });

  it('should change the password correctly for wallet with two accounts and second account active', async () => {
    const mockActiveWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 1,
    }) as WalletManagerApi['activeWalletId$'];
    const mockWallets$ = of([
      {
        walletId: 'wallet1',
        metadata: { name: 'test-wallet' },
        accounts: [
          {
            accountIndex: 0,
            metadata: { name: 'account 0' },
            extendedAccountPublicKey,
          },
          {
            accountIndex: 1,
            metadata: { name: 'account 1' },
            extendedAccountPublicKey,
          },
        ],
      },
    ]) as WalletRepositoryApi<
      Wallet.WalletMetadata,
      Wallet.AccountMetadata
    >['wallets$'];
    mockGetMnemonic.mockResolvedValue(['mnemonic']);
    mockCreateWallet.mockResolvedValue({
      source: { wallet: { walletId: 'wallet1' } },
    });
    const { result } = renderHook(() =>
      useChangePassword({
        chainId: { networkId: 0, networkMagic: 0 },
        createWallet: mockCreateWallet,
        getMnemonic: mockGetMnemonic,
        deleteWallet: mockDeleteWallet,
        updateAccountMetadata: mockUpdateAccountMetadata,
        wallets$: mockWallets$,
        activeWalletId$: mockActiveWalletId$,
        addAccount: mockAddAccount,
        activateWallet: mockActivateWallet,
      }),
    );

    await result.current('current-password', 'new-password');

    expect(mockGetMnemonic).toHaveBeenCalledWith(
      Buffer.from('current-password'),
    );
    expect(mockDeleteWallet).toHaveBeenCalledWith(false);
    expect(mockCreateWallet).toHaveBeenCalledWith({
      mnemonic: ['mnemonic'],
      name: 'test-wallet',
      password: 'new-password',
    });
    expect(mockUpdateAccountMetadata).toHaveBeenCalledWith({
      walletId: 'wallet1',
      accountIndex: 0,
      metadata: { name: 'account 0' },
    });
    expect(mockAddAccount).toHaveBeenCalledWith({
      walletId: 'wallet1',
      accountIndex: 1,
      metadata: { name: 'account 1' },
      extendedAccountPublicKey,
    });
    expect(mockActivateWallet).toHaveBeenCalledWith({
      chainId: { networkId: 0, networkMagic: 0 },
      walletId: 'wallet1',
      accountIndex: 1,
    });
  });

  it('should throw an error if the password is wrong', async () => {
    mockGetMnemonic.mockRejectedValue(new Error('error'));
    const mockActiveWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];
    const mockWallets$ = of([
      {
        walletId: 'wallet1',
        metadata: { name: 'test-wallet' },
        accounts: [{ accountIndex: 0, metadata: {} }],
      },
    ]) as WalletRepositoryApi<
      Wallet.WalletMetadata,
      Wallet.AccountMetadata
    >['wallets$'];

    const { result } = renderHook(() =>
      useChangePassword({
        chainId: { networkId: 0, networkMagic: 0 },
        createWallet: mockCreateWallet,
        getMnemonic: mockGetMnemonic,
        deleteWallet: mockDeleteWallet,
        updateAccountMetadata: mockUpdateAccountMetadata,
        wallets$: mockWallets$,
        activeWalletId$: mockActiveWalletId$,
        addAccount: mockAddAccount,
        activateWallet: mockActivateWallet,
      }),
    );

    await expect(
      result.current('wrong-password', 'new-password'),
    ).rejects.toEqual(ERROR.wrongPassword);
    expect(mockDeleteWallet).not.toHaveBeenCalled();
  });
});
