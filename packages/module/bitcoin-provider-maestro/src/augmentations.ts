import type { MaestroConfig } from './store/dependencies';
import type { BitcoinNetwork } from '@lace-contract/bitcoin-context';

declare module '@lace-contract/bitcoin-context' {
  interface BitcoinProviderConfig {
    maestroConfig: Partial<Record<BitcoinNetwork, MaestroConfig>>;
  }
}
