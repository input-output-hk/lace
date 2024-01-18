/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unicorn/no-null */
import {
  AssetProvider,
  Cardano,
  ChainHistoryProvider,
  NetworkInfoProvider,
  RewardsProvider,
  StakePoolProvider,
  TxSubmitProvider,
  util as coreUtil,
  UtxoProvider
} from '@cardano-sdk/core';
import { ObservableWallet, PersonalWalletDependencies, storage, restoreKeyAgent } from '@cardano-sdk/wallet';
import * as KeyManagement from '@cardano-sdk/key-management';
import {
  AnyWallet,
  Bip32WalletAccount,
  WalletManagerApi,
  SigningCoordinatorConfirmationApi
} from '@cardano-sdk/web-extension';
import { ChainName } from '../types';
import * as Crypto from '@cardano-sdk/crypto';
// Using nodejs CML version to satisfy the tests requirements, but this gets replaced by webpack to the browser version in the build
import * as CML from '@dcspark/cardano-multiplatform-lib-nodejs';
import { Wallet } from '@src/index';
import { HexBlob } from '@cardano-sdk/util';

export const bip32Ed25519 = new Crypto.CmlBip32Ed25519(CML);

export type KeyAgentsByChain = Record<ChainName, { keyAgentData: KeyManagement.SerializableKeyAgentData }>;

export interface WalletMetadata {
  name: string;
  lockValue?: HexBlob;
}

export interface AccountMetadata {
  name: string;
}

export interface CardanoWallet {
  wallet: ObservableWallet;
  source: {
    wallet: AnyWallet<WalletMetadata, AccountMetadata>;
    account?: Bip32WalletAccount<AccountMetadata>;
  };
  name: string;
  signingCoordinator: SigningCoordinatorConfirmationApi<WalletMetadata, AccountMetadata>;
}

export type CreateStores = (name: string) => storage.WalletStores;

export interface WalletProvidersDependencies {
  stakePoolProvider: StakePoolProvider;
  assetProvider: AssetProvider;
  txSubmitProvider: TxSubmitProvider;
  networkInfoProvider: NetworkInfoProvider;
  utxoProvider: UtxoProvider;
  rewardsProvider: RewardsProvider;
  chainHistoryProvider: ChainHistoryProvider;
}

export interface CreatePersonalWallet {
  providers: WalletProvidersDependencies;
  name: string;
  logger: PersonalWalletDependencies['logger'];
  stores: storage.WalletStores;
  keyAgent: KeyManagement.AsyncKeyAgent;
}

/**
 * Restores a wallet from a serializable key agent data.
 */
export const restoreWallet = async (
  keyAgentData: KeyManagement.SerializableKeyAgentData,
  getPassword: () => Promise<Uint8Array>
): Promise<{ keyAgent: KeyManagement.KeyAgent }> => {
  const keyAgent = await restoreKeyAgent(keyAgentData, { logger: console, bip32Ed25519 }, getPassword);
  return { keyAgent };
};

type Challenge = KeyManagement.SignBlobResult;
const Challenge = {
  /**
   * Trigger `keyAgent` to ask for password and thus - verify if the right key/password is provided
   */
  sign: async (keyAgent: KeyManagement.KeyAgent): Promise<Challenge> => {
    const addressPath: KeyManagement.AccountKeyDerivationPath = { role: KeyManagement.KeyRole.External, index: 0 };
    const challengeBlob = coreUtil.bytesToHex(Buffer.from('challenge', 'utf8'));
    return keyAgent.signBlob(addressPath, challengeBlob);
  },
  /**
   * Check, whether received challenge maches the expected one
   */
  check: (expected: Challenge, actual: Challenge): boolean =>
    expected.signature === actual.signature && expected.publicKey === actual.publicKey
};

export const validateWalletPassword = async (
  keyAgentData: KeyManagement.InMemoryKeyAgent['serializableData'],
  // Password as string as we don't need it after validating
  password: string
): Promise<boolean> => {
  const getPassword = async () => Buffer.from(password);
  const keyAgent = await restoreKeyAgent(
    keyAgentData,
    // Not needed for this
    {
      logger: console,
      bip32Ed25519
    },
    getPassword
  );
  try {
    // Trigger getPassword without reaching for the private key directly
    await Challenge.sign(keyAgent);
  } catch {
    // If password is wrong it will throw `Failed to decrypt root private key`
    return false;
  }
  return true;
};

export const validateWalletMnemonic = async (
  mnemonicWords: string[],
  expectedExtendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex
): Promise<boolean> => {
  // To verify password
  const validatingKeyAgent = await KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      mnemonicWords,
      chainId: Cardano.ChainIds.Mainnet, // does not matter
      getPassphrase: async () => Buffer.from('doesnt matter')
    },
    {
      logger: console,
      bip32Ed25519
    }
  );

  // REVIEW: I think this is redundant, because if it derives the same xpub then it's the same mnemonic
  // const validatingChallenge = await Challenge.sign(validatingKeyAgent);

  const originalPublicKey = expectedExtendedAccountPublicKey;
  const validatingPublicKey = validatingKeyAgent.extendedAccountPublicKey;

  return originalPublicKey === validatingPublicKey;
};

export const shutdownWallet = async (walletManager: WalletManagerApi): Promise<void> => {
  // Use wallet manager UI to shutdown the wallet
  // REVIEW: do we want to clear all wallet data here?
  await walletManager.deactivate();
};

export const createKeyAgent = (
  keyAgentData: KeyManagement.SerializableKeyAgentData,
  getPassword: () => Promise<Uint8Array>
): Promise<KeyManagement.KeyAgent> =>
  restoreKeyAgent(
    keyAgentData,
    {
      logger: console,
      bip32Ed25519
    },
    getPassword
  );
