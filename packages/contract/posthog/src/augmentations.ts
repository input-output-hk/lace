import '@lace-contract/module';

import type {
  PostHogRelatedAppConfig,
  PostHogRelatedSideEffectDependencies,
} from './types';

declare module '@lace-contract/module' {
  interface AppConfig extends PostHogRelatedAppConfig {}
  interface SideEffectDependencies
    extends PostHogRelatedSideEffectDependencies {}
}
