import type { WalletsState } from './store/init';
import type { WalletIdentity } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { RequestHWConnection, SearchHWDevices } from '@lace-lib/util-hw';

declare module '@lace-contract/module' {
  interface State extends WalletsState {}

  interface LaceAddons {
    readonly loadRequestHWConnections: DynamicallyLoadedInit<RequestHWConnection>;
    readonly loadSearchHWDevices: DynamicallyLoadedInit<SearchHWDevices>;
    readonly loadWalletIdentity: DynamicallyLoadedInit<WalletIdentity>;
  }
}
