import { Wallet } from '@lace/cardano';
import { WalletStorage } from '@src/types/local-storage';

export const isKeyAgentDataValid = (keyAgentData: Wallet.KeyManagement.SerializableKeyAgentData): boolean =>
  '__typename' in keyAgentData &&
  'chainId' in keyAgentData &&
  'accountIndex' in keyAgentData &&
  'extendedAccountPublicKey' in keyAgentData;

export const isKeyAgentsByChainValid = (keyAgentsByChain: unknown): boolean =>
  typeof keyAgentsByChain === 'object' &&
  'Preprod' in keyAgentsByChain &&
  'Preview' in keyAgentsByChain &&
  'Mainnet' in keyAgentsByChain;

export const isWalletStorageValid = (walletStorage: WalletStorage): boolean => 'name' in walletStorage;
