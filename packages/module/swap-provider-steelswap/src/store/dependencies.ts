import { createSteelSwapProvider } from '../steelswap/steelswap-provider';

import type { LaceInit } from '@lace-contract/module';
import type { SwapProviderDependencies } from '@lace-contract/swap-provider';

export const initializeDependencies: LaceInit<
  SwapProviderDependencies
> = async ({ runtime: { config } }) => ({
  swapProviders: [createSteelSwapProvider(config)],
});
