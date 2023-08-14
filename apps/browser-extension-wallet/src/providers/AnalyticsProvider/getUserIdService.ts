import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { userIdServiceProperties } from '@lib/scripts/background/config';
import { USER_ID_SERVICE_BASE_CHANNEL, UserIdService } from '@lib/scripts/types';
import { runtime } from 'webextension-polyfill';

export const getUserIdService = (): UserIdService =>
  consumeRemoteApi<UserIdService>(
    {
      baseChannel: USER_ID_SERVICE_BASE_CHANNEL,
      properties: userIdServiceProperties
    },
    { runtime, logger: console }
  );
