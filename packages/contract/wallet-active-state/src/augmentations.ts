import type { WalletActiveStateDependencies } from './types';

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends WalletActiveStateDependencies {}
}
