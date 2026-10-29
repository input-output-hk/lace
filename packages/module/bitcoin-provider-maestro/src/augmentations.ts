import type { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import type { MaestroConfig } from '@lace-lib/bitcoin-provider-core';

declare module '@lace-contract/bitcoin-context' {
  interface BitcoinProviderConfig {
    /** The Maestro configuration of each Bitcoin network the wallet uses. */
    maestroConfig: Partial<Record<BitcoinNetwork, MaestroConfig>>;
  }
}
