import type { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import type { MaestroConfig } from '@lace-lib/bitcoin-provider-core';

declare module '@lace-contract/bitcoin-context' {
  interface BitcoinProviderConfig {
    maestroConfig: Partial<Record<BitcoinNetwork, MaestroConfig>>;
  }
}
