import { exposeApi } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { of, BehaviorSubject } from 'rxjs';
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
import { getChainNameByNetworkMagic } from '@src/utils/get-chain-name-by-network-magic';
import { UserTrackingType } from '@providers/AnalyticsProvider/analyticsTracker';

// eslint-disable-next-line no-magic-numbers
export const SESSION_LENGTH = Number(process.env.SESSION_LENGTH_IN_SECONDS || 1800) * 1000;
export const USER_ID_BYTE_SIZE = 8;

export class UserIdService implements UserIdServiceInterface {
  private randomizedUserId?: string;
  private walletBasedUserId?: string;
  private sessionTimeout?: NodeJS.Timeout;
  private userIdRestored = false;
  public userTrackingType$ = new BehaviorSubject<UserTrackingType>(UserTrackingType.Basic);

  constructor(
    private getStorage: typeof getBackgroundStorage = getBackgroundStorage,
    private setStorage: typeof setBackgroundStorage = setBackgroundStorage,
    private clearStorage: typeof clearBackgroundStorage = clearBackgroundStorage,
    private sessionLength: number = SESSION_LENGTH
  ) {}

  private async getWalletBasedUserId(networkMagic: Wallet.Cardano.NetworkMagic): Promise<string | undefined> {
    const { keyAgentsByChain, usePersistentUserId } = await this.getStorage();

    if (!keyAgentsByChain) {
      console.debug('[ANALYTICS] Key agents not found - Wallet not created yet');
      return undefined;
    }

    if (!usePersistentUserId) {
      return undefined;
    }

    if (!this.walletBasedUserId) {
      const chainName = getChainNameByNetworkMagic(networkMagic);
      const extendedAccountPublicKey = keyAgentsByChain[chainName].keyAgentData.extendedAccountPublicKey;
      this.walletBasedUserId = this.generateWalletBasedUserId(extendedAccountPublicKey);

      if (this.userTrackingType$.value !== UserTrackingType.Enhanced) {
        this.userTrackingType$.next(UserTrackingType.Enhanced);
      }
    }
    console.debug(`[ANALYTICS] getwalletBasedUserId() called (current Wallet Based ID: ${this.walletBasedUserId})`);
    // eslint-disable-next-line consistent-return
    return this.walletBasedUserId;
  }

  async getRandomizedUserId(): Promise<string> {
    if (!this.userIdRestored) {
      console.debug('[ANALYTICS] Restoring user ID...');
      await this.restoreUserId();
    }

    if (!this.randomizedUserId) {
      console.debug('[ANALYTICS] User ID not found - generating new one');
      this.randomizedUserId = randomBytes(USER_ID_BYTE_SIZE).toString('hex');
    }

    console.debug(`[ANALYTICS] getId() called (current ID: ${this.randomizedUserId})`);
    return this.randomizedUserId;
  }

  async getUserId(networkMagic: Wallet.Cardano.NetworkMagic): Promise<string> {
    const walletBasedId = await this.getWalletBasedUserId(networkMagic);

    if (!walletBasedId) {
      return await this.getRandomizedUserId();
    }

    return walletBasedId;
  }

  async getAliasProperties(networkMagic: Wallet.Cardano.NetworkMagic): Promise<{ alias: string; id: string }> {
    const id = await this.getWalletBasedUserId(networkMagic);
    const alias = await this.getRandomizedUserId();
    return { alias, id };
  }

  async clearId(): Promise<void> {
    console.debug('[ANALYTICS] clearId() called');
    this.randomizedUserId = undefined;
    this.walletBasedUserId = undefined;
    this.userTrackingType$.next(UserTrackingType.Basic);
    this.clearSessionTimeout();
    await this.clearStorage(['userId', 'usePersistentUserId']);
  }

  async makePersistent(): Promise<void> {
    console.debug('[ANALYTICS] Converting user ID into persistent');
    this.clearSessionTimeout();
    const userId = await this.getRandomizedUserId();
    await this.setStorage({ usePersistentUserId: true, userId });
    this.userTrackingType$.next(UserTrackingType.Enhanced);
  }

  async makeTemporary(): Promise<void> {
    console.debug('[ANALYTICS] Converting user ID into temporary');
    await this.setStorage({ usePersistentUserId: false, userId: undefined });
    this.setSessionTimeout();
    this.userTrackingType$.next(UserTrackingType.Basic);
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
      this.randomizedUserId = userId;
    }

    this.userIdRestored = true;
    const trackingType = usePersistentUserId ? UserTrackingType.Enhanced : UserTrackingType.Basic;
    if (trackingType !== this.userTrackingType$.value) {
      this.userTrackingType$.next(trackingType);
    }
  }

  private setSessionTimeout(): void {
    if (this.sessionTimeout) {
      return;
    }
    this.sessionTimeout = setTimeout(() => {
      this.randomizedUserId = undefined;
      console.debug('[ANALYTICS] Session timed out');
    }, this.sessionLength);
  }

  private clearSessionTimeout(): void {
    clearTimeout(this.sessionTimeout);
    this.sessionTimeout = undefined;
  }

  private generateWalletBasedUserId(extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex) {
    console.debug('[ANALYTICS] Wallet based ID not found - generating new one');
    // by requirement, we want to hash the extended account public key twice
    const hash = hashExtendedAccountPublicKey(extendedAccountPublicKey);
    return hashExtendedAccountPublicKey(hash);
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
