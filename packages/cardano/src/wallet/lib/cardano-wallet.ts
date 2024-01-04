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
  SignerManagerConfirmationApi,
  WalletManagerApi
} from '@cardano-sdk/web-extension';
import { ChainName } from '../types';
import * as Crypto from '@cardano-sdk/crypto';
// Using nodejs CML version to satisfy the tests requirements, but this gets replaced by webpack to the browser version in the build
import * as CML from '@dcspark/cardano-multiplatform-lib-nodejs';
import { Wallet } from '@src/index';
import { HexBlob } from '@cardano-sdk/util';

export const bip32Ed25519 = new Crypto.CmlBip32Ed25519(CML);

export type KeyAgentsByChain = Record<ChainName, { keyAgentData: KeyManagement.SerializableKeyAgentData }>;

export interface Metadata {
  name: string;
  lockValue?: HexBlob;
}

export interface CardanoWallet {
  wallet: ObservableWallet;
  source: {
    wallet: AnyWallet<Metadata>;
    account?: Bip32WalletAccount<Metadata>;
  };
  name: string;
  signerManager: SignerManagerConfirmationApi<Metadata>;
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
 * Creates an array of Cardano wallets based on the chain id and returns an object that contains the wallet and keyAgent for the active chain
 * and the key agents for all chains.
 */
export const createCardanoWalletsByChain = async (
  _mnemonicWords: string[],
  _getPassword: () => Promise<Uint8Array>,
  _activeChainId: Cardano.ChainId
): Promise<Pick<CardanoWallet, 'signerManager'>> => {
  throw new Error('Not implemented2');
  // const keyAgentsByChain: KeyAgentsByChain = {} as KeyAgentsByChain;
  // let activeChainName: ChainName;

  // const setup = async ({ chainId }: { chainId: Cardano.ChainId }) => {
  //   const keyAgent = await KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
  //     {
  //       mnemonicWords,
  //       getPassphrase: getPassword,
  //       chainId
  //     },
  //     { logger: console, bip32Ed25519 }
  //   );

  //   return { keyAgent };
};

// Key agent for wallet to activate
// getPassphrase referrs to user's spending password. Change introduced in https://github.com/input-output-hk/cardano-js-sdk/releases/tag/%40cardano-sdk%2Fwallet%400.8.0
// const { keyAgent: activeKeyAgent } = await setup({ chainId: activeChainId });
// for (const [chainName, chainId] of Object.entries(Cardano.ChainIds)) {
//   if (chainId.networkId === activeChainId.networkId && chainId.networkMagic === activeChainId.networkMagic)
//     activeChainName = chainName as ChainName;
// }
// if (!activeChainName) throw new Error('Incorrect chain supplied');
// keyAgentsByChain[activeChainName] = { keyAgentData: activeKeyAgent.serializableData };

// // Rest of key agents to be able to switch
// await Promise.all(
//   Object.entries(Cardano.ChainIds)
//     .filter(([chainName]) => chainName !== activeChainName)
//     .map(async ([chainName, chainId]) => {
//       // Create a key agent for each chain id to save in storage
//       const { keyAgent } = await setup({ chainId });

//       // Build object with key agents for all chains to be able to switch to eventually
//       keyAgentsByChain[chainName as ChainName] = { keyAgentData: keyAgent.serializableData };
//     })
// );

// return { keyAgent: activeKeyAgent, keyAgentsByChain };
// };

// const createAsyncKeyAgentWithCallback = (
//   keyAgent: KeyManagement.KeyAgent,
//   signCallback?: (result: boolean) => void
// ): KeyManagement.AsyncKeyAgent => {
//   const asyncKeyAgent = KeyManagement.util.createAsyncKeyAgent(keyAgent);
//   // TODO: LW-7807 revise the sdk cip30 implementation
//   const wrappedSign = (...args: Parameters<KeyManagement.KeyAgent['signTransaction']>) =>
//     keyAgent
//       .signTransaction(...args)
//       .then(async (sigs) => {
//         if (signCallback)
//           setTimeout(() => {
//             signCallback(true);
//           }, 0);
//         return sigs;
//       })
//       .catch((error) => {
//         if (signCallback)
//           setTimeout(() => {
//             signCallback(false);
//           }, 0);
//         throw new Error(error);
//       });

//   return { ...asyncKeyAgent, signTransaction: wrappedSign.bind(keyAgent) };
// };

/**
 * Creates a Cardano wallet and activates it.
 */
export const createCardanoWallet = async (
  _walletManager: WalletManagerApi,
  _name: string,
  _mnemonicWords: string[],
  _getPassword: () => Promise<Uint8Array>,
  _activeChainId: Cardano.ChainId
): Promise<CardanoWallet> => {
  // const { wallet } = walletManager;
  // const { keyAgent, keyAgentsByChain } = await createCardanoWalletsByChain(mnemonicWords, getPassword, activeChainId);
  // const asyncKeyAgent = KeyManagement.util.createAsyncKeyAgent(keyAgent);
  // await walletManager.activate({ keyAgent: asyncKeyAgent, observableWalletName: name });
  // return { asyncKeyAgent, name, wallet, keyAgent, keyAgentsByChain };
  throw new Error('Not implemented');
};

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

/**
 * Restores a wallet from a serializable key agent data and activates it.
 */
export const restoreWalletFromKeyAgent = async (
  _walletManager: WalletManagerApi,
  _name: string,
  _keyAgentData: KeyManagement.SerializableKeyAgentData,
  _getPassword: () => Promise<Uint8Array>,
  _chainName: ChainName,
  _activateOnRestore = true,
  _callback?: (result: boolean) => void
  // eslint-disable-next-line max-params
): Promise<CardanoWallet> => {
  throw new Error('Not implemented');
  // const { wallet } = walletManager;

  // const { keyAgent } = await restoreWallet(keyAgentData, getPassword);
  // // TODO: LW-7807 revise the sdk cip30 implementation
  // const asyncKeyAgent = createAsyncKeyAgentWithCallback(keyAgent, callback);

  // if (activateOnRestore) {
  //   await walletManager.activate({
  //     keyAgent: asyncKeyAgent,
  //     observableWalletName: name,
  //     provider: {
  //       type: WalletManagerProviderTypes.CARDANO_SERVICES_PROVIDER,
  //       options: { chainName }
  //     }
  //   });
  // }

  // return { name, wallet, keyAgent, asyncKeyAgent };
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
