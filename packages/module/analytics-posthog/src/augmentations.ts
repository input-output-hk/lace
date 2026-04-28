import type { PostHogAnalyticsDependencies } from './store/dependencies';

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends PostHogAnalyticsDependencies {}
}
