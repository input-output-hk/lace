import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { USER_ID_SERVICE_BASE_CHANNEL, UserIdService } from '@lib/scripts/types';
import { userIdServiceProperties } from '@lib/scripts/background/services';
import { runtime } from 'webextension-polyfill';

export const getUserIdService = (): UserIdService =>
  consumeRemoteApi<UserIdService>(
    {
      baseChannel: USER_ID_SERVICE_BASE_CHANNEL,
      properties: userIdServiceProperties
    },
    { runtime, logger: console }
  );
