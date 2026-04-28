import { RemoteApiPropertyType } from '@lace-sdk/extension-messaging';

import type { RemoteStore } from './types';
import type { FeatureFlag } from '@lace-contract/feature';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';

export const remoteStoreApiProperties: RemoteApiProperties<RemoteStore> = {
  dispatch: RemoteApiPropertyType.MethodReturningPromise,
  getState: RemoteApiPropertyType.MethodReturningPromise,
  state$: RemoteApiPropertyType.HotObservable,
};

export interface FeatureFlagApi {
  getFeatureFlags: () => Promise<FeatureFlag[]>;
}

export const featureFlagApiProperties: RemoteApiProperties<FeatureFlagApi> = {
  getFeatureFlags: RemoteApiPropertyType.MethodReturningPromise,
};
