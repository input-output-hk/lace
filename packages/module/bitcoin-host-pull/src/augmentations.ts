import type { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import type { MaestroConfig } from '@lace-lib/bitcoin-provider-core';

// The guest sources the free-running Bitcoin reads from maestro through the
// shared @lace-lib/bitcoin-provider-core leaves, so it needs the same
// `maestroConfig` the monolith's bitcoin-provider-maestro declares. Declaring
// the identical member here is the interface-merging precedent
// (cardano-host-pull's augmentations.ts vs the blockfrost module): TypeScript
// tolerates duplicate identical declarations, and bitcoin-provider-maestro is
// dropped from the guest loadout anyway.
declare module '@lace-contract/bitcoin-context' {
  interface BitcoinProviderConfig {
    maestroConfig: Partial<Record<BitcoinNetwork, MaestroConfig>>;
  }
}
