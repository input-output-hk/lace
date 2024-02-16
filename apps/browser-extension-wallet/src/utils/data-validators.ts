import { Wallet } from '@lace/cardano';

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
