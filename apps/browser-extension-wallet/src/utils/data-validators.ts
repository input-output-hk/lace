import { Wallet } from '@lace/cardano';
import { WalletStorage } from '@src/types/local-storage';

export const isKeyAgentDataValid = (keyAgentData: Wallet.KeyManagement.SerializableKeyAgentData): boolean =>
  '__typename' in keyAgentData &&
  'chainId' in keyAgentData &&
  'accountIndex' in keyAgentData &&
  'knownAddresses' in keyAgentData &&
  'extendedAccountPublicKey' in keyAgentData;

export const isKeyAgentsByChainValid = (keyAgentsByChain: Wallet.KeyAgentsByChain): boolean =>
  'Preprod' in keyAgentsByChain && 'Preview' in keyAgentsByChain && 'Mainnet' in keyAgentsByChain;

export const isWalletStorageValid = (walletStorage: WalletStorage): boolean => 'name' in walletStorage;
