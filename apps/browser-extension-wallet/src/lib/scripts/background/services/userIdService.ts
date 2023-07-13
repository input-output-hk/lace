import { exposeApi, RemoteApiProperties, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';
import { clearBackgroundStorage, getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/util';
import { USER_ID_SERVICE_BASE_CHANNEL, UserIdService as UserIdServiceInterface } from '@lib/scripts/types';
import randomBytes from 'randombytes';

// eslint-disable-next-line no-magic-numbers
const SESSION_LENGTH = Number(process.env.SESSION_LENGTH_IN_SECONDS || 1800) * 1000;
const USER_ID_BYTE_SIZE = 8;

class UserIdService implements UserIdServiceInterface {
  private userId?: string;
  private sessionTimeout?: NodeJS.Timeout;
  private userIdRestored = false;

  async getId() {
    if (!this.userIdRestored) {
      console.debug('[ANALYTICS] Restoring user ID...');
      await this.restoreUserId();
    }

    if (!this.userId) {
      console.debug('[ANALYTICS] User ID not found - generating new one');
      this.userId = randomBytes(USER_ID_BYTE_SIZE).toString('hex');
    }

    console.debug(`[ANALYTICS] getId() called (current ID: ${this.userId})`);

    return this.userId;
  }

  async clearId() {
    console.debug('[ANALYTICS] clearId() called');
    this.userId = undefined;
    await setBackgroundStorage({ usePersistentUserId: false, userId: undefined });
    this.clearSessionTimeout();
    await clearBackgroundStorage(['userId', 'usePersistentUserId']);
  }

  async makePersistent() {
    console.debug('[ANALYTICS] Converting user ID into persistent');
    this.clearSessionTimeout();
    const userId = await this.getId();
    await setBackgroundStorage({ usePersistentUserId: true, userId });
  }

  async makeTemporary() {
    console.debug('[ANALYTICS] Converting user ID into temporary');
    await setBackgroundStorage({ usePersistentUserId: false, userId: undefined });
    this.setSessionTimeout();
  }

  async extendLifespan() {
    if (!this.sessionTimeout) {
      return;
    }
    console.debug('[ANALYTICS] Extending temporary ID lifespan');
    this.clearSessionTimeout();
    this.setSessionTimeout();
  }

  private async restoreUserId() {
    const { userId, usePersistentUserId } = await getBackgroundStorage();

    if (usePersistentUserId) {
      console.debug('[ANALYTICS] Restoring user ID from extension storage');
      this.userId = userId;
    }

    this.userIdRestored = true;
  }

  private setSessionTimeout() {
    if (this.sessionTimeout) {
      return;
    }
    this.sessionTimeout = setTimeout(() => {
      this.userId = undefined;
      console.debug('[ANALYTICS] Session timed out');
    }, SESSION_LENGTH);
  }

  private clearSessionTimeout() {
    clearTimeout(this.sessionTimeout);
    this.sessionTimeout = undefined;
  }
}

const userIdService = new UserIdService();

export const userIdServiceProperties: RemoteApiProperties<UserIdService> = {
  getId: RemoteApiPropertyType.MethodReturningPromise,
  clearId: RemoteApiPropertyType.MethodReturningPromise,
  makePersistent: RemoteApiPropertyType.MethodReturningPromise,
  makeTemporary: RemoteApiPropertyType.MethodReturningPromise,
  extendLifespan: RemoteApiPropertyType.MethodReturningPromise
};

exposeApi<UserIdService>(
  {
    api$: of(userIdService),
    baseChannel: USER_ID_SERVICE_BASE_CHANNEL,
    properties: userIdServiceProperties
  },
  { logger: console, runtime }
);
