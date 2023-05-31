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
  UtxoProvider,
  CML
} from '@cardano-sdk/core';
import {
  setupWallet,
  ObservableWallet,
  SingleAddressWalletDependencies,
  storage,
  SetupWalletProps
} from '@cardano-sdk/wallet';
import * as KeyManagement from '../../../../../node_modules/@cardano-sdk/key-management/dist/cjs';
import { WalletManagerActivateProps, WalletManagerUi } from '@cardano-sdk/web-extension';
import { ChainName, WalletManagerProviderTypes } from '../types';
import * as Crypto from '@cardano-sdk/crypto';

export interface ExposedKeyAgent {
  serializableData: KeyManagement.SerializableKeyAgentData;
}

export type KeyAgentsByChain = Record<ChainName, { keyAgentData: KeyManagement.SerializableKeyAgentData }>;

export interface CardanoWallet {
  wallet: ObservableWallet;
  keyAgent: ExposedKeyAgent;
  name: string;
}
export type CardanoWalletByChain = CardanoWallet & { keyAgentsByChain: KeyAgentsByChain };
export type CardanoWalletAsync = CardanoWallet & { asyncKeyAgent: KeyManagement.AsyncKeyAgent };

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

export interface CreateSingleAddressWallet {
  providers: WalletProvidersDependencies;
  name: string;
  logger: SingleAddressWalletDependencies['logger'];
  stores: storage.WalletStores;
  keyAgent: KeyManagement.AsyncKeyAgent;
}

/**
 * Activates a wallet by calling the activate method of the walletManagerUi and passing the necessary parameters.
 */
export const activateWallet = async (
  walletManagerUi: WalletManagerUi,
  keyAgent: KeyManagement.KeyAgent,
  walletName: string,
  provider?: WalletManagerActivateProps['provider']
): Promise<void> => {
  const asyncKeyAgent = KeyManagement.util.createAsyncKeyAgent(keyAgent);
  await walletManagerUi.activate({ keyAgent: asyncKeyAgent, observableWalletName: walletName, provider });
};

/**
 * Creates an array of Cardano wallets based on the chain id and returns an object that contains the wallet and keyAgent for the active chain
 * and the key agents for all chains.
 */
export const createCardanoWalletsByChain = async (
  mnemonicWords: string[],
  getPassword: () => Promise<Uint8Array>,
  activeChainId: Cardano.ChainId,
  createWallet: SetupWalletProps<ObservableWallet, KeyManagement.KeyAgent>['createWallet']
): Promise<Omit<CardanoWalletByChain, 'name' | 'keyAgent'> & { keyAgent: KeyManagement.KeyAgent }> => {
  const keyAgentsByChain: KeyAgentsByChain = {} as KeyAgentsByChain;
  let activeChainName: ChainName;

  // Key agent for wallet to activate
  // getPassphrase referrs to user's spending password. Change introduced in https://github.com/input-output-hk/cardano-js-sdk/releases/tag/%40cardano-sdk%2Fwallet%400.8.0
  const { keyAgent: activeKeyAgent, wallet } = await setupWallet({
    createKeyAgent: async (dependencies) =>
      await KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
        {
          mnemonicWords,
          getPassphrase: getPassword,
          chainId: activeChainId
        },
        { ...dependencies }
      ),
    createWallet,
    logger: console,
    bip32Ed25519: new Crypto.CmlBip32Ed25519(CML)
  });
  for (const [chainName, chainId] of Object.entries(Cardano.ChainIds)) {
    if (chainId.networkId === activeChainId.networkId && chainId.networkMagic === activeChainId.networkMagic)
      activeChainName = chainName as ChainName;
  }
  if (!activeChainName) throw new Error('Incorrect chain supplied');
  keyAgentsByChain[activeChainName] = { keyAgentData: activeKeyAgent.serializableData };

  // Rest of key agents to be able to switch
  await Promise.all(
    Object.entries(Cardano.ChainIds)
      .filter(([chainName]) => chainName !== activeChainName)
      .map(async ([chainName, chainId]) => {
        // Create a key agent for each chain id to save in storage
        const { keyAgent } = await setupWallet({
          createKeyAgent: async (dependencies) =>
            await KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
              {
                mnemonicWords,
                getPassphrase: getPassword,
                chainId
              },
              dependencies
            ),
          createWallet,
          logger: console,
          bip32Ed25519: new Crypto.CmlBip32Ed25519(CML)
        });
        // Build object with key agents for all chains to be able to switch to eventually
        keyAgentsByChain[chainName as ChainName] = { keyAgentData: keyAgent.serializableData };
      })
  );

  return { wallet, keyAgent: activeKeyAgent, keyAgentsByChain };
};

const createAsyncKeyAgentWithCallback = (
  keyAgent: KeyManagement.KeyAgent,
  signCallback?: (result: boolean) => void
): KeyManagement.AsyncKeyAgent => {
  const asyncKeyAgent = KeyManagement.util.createAsyncKeyAgent(keyAgent);
  const wrappedSign = (...args: Parameters<KeyManagement.KeyAgent['signTransaction']>) =>
    keyAgent
      .signTransaction(...args)
      .then(async (sigs) => {
        if (signCallback)
          setTimeout(() => {
            signCallback(true);
          }, 0);
        return sigs;
      })
      .catch((error) => {
        if (signCallback)
          setTimeout(() => {
            signCallback(false);
          }, 0);
        throw new Error(error);
      });

  return { ...asyncKeyAgent, signTransaction: wrappedSign.bind(keyAgent) };
};

/**
 * Creates a Cardano wallet and activates it.
 */
export const createCardanoWallet = async (
  walletManagerUi: WalletManagerUi,
  name: string,
  mnemonicWords: string[],
  getPassword: () => Promise<Uint8Array>,
  activeChainId: Cardano.ChainId
): Promise<CardanoWalletByChain> => {
  const { wallet } = walletManagerUi;

  const createWallet = async () => wallet;
  const { keyAgent, keyAgentsByChain } = await createCardanoWalletsByChain(
    mnemonicWords,
    getPassword,
    activeChainId,
    createWallet
  );

  await activateWallet(walletManagerUi, keyAgent, name);
  return { name, wallet, keyAgent, keyAgentsByChain };
};

/**
 * Restores a wallet from a serializable key agent data.
 */
export const restoreWallet = async (
  keyAgentData: KeyManagement.SerializableKeyAgentData,
  getPassword: () => Promise<Uint8Array>,
  createWallet: SetupWalletProps<ObservableWallet, KeyManagement.KeyAgent>['createWallet']
): Promise<{ keyAgent: KeyManagement.KeyAgent; wallet: ObservableWallet }> => {
  const { keyAgent, wallet } = await setupWallet({
    createKeyAgent: async (dependencies) =>
      await KeyManagement.restoreKeyAgent(keyAgentData, dependencies, getPassword),
    createWallet,
    logger: console,
    bip32Ed25519: new Crypto.CmlBip32Ed25519(CML)
  });
  return { keyAgent, wallet };
};

/**
 * Restores a wallet from a serializable key agent data and activates it.
 */
export const restoreWalletFromKeyAgent = async (
  walletManagerUi: WalletManagerUi,
  name: string,
  keyAgentData: KeyManagement.SerializableKeyAgentData,
  getPassword: () => Promise<Uint8Array>,
  chainName: ChainName,
  activateOnRestore = true,
  callback?: (result: boolean) => void
  // eslint-disable-next-line max-params
): Promise<CardanoWalletAsync> => {
  const { wallet } = walletManagerUi;

  const createWallet = async () => wallet;
  const { keyAgent } = await restoreWallet(keyAgentData, getPassword, createWallet);
  const asyncKeyAgent = createAsyncKeyAgentWithCallback(keyAgent, callback);

  if (activateOnRestore) {
    await walletManagerUi.activate({
      keyAgent: asyncKeyAgent,
      observableWalletName: name,
      provider: {
        type: WalletManagerProviderTypes.CARDANO_SERVICES_PROVIDER,
        options: { chainName }
      }
    });
  }

  return { name, wallet, keyAgent, asyncKeyAgent };
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
  const keyAgent = await KeyManagement.restoreKeyAgent(
    keyAgentData,
    // Not needed for this
    {
      logger: console,
      bip32Ed25519: new Crypto.CmlBip32Ed25519(CML),
      inputResolver: { resolveInput: () => null }
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
  keyAgentData: KeyManagement.InMemoryKeyAgent['serializableData'],
  mnemonicWords: string[],
  // Password as string as we don't need it after validating
  password: string
): Promise<boolean> => {
  const getPassword = async () => Buffer.from(password);
  const originalKeyAgent = await KeyManagement.restoreKeyAgent(
    keyAgentData,
    // Not needed for this
    {
      logger: console,
      bip32Ed25519: new Crypto.CmlBip32Ed25519(CML),
      inputResolver: { resolveInput: () => null }
    },
    getPassword
  );
  // To verify password
  const originalChallenge = await Challenge.sign(originalKeyAgent);
  const validatingKeyAgent = await KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      mnemonicWords,
      chainId: originalKeyAgent.chainId,
      getPassphrase: getPassword
    },
    // Not needed for this
    {
      logger: console,
      bip32Ed25519: new Crypto.CmlBip32Ed25519(CML),
      inputResolver: { resolveInput: () => null }
    }
  );
  const validatingChallenge = await Challenge.sign(validatingKeyAgent);

  const originalPublicKey = originalKeyAgent.extendedAccountPublicKey;
  const validatingPublicKey = validatingKeyAgent.extendedAccountPublicKey;

  return originalPublicKey === validatingPublicKey && Challenge.check(originalChallenge, validatingChallenge);
};

export const shutdownWallet = async (walletManagerUi: WalletManagerUi): Promise<void> => {
  // Use wallet manager UI to shutdown the wallet
  await walletManagerUi.destroy();
  // await walletManagerUi.clearStore(walletId);
};

export const switchKeyAgents = async (
  walletManagerUi: WalletManagerUi,
  walletName: string,
  asyncKeyAgent: KeyManagement.AsyncKeyAgent,
  chainName: ChainName
): Promise<ObservableWallet> => {
  await walletManagerUi.activate({
    keyAgent: asyncKeyAgent,
    observableWalletName: walletName,
    provider: {
      type: WalletManagerProviderTypes.CARDANO_SERVICES_PROVIDER,
      options: { chainName }
    }
  });
  return walletManagerUi.wallet;
};
