import * as Nami from '@types';
import * as Extension from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { HexBlob } from '@cardano-sdk/util';
import { firstValueFrom } from 'rxjs';

type WalletRepository = Extension.WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;
type AddWalletProps = Extension.AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata>;
type AnyWallet = Extension.AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
type WalletManager = Extension.WalletManager<any, any>;

const accountName = (account: Nami.Account) => `Account #${account.index}`;

const freshInstall = async (
  walletRepository: WalletRepository,
  encryptedPrivateKey: string,
  accounts: Nami.Account[]
) => {
  const addWalletProps: AddWalletProps = {
    metadata: { name: 'Nami', lastActiveAccountIndex: 0 },
    encryptedSecrets: {
      keyMaterial: HexBlob.fromBytes(Buffer.from('')),
      rootPrivateKeyBytes: HexBlob.fromBytes(Buffer.from(encryptedPrivateKey, 'hex'))
    },
    accounts: accounts.map((account) => ({
      accountIndex: account.index,
      metadata: { name: accountName(account) },
      extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex(account.extendedPublicKey)
    })),
    type: Extension.WalletType.InMemory
  };

  return await walletRepository.addWallet(addWalletProps);
};

const importHardwareWallet = async (walletRepository: WalletRepository, hardwareWallet: Nami.HarwareWallet) => {
  const addWalletProps: AddWalletProps = {
    metadata: { name: hardwareWallet.name, lastActiveAccountIndex: hardwareWallet.index },
    type: hardwareWallet.vendor === 'ledger' ? Extension.WalletType.Ledger : Extension.WalletType.Trezor,
    accounts: [
      {
        extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex(hardwareWallet.extendedPublicKey),
        accountIndex: hardwareWallet.index,
        metadata: { name: accountName(hardwareWallet) }
      }
    ]
  };

  await walletRepository.addWallet(addWalletProps);
};

const importAccounts = async (walletRepository: WalletRepository, walletId: string, account: Nami.Account) => {
  await walletRepository.addAccount({
    accountIndex: account.index,
    extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex(account.extendedPublicKey),
    metadata: { name: accountName(account) },
    walletId
  });
};

const populateExistingAccounts = (existingWallets: AnyWallet[]) => {
  const existingAccounts = new Map<string, string>();

  for (const wallet of existingWallets) {
    if (wallet.type !== Extension.WalletType.Script) {
      for (const account of wallet.accounts) {
        existingAccounts.set(account.extendedAccountPublicKey, wallet.walletId);
      }
    }
  }

  return existingAccounts;
};

const importHardwareWallets = async (repository: WalletRepository, hardwareWallets: Nami.HarwareWallet[]) => {
  for (const hardwareWallet of hardwareWallets) {
    await importHardwareWallet(repository, hardwareWallet);
  }
};

export const run = async (
  walletRepository: WalletRepository,
  walletManager: WalletManager,
  state: Nami.State
): Promise<void> => {
  const existingWallets = await firstValueFrom(walletRepository.wallets$);

  if (existingWallets.length === 0) {
    const walletId = await freshInstall(walletRepository, state.encryptedPrivateKey, state.accounts);
    await importHardwareWallets(walletRepository, state.hardwareWallets);

    await walletManager.activate({
      walletId,
      chainId: Wallet.Cardano.ChainIds.Mainnet,
      accountIndex: 0
    });
    return;
  }

  const existingAccounts = populateExistingAccounts(existingWallets);

  const accountsToAdd = [];
  let existingWalletId = '';

  for (const account of state.accounts) {
    if (!existingAccounts.has(account.extendedPublicKey)) {
      accountsToAdd.push(account);
    } else {
      existingWalletId = existingAccounts.get(account.extendedPublicKey);
    }
  }

  for (const account of state.hardwareWallets) {
    if (!existingAccounts.has(account.extendedPublicKey)) {
      accountsToAdd.push(account);
    }
  }

  if (accountsToAdd.length === state.accounts.length + state.hardwareWallets.length) {
    const walletId = await freshInstall(walletRepository, state.encryptedPrivateKey, state.accounts);
    await importHardwareWallets(walletRepository, state.hardwareWallets);

    await walletManager.activate({
      walletId,
      chainId: Wallet.Cardano.ChainIds.Mainnet,
      accountIndex: 0
    });
  } else {
    for (const account of accountsToAdd) {
      await ('vendor' in account
        ? importHardwareWallet(walletRepository, account as Nami.HarwareWallet)
        : importAccounts(walletRepository, existingWalletId, account));
    }
  }
};
