import type {
  BitcoinProviderDependencies,
  BitcoinProviderConfig,
  BitcoinSpecificInMemoryWalletData,
} from './types';

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends BitcoinProviderDependencies {}
  interface AppConfig {
    bitcoinProvider: BitcoinProviderConfig;
  }
}

declare module '@lace-contract/wallet-repo' {
  interface BlockchainSpecificInMemoryWalletData {
    Bitcoin?: BitcoinSpecificInMemoryWalletData;
  }
}
