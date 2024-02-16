import { exposeApi } from '@cardano-sdk/web-extension';
import { userIdServiceProperties } from '../config';
import * as wallet from '../wallet';
import { UserIdService } from './userIdService';
import { USER_ID_SERVICE_BASE_CHANNEL, UserIdService as UserIdServiceInterface } from '@lib/scripts/types';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

// This was hoisted from userIdService.ts so that it's not being exposed while running the unit tests of the class itself.
// It might be a good idea to follow the pattern and hoist all exposeApi calls to this file.
const userIdService = new UserIdService(wallet.walletRepository, wallet.walletManager);
exposeApi<UserIdServiceInterface>(
  {
    api$: of(userIdService),
    baseChannel: USER_ID_SERVICE_BASE_CHANNEL,
    properties: userIdServiceProperties
  },
  { logger: console, runtime }
);
