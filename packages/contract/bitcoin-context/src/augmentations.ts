import '@lace-contract/activities';

import type { BitcoinUTxO } from './bitcoin-data-provider';
import type {
  BitcoinProviderDependencies,
  BitcoinProviderConfig,
  BitcoinSpecificInMemoryWalletData,
} from './types';

export type BitcoinInFlightOutpoint = {
  readonly txId: string;
  readonly index: number;
};

export type BitcoinInFlightUtxoActivityMetadata = {
  consumedInputs: BitcoinInFlightOutpoint[];
  producedOutputs: BitcoinUTxO[];
};

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

declare module '@lace-contract/activities' {
  interface BlockchainSpecificActivityMetadata {
    Bitcoin?: BitcoinInFlightUtxoActivityMetadata;
  }
}
