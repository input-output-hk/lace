import type { PassportFlowDependencies } from './store/dependencies';

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends PassportFlowDependencies {}
}
