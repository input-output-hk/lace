/* eslint-disable @typescript-eslint/await-thenable */
const mockEmip3decrypt = jest.fn();
const mockEmip3encrypt = jest.fn();

import { Wallet } from '@lace/cardano';
import { renderHook } from '@testing-library/react-hooks';
import { of } from 'rxjs';

import { ERROR } from '../config/config';

import { useChangePassword } from './wallet';

import type {
  WalletManagerApi,
  WalletRepositoryApi,
} from '@cardano-sdk/web-extension';

const extendedAccountPublicKey =
  'ba4f80dea2632a17c99ae9d8b934abf0' +
  '2643db5426b889fef14709c85e294aa1' +
  '2ac1f1560a893ea7937c5bfbfdeab459' +
  'b1a396f1174b9c5a673a640d01880c35';

const rootPrivateKeyBytes =
  'a135ceec60dc6c5c29a9eba03b9f15c754aaa9498cec09a1f50cdf5d88c81efeef7f5b849e6d893c06e95726f6216294b487d4a782fb78d55560eba19f9971cfa22ba1cbf24d2833221af53c877421455fb91140f3ec9171e8fe0f6b7194fd461c1dd559e99a498910bcb2ff660289756e065079109483c0c9cbebc00565c22c113faf1eb8c19e9ea054b070b0bb4d73d4efe10ff8042a982a96af0c';

const newRootPrivateKeyBytes =
  'f24e8d5a67102f9d92f93df08b2ce2be325bb813e782d9b0c3000f8d7eec1b3026eba7719d72a84a0b0b472455cc569ab23ec119dfa65008140df4d79e65983c0e85b3dd92f7bd61ff979762c71f2dd115face757cd5efc246f825d3cbdcbf566f007f62b016355459154e1b4b1d4b087742f9bd29de8b5c1f040f0f44d877652f18db0d0f4bef2b581889cd7af457f91619db894c549f594754f532';

jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      KeyManagement: {
        ...actual.Wallet.KeyManagement,
        emip3decrypt: mockEmip3decrypt,
        emip3encrypt: mockEmip3encrypt,
      },
    },
  };
});

describe('useChangePassword', () => {
  const mockCreateWallet = jest.fn();
  const mockDeleteWallet = jest.fn();
  const mockAddAccount = jest.fn();
  const mockActivateWallet = jest.fn();
  const mockUpdateAccountMetadata = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should change the password correctly for wallet with on account', async () => {
    const currentPassword = 'newP123Ff';
    const newPassword = 'new-password';
    const mockActiveWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];
    const mockWallets$ = of([
      {
        walletId: 'wallet1',
        encryptedSecrets: {
          rootPrivateKeyBytes,
        },
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
    mockCreateWallet.mockResolvedValue({
      source: { wallet: { walletId: 'wallet1' } },
    });

    mockEmip3encrypt.mockImplementation(
      async () => await newRootPrivateKeyBytes,
    );

    const { result } = renderHook(() =>
      useChangePassword({
        chainId: { networkId: 0, networkMagic: 0 },
        createWallet: mockCreateWallet,
        deleteWallet: mockDeleteWallet,
        updateAccountMetadata: mockUpdateAccountMetadata,
        wallets$: mockWallets$,
        activeWalletId$: mockActiveWalletId$,
        addAccount: mockAddAccount,
        activateWallet: mockActivateWallet,
      }),
    );

    await result.current(currentPassword, newPassword);

    expect(mockDeleteWallet).toHaveBeenCalledWith(false);
    expect(mockCreateWallet).toHaveBeenCalledWith({
      name: 'test-wallet',
      rootPrivateKeyBytes: Wallet.HexBlob.fromBytes(
        newRootPrivateKeyBytes as unknown as Uint8Array,
      ),
      extendedAccountPublicKey,
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
    const currentPassword = 'currentPassword';
    const newPassword = 'new-password';
    const mockActiveWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 1,
    }) as WalletManagerApi['activeWalletId$'];
    const mockWallets$ = of([
      {
        walletId: 'wallet1',
        metadata: { name: 'test-wallet' },
        encryptedSecrets: {
          rootPrivateKeyBytes,
        },
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

    mockEmip3encrypt.mockImplementation(
      async () => await newRootPrivateKeyBytes,
    );

    mockCreateWallet.mockResolvedValue({
      source: { wallet: { walletId: 'wallet1' } },
    });
    const { result } = renderHook(() =>
      useChangePassword({
        chainId: { networkId: 0, networkMagic: 0 },
        createWallet: mockCreateWallet,
        deleteWallet: mockDeleteWallet,
        updateAccountMetadata: mockUpdateAccountMetadata,
        wallets$: mockWallets$,
        activeWalletId$: mockActiveWalletId$,
        addAccount: mockAddAccount,
        activateWallet: mockActivateWallet,
      }),
    );

    await result.current(currentPassword, newPassword);

    expect(mockDeleteWallet).toHaveBeenCalledWith(false);
    expect(mockCreateWallet).toHaveBeenCalledWith({
      name: 'test-wallet',
      rootPrivateKeyBytes: Wallet.HexBlob.fromBytes(
        newRootPrivateKeyBytes as unknown as Uint8Array,
      ),
      extendedAccountPublicKey,
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
    const mockActiveWalletId$ = of({
      walletId: 'wallet1',
      accountIndex: 0,
    }) as WalletManagerApi['activeWalletId$'];
    const mockWallets$ = of([
      {
        walletId: 'wallet1',
        encryptedSecrets: {
          rootPrivateKeyBytes,
        },
        metadata: { name: 'test-wallet' },
        accounts: [{ accountIndex: 0, metadata: {} }],
      },
    ]) as WalletRepositoryApi<
      Wallet.WalletMetadata,
      Wallet.AccountMetadata
    >['wallets$'];

    mockEmip3decrypt.mockRejectedValue(new Error('wrong pass'));

    const { result } = renderHook(() =>
      useChangePassword({
        chainId: { networkId: 0, networkMagic: 0 },
        createWallet: mockCreateWallet,
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
