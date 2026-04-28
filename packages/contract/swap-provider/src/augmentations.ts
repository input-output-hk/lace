import type { SwapProviderDependencies } from './types';

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends SwapProviderDependencies {}
}
