import { createMaestroBitcoinProvider } from '@lace-lib/bitcoin-provider-core';

import type { BitcoinProviderDependencies } from '@lace-contract/bitcoin-context';
import type { LaceInit } from '@lace-contract/module';

export const initializeDependencies: LaceInit<
  BitcoinProviderDependencies
> = async (
  {
    runtime: {
      config: {
        bitcoinProvider: { maestroConfig },
      },
    },
  },
  { logger },
) => ({
  bitcoinProvider: createMaestroBitcoinProvider(maestroConfig, logger),
});
