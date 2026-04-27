import { FEATURE_FLAGS_CHANNEL } from '@lace-contract/dapp-connector';
import { authenticatorApiProperties } from '@lace-sdk/dapp-connector';
import {
  ChannelName,
  RemoteApiPropertyType,
  consumeRemoteApi,
  runContentScriptMessageProxy,
} from '@lace-sdk/extension-messaging';
import { runtime } from 'webextension-polyfill';

import { createContentScriptModuleLoader, logger } from '../util';

const remoteApiDependencies = { logger, runtime };

const loadModules = createContentScriptModuleLoader();
const moduleApis = await loadModules('addons.dappConnectorApi');

// Proxy the feature-flags channel so injected scripts can
// check which feature flags are active before calling enable().
const featureFlagProxy = consumeRemoteApi(
  {
    baseChannel: FEATURE_FLAGS_CHANNEL,
    lazy: true,
    properties: {
      getFeatureFlags: RemoteApiPropertyType.MethodReturningPromise,
    },
  },
  remoteApiDependencies,
);

const apis = moduleApis.reduce(
  (result, moduleApi) => ({
    ...Object.fromEntries(
      moduleApi.proxy.map(props => [
        ChannelName(props.baseChannel),
        consumeRemoteApi({ ...props, lazy: true }, remoteApiDependencies),
      ]),
    ),
    ...(moduleApi.authenticator
      ? {
          [moduleApi.authenticator.baseChannelName]: consumeRemoteApi(
            {
              baseChannel: moduleApi.authenticator.baseChannelName,
              lazy: true,
              properties: authenticatorApiProperties,
            },
            remoteApiDependencies,
          ),
        }
      : {}),
    ...result,
  }),
  { [FEATURE_FLAGS_CHANNEL]: featureFlagProxy } as Record<ChannelName, object>,
);

runContentScriptMessageProxy(apis, logger);
