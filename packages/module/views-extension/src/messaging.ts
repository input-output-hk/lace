import { RemoteApiPropertyType } from '@lace-sdk/extension-messaging';

import type {
  CallHistoryMethodPayload,
  HistoryMethod,
  ViewLocation,
} from '@lace-contract/views';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';
import type { Observable } from 'rxjs';

export interface ExtensionViewApi {
  callHistoryMethod: (
    payload: Omit<CallHistoryMethodPayload<HistoryMethod>, 'viewId'>,
  ) => Promise<void>;
  close: () => Promise<void>;
  keepAlive: () => Promise<void>;
  locationChanged$: Observable<ViewLocation>;
}

export const extensionViewApiProperties: RemoteApiProperties<ExtensionViewApi> =
  {
    close: RemoteApiPropertyType.MethodReturningPromise,
    callHistoryMethod: RemoteApiPropertyType.MethodReturningPromise,
    locationChanged$: RemoteApiPropertyType.HotObservable,
    keepAlive: RemoteApiPropertyType.MethodReturningPromise,
  };
