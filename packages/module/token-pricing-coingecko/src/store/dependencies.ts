import { createCoinGeckoProvider } from '../coingecko-provider';

import type { LaceInitSync } from '@lace-contract/module';
import type { TokenPricingProviderDependency } from '@lace-contract/token-pricing';

export const initializeDependencies: LaceInitSync<
  TokenPricingProviderDependency
> = ({ runtime: { config } }) => ({
  tokenPricingProvider: createCoinGeckoProvider(config.coinGeckoApiBaseUrl),
});
