import type { InMemoryWalletIntegration } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { BlockchainName } from '@lace-lib/util-store';

declare module '@lace-contract/module' {
  interface LaceAddons {
    readonly loadInMemoryWalletIntegration: DynamicallyLoadedInit<
      // TODO: not sure why there is a type error when using the default 'unknown' type for blockchain-specific data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      InMemoryWalletIntegration<BlockchainName, any, any>
    >;
  }
}
