import {
  allSupportedNetworks,
  BitcoinAccountId,
  BitcoinNetwork,
  BitcoinNetworkId,
  supportedNetworkIds,
} from '@lace-contract/bitcoin-context';
import { createAddAccounts } from '@lace-contract/in-memory';
import { createBlockchainNetworkTargetResolver } from '@lace-contract/network';
import { SecretBox } from '@lace-lib/core';
import { HexBytes } from '@lace-lib/util';
import * as bip39 from 'bip39';

import { getExtendedPubKeys } from './common';

import type { AvailableAddons } from '.';
import type {
  BitcoinBip32AccountProps,
  BitcoinSpecificInMemoryWalletData,
} from '@lace-contract/bitcoin-context';
import type {
  CreateBlockchainSpecificWalletData,
  CreateInMemoryWalletAccounts,
  InitializeInMemoryWallet,
  InMemoryWalletIntegration,
} from '@lace-contract/in-memory';
import type { ContextualLaceInit } from '@lace-contract/module';
import type {
  InMemoryWalletAccount,
  LazyInMemoryWalletAccount,
  WalletId,
} from '@lace-contract/wallet-repo';

/**
 * Default account name for Bitcoin accounts.
 *
 * @param accountIndex - The index of the account.
 */
const defaultAccountName = (accountIndex: number) => `Bitcoin #${accountIndex}`;

const resolveTargetNetworks = createBlockchainNetworkTargetResolver(
  supportedNetworkIds,
  allSupportedNetworks,
);

/**
 * Encrypts the Bitcoin seed using the provided passphrase.
 * @param seed - The Bitcoin seed to encrypt.
 * @param passphrase - The passphrase to use for encryption.
 */
const encryptBitcoinSeed = async (seed: Buffer, passphrase: Uint8Array) => {
  const seedEncrypted = await SecretBox.seal(seed, passphrase);
  return HexBytes.fromByteArray(seedEncrypted);
};

type BitcoinAccountFor<T extends 'InMemory' | 'LazyInMemory'> =
  T extends 'InMemory'
    ? InMemoryWalletAccount<BitcoinBip32AccountProps>
    : LazyInMemoryWalletAccount<BitcoinBip32AccountProps>;

const buildAccountsForNetworks = <T extends 'InMemory' | 'LazyInMemory'>({
  walletId,
  accountIndex,
  accountName,
  targetNetworks,
  extendedAccountPublicKeys,
  accountType,
}: {
  walletId: WalletId;
  accountIndex: number;
  accountName?: string;
  targetNetworks?: Parameters<typeof resolveTargetNetworks>[0];
  extendedAccountPublicKeys: ReturnType<typeof getExtendedPubKeys>;
  accountType: T;
}): BitcoinAccountFor<T>[] =>
  resolveTargetNetworks(targetNetworks).map(network => {
    const networkId = BitcoinNetworkId(network);
    return {
      accountId: BitcoinAccountId(walletId, accountIndex, network),
      accountType,
      blockchainName: 'Bitcoin',
      blockchainNetworkId: networkId,
      blockchainSpecific: {
        accountIndex,
        extendedAccountPublicKeys:
          network === BitcoinNetwork.Mainnet
            ? extendedAccountPublicKeys.mainnet
            : extendedAccountPublicKeys.testnet4,
        networkId,
      },
      metadata: { name: accountName || defaultAccountName(accountIndex) },
      networkType: network === BitcoinNetwork.Mainnet ? 'mainnet' : 'testnet',
      walletId,
    } as BitcoinAccountFor<T>;
  });

export const createAccounts: CreateInMemoryWalletAccounts<
  BitcoinBip32AccountProps,
  BitcoinSpecificInMemoryWalletData
> = async ({
  blockchainSpecific: { encryptedRootPrivateKey },
  walletId,
  accountIndex,
  password,
  accountName,
  targetNetworks,
}) => {
  const seed = await SecretBox.open(
    Buffer.from(encryptedRootPrivateKey, 'hex'),
    password,
  );
  const extendedAccountPublicKeys = getExtendedPubKeys(
    Buffer.from(seed),
    accountIndex,
  );

  seed.fill(0);

  return buildAccountsForNetworks({
    accountIndex,
    accountName,
    accountType: 'InMemory',
    extendedAccountPublicKeys,
    targetNetworks,
    walletId,
  });
};

export const initializeWallet: InitializeInMemoryWallet<
  BitcoinBip32AccountProps,
  BitcoinSpecificInMemoryWalletData
> = async (props, dependencies) => {
  const accountIndex = 0;
  const { walletId, recoveryPhrase, password } = props;

  if (!password) {
    // Lazy path: derive extended public keys from the mnemonic without
    // encrypting/persisting the seed. Lace persists no seed material.
    const seed = bip39.mnemonicToSeedSync(recoveryPhrase.join(' '));
    try {
      const extendedAccountPublicKeys = getExtendedPubKeys(
        Buffer.from(seed),
        accountIndex,
      );
      return {
        accounts: buildAccountsForNetworks({
          accountIndex,
          accountType: 'LazyInMemory',
          extendedAccountPublicKeys,
          walletId,
        }),
      };
    } finally {
      seed.fill(0);
    }
  }

  const blockchainSpecificWalletData = await createBlockchainSpecificWalletData(
    { password, recoveryPhrase, walletId },
    dependencies,
  );

  return {
    accounts: await createAccounts(
      {
        ...props,
        accountIndex,
        blockchainName: 'Bitcoin',
        blockchainSpecific: blockchainSpecificWalletData,
        password,
      },
      dependencies,
    ),
    blockchainSpecificWalletData,
  };
};

export const createBlockchainSpecificWalletData: CreateBlockchainSpecificWalletData<
  BitcoinSpecificInMemoryWalletData
> = async ({ password, recoveryPhrase }) => {
  const seed = bip39.mnemonicToSeedSync(recoveryPhrase.join(' '));

  try {
    const encryptedRootPrivateKey = await encryptBitcoinSeed(seed, password);
    return { encryptedRootPrivateKey };
  } finally {
    seed.fill(0);
  }
};

export const addAccounts = createAddAccounts({
  blockchainName: 'Bitcoin',
  createAccounts,
  createBlockchainSpecificWalletData,
});

const inMemoryWalletIntegration: ContextualLaceInit<
  InMemoryWalletIntegration<
    'Bitcoin',
    BitcoinBip32AccountProps,
    BitcoinSpecificInMemoryWalletData
  >,
  AvailableAddons
> = () => ({
  initializeWallet,
  createAccounts,
  addAccounts,
  blockchainName: 'Bitcoin',
});

export default inMemoryWalletIntegration;
