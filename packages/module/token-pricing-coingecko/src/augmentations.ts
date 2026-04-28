import type { TokenPricingProvider } from '@lace-contract/token-pricing';

export type TokenPricingCoinGeckoDependencies = {
  tokenPricingProvider: TokenPricingProvider;
};

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends TokenPricingCoinGeckoDependencies {}
  interface AppConfig {
    coinGeckoApiBaseUrl: string;
  }
}
