import type { ViewsExtensionDependencies } from './store/dependencies';

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends ViewsExtensionDependencies {}
}
