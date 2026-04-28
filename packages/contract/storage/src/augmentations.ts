import type { StorageDependencies } from './types';

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends StorageDependencies {}
}
