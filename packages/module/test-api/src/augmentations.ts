import type { DevelopmentApi } from './types';

declare module '@lace-contract/dev' {
  interface DevelopmentGlobalApi extends DevelopmentApi {}
}
