import type { VaultInMemoryAppConfig } from './types';

declare module '@lace-contract/module' {
  interface AppConfig extends VaultInMemoryAppConfig {}
}
