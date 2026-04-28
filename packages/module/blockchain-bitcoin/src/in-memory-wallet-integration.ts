import { emip3decrypt, emip3encrypt } from '@cardano-sdk/key-management';
import {
  allSupportedNetworks,
  BitcoinAccountId,
  BitcoinNetwork,
  BitcoinNetworkId,
  supportedNetworkIds,
} from '@lace-contract/bitcoin-context';
import { createAddAccounts } from '@lace-contract/in-memory';
import { createBlockchainNetworkTargetResolver } from '@lace-contract/network';
import { HexBytes } from '@lace-sdk/util';
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
  const seedEncrypted = await emip3encrypt(seed, passphrase);
  return HexBytes.fromByteArray(seedEncrypted);
};

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
  const targetBitcoinNetworks = resolveTargetNetworks(targetNetworks);
  const seed = await emip3decrypt(
    Buffer.from(encryptedRootPrivateKey, 'hex'),
    password,
  );
  const extendedAccountPublicKeys = getExtendedPubKeys(
    Buffer.from(seed),
    accountIndex,
  );

  seed.fill(0);

  return await Promise.all(
    targetBitcoinNetworks.map(async network => {
      const networkId = BitcoinNetworkId(network);

      return {
        blockchainName: 'Bitcoin',
        networkType: network === BitcoinNetwork.Mainnet ? 'mainnet' : 'testnet',
        blockchainNetworkId: networkId,
        blockchainSpecific: {
          accountIndex,
          extendedAccountPublicKeys:
            network === BitcoinNetwork.Mainnet
              ? extendedAccountPublicKeys.mainnet
              : extendedAccountPublicKeys.testnet4,
          networkId,
        },
        accountId: BitcoinAccountId(walletId, accountIndex, network),
        accountType: 'InMemory',
        walletId,
        metadata: { name: accountName || defaultAccountName(accountIndex) },
      };
    }),
  );
};

export const initializeWallet: InitializeInMemoryWallet<
  BitcoinBip32AccountProps,
  BitcoinSpecificInMemoryWalletData
> = async (props, dependencies) => {
  const accountIndex = 0;
  const blockchainSpecificWalletData = await createBlockchainSpecificWalletData(
    props,
    dependencies,
  );

  return {
    accounts: await createAccounts(
      {
        ...props,
        accountIndex,
        blockchainName: 'Bitcoin',
        blockchainSpecific: blockchainSpecificWalletData,
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
