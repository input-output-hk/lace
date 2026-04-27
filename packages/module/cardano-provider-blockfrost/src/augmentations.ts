import type { BlockfrostConfig } from './store/dependencies';
import type { Cardano } from '@cardano-sdk/core';

declare module '@lace-contract/cardano-context' {
  interface CardanoProviderConfig {
    blockfrostConfigs: Partial<Record<Cardano.NetworkMagic, BlockfrostConfig>>;
  }
}
