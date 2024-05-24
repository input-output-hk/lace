import type * as Nami from '@xsy/nami-migration-tool/dist/migrator/migration-data.data';
import * as Extension from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { HexBlob } from '@cardano-sdk/util';
import { firstValueFrom } from 'rxjs';
import { WalletId } from '@cardano-sdk/web-extension';

export type WalletRepository = Extension.WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;
export type AddWalletProps = Extension.AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata>;
export type AnyWallet = Extension.AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WalletManager = Extension.WalletManager<any, any>;
export type CollateralRepository = (args: {
  walletId: WalletId;
  chainId: Wallet.Cardano.ChainId;
  accountIndex?: number;
  utxo: Wallet.Cardano.Utxo;
}) => Promise<void>;

const accountName = (account: Nami.Account) => `Account #${account.index}`;

const networkToChainId = (network: Nami.Networks): Wallet.Cardano.ChainId => {
  switch (network) {
    case 'mainnet':
      return Wallet.Cardano.ChainIds.Mainnet;
    case 'preview':
      return Wallet.Cardano.ChainIds.Preview;
    default:
      return Wallet.Cardano.ChainIds.Preprod;
  }
};

type SetCollateral = (args: {
  collateralRepository: CollateralRepository;
  account: Nami.Account;
  walletId: string;
}) => Promise<void>;

const setCollateral: SetCollateral = async ({ collateralRepository, account, walletId }) => {
  const collaterals = Object.entries(account.collaterals).filter(([, collateral]) => collateral !== undefined);

  for (const [network, collateral] of collaterals) {
    if (collateral === undefined) {
      continue;
    }

    const address = Wallet.Cardano.PaymentAddress(account.paymentAddresses[network as Nami.Networks]);

    const utxo: Wallet.Cardano.Utxo = [
      {
        txId: Wallet.Cardano.TransactionId(collateral.tx.hash),
        index: collateral.tx.index,
        address
      },
      {
        address,
        value: {
          coins: BigInt(collateral.lovelace)
        }
      }
    ];

    await collateralRepository({
      chainId: networkToChainId(network as Nami.Networks),
      utxo,
      walletId,
      accountIndex: account.index
    });
  }
};

type FreshInstall = (args: {
  walletRepository: WalletRepository;
  collateralRepository: CollateralRepository;
  encryptedPrivateKey: string;
  accounts: Nami.Account[];
}) => Promise<string>;

const freshInstall: FreshInstall = async ({
  walletRepository,
  collateralRepository,
  encryptedPrivateKey,
  accounts
}) => {
  const addWalletProps: AddWalletProps = {
    metadata: { name: 'Nami', lastActiveAccountIndex: 0 },
    encryptedSecrets: {
      keyMaterial: HexBlob.fromBytes(Buffer.from('')),
      rootPrivateKeyBytes: HexBlob.fromBytes(Buffer.from(encryptedPrivateKey, 'hex'))
    },
    accounts: accounts.map((account) => ({
      accountIndex: account.index,
      metadata: { name: accountName(account) },
      extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex(account.extendedAccountPublicKey)
    })),
    type: Extension.WalletType.InMemory
  };
  const walletId = await walletRepository.addWallet(addWalletProps);

  for (const account of accounts) {
    await setCollateral({ collateralRepository, account, walletId });
  }

  return walletId;
};

type ImportHardwareWallet = (args: {
  walletRepository: WalletRepository;
  collateralRepository: CollateralRepository;
  hardwareWallet: Nami.HarwareWallet;
}) => Promise<void>;

const importHardwareWallet: ImportHardwareWallet = async ({
  walletRepository,
  collateralRepository,
  hardwareWallet
}) => {
  const addWalletProps: AddWalletProps = {
    metadata: { name: hardwareWallet.name, lastActiveAccountIndex: hardwareWallet.index },
    type: hardwareWallet.vendor === 'ledger' ? Extension.WalletType.Ledger : Extension.WalletType.Trezor,
    accounts: [
      {
        extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex(hardwareWallet.extendedAccountPublicKey),
        accountIndex: hardwareWallet.index,
        metadata: { name: accountName(hardwareWallet) }
      }
    ]
  };

  const walletId = await walletRepository.addWallet(addWalletProps);

  await setCollateral({ collateralRepository, account: hardwareWallet, walletId });
};

type ImportAccounts = (args: {
  walletRepository: WalletRepository;
  collateralRepository: CollateralRepository;
  walletId: string;
  account: Nami.Account;
}) => Promise<void>;

const importAccounts: ImportAccounts = async ({ walletRepository, collateralRepository, walletId, account }) => {
  await walletRepository.addAccount({
    accountIndex: account.index,
    extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex(account.extendedAccountPublicKey),
    metadata: { name: accountName(account) },
    walletId
  });

  await setCollateral({ collateralRepository, account, walletId });
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

type ImportHardwareWallets = (args: {
  walletRepository: WalletRepository;
  collateralRepository: CollateralRepository;
  hardwareWallets: Nami.HarwareWallet[];
}) => Promise<void>;

const importHardwareWallets: ImportHardwareWallets = async ({
  walletRepository,
  collateralRepository,
  hardwareWallets
}) => {
  for (const hardwareWallet of hardwareWallets) {
    await importHardwareWallet({ walletRepository, collateralRepository, hardwareWallet });
  }
};

type Runer = (args: {
  walletRepository: WalletRepository;
  walletManager: WalletManager;
  collateralRepository: CollateralRepository;
  state: Nami.State;
}) => Promise<void>;

export const run: Runer = async ({ walletRepository, collateralRepository, walletManager, state }) => {
  const existingWallets = await firstValueFrom(walletRepository.wallets$);

  if (existingWallets.length === 0) {
    const walletId = await freshInstall({
      walletRepository,
      collateralRepository,
      encryptedPrivateKey: state.encryptedPrivateKey,
      accounts: state.accounts
    });
    await importHardwareWallets({ walletRepository, collateralRepository, hardwareWallets: state.hardwareWallets });

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
    if (!existingAccounts.has(account.extendedAccountPublicKey)) {
      accountsToAdd.push(account);
    } else {
      existingWalletId = existingAccounts.get(account.extendedAccountPublicKey);
    }
  }

  for (const account of state.hardwareWallets) {
    if (!existingAccounts.has(account.extendedAccountPublicKey)) {
      accountsToAdd.push(account);
    }
  }

  if (accountsToAdd.length === state.accounts.length + state.hardwareWallets.length) {
    const walletId = await freshInstall({
      walletRepository,
      collateralRepository,
      encryptedPrivateKey: state.encryptedPrivateKey,
      accounts: state.accounts
    });
    await importHardwareWallets({ walletRepository, collateralRepository, hardwareWallets: state.hardwareWallets });

    await walletManager.activate({
      walletId,
      chainId: Wallet.Cardano.ChainIds.Mainnet,
      accountIndex: 0
    });
  } else {
    for (const account of accountsToAdd) {
      await ('vendor' in account
        ? importHardwareWallet({
            walletRepository,
            collateralRepository,
            hardwareWallet: account as Nami.HarwareWallet
          })
        : importAccounts({ walletRepository, collateralRepository, walletId: existingWalletId, account }));
    }
  }
};