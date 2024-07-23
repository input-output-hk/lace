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
import { ObservableWallet, BaseWalletDependencies, storage, restoreKeyAgent } from '@cardano-sdk/wallet';
import * as KeyManagement from '@cardano-sdk/key-management';
import { AnyWallet, Bip32WalletAccount, SigningCoordinatorConfirmationApi } from '@cardano-sdk/web-extension';
import { ChainName } from '../types';
import * as Crypto from '@cardano-sdk/crypto';
import { Wallet } from '@src/index';
import { HexBlob } from '@cardano-sdk/util';

export const bip32Ed25519 = new Crypto.SodiumBip32Ed25519();

export type KeyAgentsByChain = Record<ChainName, { keyAgentData: KeyManagement.SerializableKeyAgentData }>;

export interface WalletMetadata {
  name: string;
  lockValue?: HexBlob;
  lastActiveAccountIndex?: number;
  walletAddresses?: Cardano.PaymentAddress[];
  multiSigExtendedPublicKey?: Wallet.Crypto.Bip32PublicKeyHex;
  coSigners?: { sharedWalletKey: string; name: string }[];
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
  logger: BaseWalletDependencies['logger'];
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

/**
 * Compare extended account public key derived from the mnemonic with the provided one.
 */
export const validateWalletMnemonic = async (
  mnemonicWords: string[],
  expectedExtendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex
): Promise<boolean> => {
  // To verify password
  const validatingKeyAgent = await KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      mnemonicWords,
      // XPUB is the same for all networks, but we're deriving it by creating a key agent which has chainId as a required parameter.
      // Ideally we would have a util that just derives the xpub without the redundant parameters.
      chainId: Cardano.ChainIds.Mainnet, // does not matter
      getPassphrase: async () => Buffer.from('doesnt matter')
    },
    {
      logger: console,
      bip32Ed25519
    }
  );

  const originalPublicKey = expectedExtendedAccountPublicKey;
  const validatingPublicKey = validatingKeyAgent.extendedAccountPublicKey;

  return originalPublicKey === validatingPublicKey;
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
