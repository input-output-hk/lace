import type {
  DappConnectorPlatformDependencies,
  DappConnectorApi,
} from './contract';
import type { DappConnectorStoreState } from './store/init';

declare module '@lace-contract/module' {
  interface State extends DappConnectorStoreState {}
  interface SideEffectDependencies extends DappConnectorPlatformDependencies {}
  interface LaceAddons {
    readonly dappConnectorApi: DappConnectorApi<unknown>;
  }
}
