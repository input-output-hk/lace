import { exposeApi } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';
import {
  clearBackgroundStorage,
  getBackgroundStorage,
  hashExtendedAccountPublicKey,
  setBackgroundStorage
} from '@lib/scripts/background/util';
import { USER_ID_SERVICE_BASE_CHANNEL, UserIdService as UserIdServiceInterface } from '@lib/scripts/types';
import randomBytes from 'randombytes';
import { userIdServiceProperties } from '../config';

// eslint-disable-next-line no-magic-numbers
export const SESSION_LENGTH = Number(process.env.SESSION_LENGTH_IN_SECONDS || 1800) * 1000;
export const USER_ID_BYTE_SIZE = 8;

export class UserIdService implements UserIdServiceInterface {
  private userId?: string;
  private hashId?: string;
  private sessionTimeout?: NodeJS.Timeout;
  private userIdRestored = false;

  constructor(
    private getStorage: typeof getBackgroundStorage = getBackgroundStorage,
    private setStorage: typeof setBackgroundStorage = setBackgroundStorage,
    private clearStorage: typeof clearBackgroundStorage = clearBackgroundStorage,
    private sessionLength: number = SESSION_LENGTH
  ) {}

  async getIsPersistentId(): Promise<boolean> {
    const { usePersistentUserId } = await this.getStorage();
    return usePersistentUserId;
  }

  async getHashId(chainName: Wallet.ChainName): Promise<string> {
    console.debug('[ANALYTICS] Getting key agents');
    const keyAgentsByChain = (await this.getStorage())?.keyAgentsByChain;

    if (!keyAgentsByChain) {
      console.debug('[ANALYTICS] Key agents not found - Wallet not created yet');
      return this.hashId;
    }

    if (!this.hashId) {
      console.debug('[ANALYTICS] Hash ID not found - generating new one');
      const hash = hashExtendedAccountPublicKey(keyAgentsByChain[chainName].keyAgentData.extendedAccountPublicKey);
      this.hashId = hashExtendedAccountPublicKey(hash);
    }
    console.debug(`[ANALYTICS] getHashId() called (current Hash ID: ${this.hashId})`);
    return this.hashId;
  }

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
    this.hashId = undefined;
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

exposeApi<UserIdServiceInterface>(
  {
    api$: of(userIdService),
    baseChannel: USER_ID_SERVICE_BASE_CHANNEL,
    properties: userIdServiceProperties
  },
  { logger: console, runtime }
);
