import { Cardano } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import {
  emip3decrypt,
  InMemoryKeyAgent,
  KeyPurpose,
  util,
} from '@cardano-sdk/key-management';
import {
  CardanoAccountId,
  CardanoNetworkId,
  supportedNetworkIds,
  supportedNetworkMagics,
} from '@lace-contract/cardano-context';
import { createAddAccounts } from '@lace-contract/in-memory';
import { createBlockchainNetworkTargetResolver } from '@lace-contract/network';
import { HexBytes } from '@lace-sdk/util';

import type { AvailableAddons } from '.';
import type { SerializableInMemoryKeyAgentData } from '@cardano-sdk/key-management';
import type {
  CardanoBip32AccountProps,
  CardanoSpecificInMemoryWalletData,
} from '@lace-contract/cardano-context';
import type {
  CreateBlockchainSpecificWalletData,
  CreateInMemoryWalletAccounts,
  InMemoryWalletIntegration,
  InitializeInMemoryWallet,
} from '@lace-contract/in-memory';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { InMemoryWalletAccount } from '@lace-contract/wallet-repo';

const defaultAccountName = (accountIndex: number) => `Cardano #${accountIndex}`;

const resolveTargetNetworks = createBlockchainNetworkTargetResolver(
  supportedNetworkIds,
  supportedNetworkMagics,
);

export const createAccounts: CreateInMemoryWalletAccounts<
  CardanoBip32AccountProps,
  CardanoSpecificInMemoryWalletData
> = async ({
  blockchainSpecific: { encryptedRootPrivateKey },
  walletId,
  accountIndex,
  password,
  accountName,
  targetNetworks,
}) => {
  const targetNetworkMagics = resolveTargetNetworks(targetNetworks);
  const bip32Ed25519 = await Crypto.SodiumBip32Ed25519.create();

  const rootPrivateKey = await emip3decrypt(
    Buffer.from(encryptedRootPrivateKey, 'hex'),
    password,
  );
  // TODO: We don't want functions to return private keys as strings since its harder to wipe from memory
  const accountPrivateKey = await util.deriveAccountPrivateKey({
    accountIndex,
    bip32Ed25519,
    purpose: KeyPurpose.STANDARD,
    // TODO: We don't want to ever convert private keys to strings since its harder to wipe from memory
    rootPrivateKey: Buffer.from(rootPrivateKey).toString(
      'hex',
    ) as Crypto.Bip32PrivateKeyHex,
  });

  // Wipe the root private key from memory
  rootPrivateKey.fill(0);

  const extendedAccountPublicKey =
    bip32Ed25519.getBip32PublicKey(accountPrivateKey);

  return targetNetworkMagics.map(networkMagic => {
    const networkId = CardanoNetworkId(networkMagic);
    return {
      blockchainName: 'Cardano',
      networkType:
        networkMagic === Cardano.NetworkMagics.Mainnet ? 'mainnet' : 'testnet',
      blockchainNetworkId: networkId,
      blockchainSpecific: {
        accountIndex,
        chainId: CardanoNetworkId.getChainId(networkId),
        networkId,
        extendedAccountPublicKey,
      },
      accountId: CardanoAccountId(walletId, accountIndex, networkMagic),
      accountType: 'InMemory',
      walletId,
      metadata: { name: accountName || defaultAccountName(accountIndex) },
    } satisfies InMemoryWalletAccount<CardanoBip32AccountProps>;
  });
};

export const initializeWallet: InitializeInMemoryWallet<
  CardanoBip32AccountProps,
  CardanoSpecificInMemoryWalletData
> = async ({ walletId, password, recoveryPhrase }, dependencies) => {
  const accountIndex = 0;
  const blockchainSpecificWalletData = await createBlockchainSpecificWalletData(
    { walletId, password, recoveryPhrase },
    dependencies,
  );

  return {
    accounts: await createAccounts(
      {
        accountIndex,
        blockchainName: 'Cardano',
        blockchainSpecific: blockchainSpecificWalletData,
        password,
        walletId,
      },
      dependencies,
    ),
    blockchainSpecificWalletData,
  };
};

export const createBlockchainSpecificWalletData: CreateBlockchainSpecificWalletData<
  CardanoSpecificInMemoryWalletData
> = async ({ password, recoveryPhrase }, dependencies) => {
  const accountIndex = 0;
  const keyAgent = await InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      chainId: Cardano.ChainIds.Mainnet,
      getPassphrase: async () => password,
      mnemonicWords: recoveryPhrase,
      accountIndex,
    },
    {
      logger: dependencies.logger,
      bip32Ed25519: await Crypto.SodiumBip32Ed25519.create(),
    },
  );

  const encryptedRootPrivateKey = HexBytes.fromArray(
    (keyAgent.serializableData as SerializableInMemoryKeyAgentData)
      .encryptedRootPrivateKeyBytes,
  );

  return { encryptedRootPrivateKey };
};

export const addAccounts = createAddAccounts({
  blockchainName: 'Cardano',
  createAccounts,
  createBlockchainSpecificWalletData,
});

const inMemoryWalletIntegration: ContextualLaceInit<
  InMemoryWalletIntegration<
    'Cardano',
    CardanoBip32AccountProps,
    CardanoSpecificInMemoryWalletData
  >,
  AvailableAddons
> = () => ({
  initializeWallet,
  createAccounts,
  addAccounts,
  blockchainName: 'Cardano',
});

export default inMemoryWalletIntegration;
