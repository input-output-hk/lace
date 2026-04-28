import {
  ChannelName,
  consumeRemoteApi,
  exposeApi,
  RemoteApiPropertyType,
} from '@lace-sdk/extension-messaging';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

import type { AvailableAddons } from '..';
import type {
  ActivityChannelExtension,
  ReportActivityChannel,
} from '@lace-contract/app-lock';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';

const activityChannelConfig = {
  baseChannel: ChannelName('activity-channel'),
  properties: {
    reportActivity: RemoteApiPropertyType.MethodReturningPromise,
  } satisfies RemoteApiProperties<ReportActivityChannel>,
};

const activityChannelExtension: ContextualLaceInit<
  ActivityChannelExtension,
  AvailableAddons
> = (_, { logger }) => ({
  exposeActivityChannel: channel => {
    exposeApi<ReportActivityChannel>(
      {
        ...activityChannelConfig,
        api$: of(channel),
      },
      { logger, runtime },
    );
  },
  consumeActivityChannel: () =>
    consumeRemoteApi<ReportActivityChannel>(activityChannelConfig, {
      logger,
      runtime,
    }),
});

export default activityChannelExtension;
