import { RemoteApiPropertyType } from '@lace-sdk/extension-messaging';

import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';
import type { Observable } from 'rxjs';

export type SupportedNetworkIds$ = Observable<MidnightSDKNetworkId[]>;

export type SupportedNetworkIdsChannel = {
  supportedNetworkIds$: SupportedNetworkIds$;
};

export const supportedNetworksChannelProperties: RemoteApiProperties<SupportedNetworkIdsChannel> =
  {
    supportedNetworkIds$: RemoteApiPropertyType.HotObservable,
  };
