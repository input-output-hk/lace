import { emip3decrypt, emip3encrypt, util } from '@cardano-sdk/key-management';
import { createAddAccounts } from '@lace-contract/in-memory';
import {
  MidnightAccountId,
  MidnightNetworkId,
  MidnightSDKNetworkId,
  supportedNetworkIds,
} from '@lace-contract/midnight-context';
import { createBlockchainNetworkTargetResolver } from '@lace-contract/network';
import { ByteArray, HexBytes } from '@lace-sdk/util';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import * as bip39 from 'bip39';

import type {
  CreateBlockchainSpecificWalletData,
  CreateInMemoryWalletAccounts,
  InitializeInMemoryWallet,
  InMemoryWalletIntegration,
} from '@lace-contract/in-memory';
import type {
  MidnightAccountProps,
  MidnightSpecificInMemoryWalletData,
  DerivationPath,
  RolesMap,
} from '@lace-contract/midnight-context';
import type {
  InMemoryWalletAccount,
  WalletId,
} from '@lace-contract/wallet-repo';

const deriveAndEncryptKey = async <D extends DerivationPath<keyof RolesMap>>(
  hdWallet: HDWallet,
  derivationPath: D,
  password: Uint8Array,
) => {
  const derivationResult = hdWallet
    .selectAccount(derivationPath.accountIndex)
    .selectRole(derivationPath.role)
    .deriveKeyAt(derivationPath.index);

  if (derivationResult.type !== 'keyDerived') {
    throw new Error(`Failed to derive a key (role ${derivationPath.role})`);
  }

  const keyHex = ByteArray(derivationResult.key);
  return HexBytes.fromByteArray(
    ByteArray(await emip3encrypt(keyHex, password)),
  );
};

const createAccountData = async ({
  accountIndex,
  networkId,
  password,
  seed,
  walletId,
  accountName,
}: {
  accountIndex: number;
  networkId: MidnightSDKNetworkId;
  password: Uint8Array;
  seed: Uint8Array;
  walletId: WalletId;
  accountName?: string;
}): Promise<InMemoryWalletAccount<MidnightAccountProps>> => {
  const generatedWallet = HDWallet.fromSeed(seed);

  if (generatedWallet.type !== 'seedOk') {
    throw new Error('Failed to generate wallet from seed');
  }

  const zswapKeyDerivationPath: DerivationPath<'Zswap'> = {
    accountIndex,
    index: 0,
    role: Roles.Zswap,
  };
  const encryptedZswapKey = await deriveAndEncryptKey(
    generatedWallet.hdWallet,
    zswapKeyDerivationPath,
    password,
  );

  const dustDerivationPath: DerivationPath<'Dust'> = {
    accountIndex,
    index: 0,
    role: Roles.Dust,
  };
  const encryptedDustKey = await deriveAndEncryptKey(
    generatedWallet.hdWallet,
    dustDerivationPath,
    password,
  );

  const nightExternalKeyDerivationPath: DerivationPath<'NightExternal'> = {
    accountIndex,
    index: 0,
    role: Roles.NightExternal,
  };
  const encryptedNightExternalKey = await deriveAndEncryptKey(
    generatedWallet.hdWallet,
    nightExternalKeyDerivationPath,
    password,
  );

  return {
    walletId,
    accountId: MidnightAccountId(walletId, accountIndex, networkId),
    networkType:
      networkId === NetworkId.NetworkId.MainNet ? 'mainnet' : 'testnet',
    blockchainNetworkId: MidnightNetworkId(networkId),
    blockchainSpecific: {
      accountIndex,
      networkId,
      nightExternalKey: {
        derivationPath: nightExternalKeyDerivationPath,
        encryptedKey: encryptedNightExternalKey,
      },
      zswapKey: {
        derivationPath: zswapKeyDerivationPath,
        encryptedKey: encryptedZswapKey,
      },
      dustKey: {
        derivationPath: dustDerivationPath,
        encryptedKey: encryptedDustKey,
      },
    },
    accountType: 'InMemory',
    blockchainName: 'Midnight',
    metadata: { name: accountName || `Midnight #${accountIndex}` },
  };
};

const resolveTargetNetworks = createBlockchainNetworkTargetResolver(
  supportedNetworkIds,
  MidnightSDKNetworkId,
);

export const createAccounts: CreateInMemoryWalletAccounts<
  MidnightAccountProps,
  MidnightSpecificInMemoryWalletData
> = async ({
  blockchainSpecific: { encryptedSeed },
  walletId,
  accountIndex,
  password,
  accountName,
  targetNetworks,
}) => {
  const targetSdkNetworkIds = resolveTargetNetworks(targetNetworks);
  const seed = await emip3decrypt(Buffer.from(encryptedSeed, 'hex'), password);

  const accounts = await Promise.all(
    targetSdkNetworkIds.map(async networkId =>
      createAccountData({
        accountIndex,
        networkId,
        password,
        seed,
        walletId,
        accountName,
      }),
    ),
  );

  seed.fill(0);

  return accounts;
};

export const initializeWallet: InitializeInMemoryWallet<
  MidnightAccountProps,
  MidnightSpecificInMemoryWalletData
> = async (props, dependencies) => {
  dependencies.logger.debug('Creating Midnight in-memory wallet');

  const blockchainSpecificWalletData = await createBlockchainSpecificWalletData(
    props,
    dependencies,
  );

  return {
    accounts: await createAccounts(
      {
        ...props,
        accountIndex: 0,
        blockchainName: 'Midnight',
        blockchainSpecific: blockchainSpecificWalletData,
      },
      dependencies,
    ),
    blockchainSpecificWalletData,
  };
};

export const createBlockchainSpecificWalletData: CreateBlockchainSpecificWalletData<
  MidnightSpecificInMemoryWalletData
> = async ({ password, recoveryPhrase }) => {
  const seed = await bip39.mnemonicToSeed(
    util.joinMnemonicWords(recoveryPhrase),
  );

  try {
    const encryptedSeed = HexBytes.fromByteArray(
      ByteArray(await emip3encrypt(seed, password)),
    );
    return { encryptedSeed };
  } finally {
    seed.fill(0);
  }
};

export const addAccounts = createAddAccounts({
  blockchainName: 'Midnight',
  createAccounts,
  createBlockchainSpecificWalletData,
});

export const createInMemoryWalletIntegration = () =>
  ({
    initializeWallet,
    createAccounts,
    addAccounts,
    blockchainName: 'Midnight',
  } satisfies InMemoryWalletIntegration<
    'Midnight',
    MidnightAccountProps,
    MidnightSpecificInMemoryWalletData
  > as InMemoryWalletIntegration);
