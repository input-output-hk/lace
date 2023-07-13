import { exposeApi, RemoteApiProperties, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';
import { clearBackgroundStorage, getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/util';
import { USER_ID_SERVICE_BASE_CHANNEL, UserIdService as UserIdServiceInterface } from '@lib/scripts/types';
import randomBytes from 'randombytes';

// eslint-disable-next-line no-magic-numbers
const SESSION_LENGTH = Number(process.env.SESSION_LENGTH_IN_SECONDS || 1800) * 1000;
const USER_ID_BYTE_SIZE = 8;

export class UserIdService implements UserIdServiceInterface {
  private userId?: string;
  private sessionTimeout?: NodeJS.Timeout;
  private userIdRestored = false;

  constructor(
    private getStorage: typeof getBackgroundStorage = getBackgroundStorage,
    private setStorage: typeof setBackgroundStorage = setBackgroundStorage,
    private clearStorage: typeof clearBackgroundStorage = clearBackgroundStorage,
    private sessionLength: number = SESSION_LENGTH
  ) {}

  async getId(): Promise<string> {
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

  async clearId(): Promise<void> {
    console.debug('[ANALYTICS] clearId() called');
    this.userId = undefined;
    await this.setStorage({ usePersistentUserId: false, userId: undefined });
    this.clearSessionTimeout();
    await this.clearStorage(['userId', 'usePersistentUserId']);
  }

  async makePersistent(): Promise<void> {
    console.debug('[ANALYTICS] Converting user ID into persistent');
    this.clearSessionTimeout();
    const userId = await this.getId();
    await this.setStorage({ usePersistentUserId: true, userId });
  }

  async makeTemporary(): Promise<void> {
    console.debug('[ANALYTICS] Converting user ID into temporary');
    await this.setStorage({ usePersistentUserId: false, userId: undefined });
    this.setSessionTimeout();
  }

  async extendLifespan(): Promise<void> {
    if (!this.sessionTimeout) {
      return;
    }
    console.debug('[ANALYTICS] Extending temporary ID lifespan');
    this.clearSessionTimeout();
    this.setSessionTimeout();
  }

  private async restoreUserId(): Promise<void> {
    const { userId, usePersistentUserId } = await this.getStorage();

    if (usePersistentUserId) {
      console.debug('[ANALYTICS] Restoring user ID from extension storage');
      this.userId = userId;
    }

    this.userIdRestored = true;
  }

  private setSessionTimeout(): void {
    if (this.sessionTimeout) {
      return;
    }
    this.sessionTimeout = setTimeout(() => {
      this.userId = undefined;
      console.debug('[ANALYTICS] Session timed out');
    }, this.sessionLength);
  }

  private clearSessionTimeout(): void {
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
