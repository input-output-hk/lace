import { WalletManagerApi, WalletRepositoryApi, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { BehaviorSubject, ReplaySubject, combineLatest, distinctUntilChanged } from 'rxjs';
import { getActiveWallet, hashExtendedAccountPublicKey } from '@lib/scripts/background/util';
import { UserId, UserIdService as UserIdServiceInterface } from '@lib/scripts/types';
import randomBytes from 'randombytes';
import { UserTrackingType } from '@providers/AnalyticsProvider/analyticsTracker';
import isUndefined from 'lodash/isUndefined';
import { clearBackgroundStorage, getBackgroundStorage, setBackgroundStorage } from '../storage';
import { logger } from '@lace/common';

export type UserIdServiceStorage = {
  get: typeof getBackgroundStorage;
  set: typeof setBackgroundStorage;
  clear: typeof clearBackgroundStorage;
};

// eslint-disable-next-line no-magic-numbers
export const SESSION_LENGTH = Number(process.env.SESSION_LENGTH_IN_SECONDS || 1800) * 1000;
export const USER_ID_BYTE_SIZE = 8;

export class UserIdService implements UserIdServiceInterface {
  private randomizedUserId?: string;
  private walletBasedUserId?: string;
  private sessionTimeout?: NodeJS.Timeout;
  private userIdRestored = false;
  public userId$: ReplaySubject<UserId> = new ReplaySubject();
  private userTrackingType$: BehaviorSubject<UserTrackingType> = new BehaviorSubject(UserTrackingType.Basic);
  private hasNewSessionStarted = false;

  constructor(
    private walletRepository: WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>,
    private walletManager: WalletManagerApi,
    private storage: UserIdServiceStorage = {
      clear: clearBackgroundStorage,
      get: getBackgroundStorage,
      set: setBackgroundStorage
    },
    private sessionLength: number = SESSION_LENGTH
  ) {
    combineLatest([
      this.userTrackingType$.pipe(distinctUntilChanged()),
      this.walletManager.activeWalletId$.pipe(
        distinctUntilChanged((a, b) => a?.walletId === b?.walletId && a?.accountIndex === b?.accountIndex)
      )
    ]).subscribe(async ([type]) => {
      const id = await this.getUserId();
      this.userId$.next({
        type,
        id
      });
    });
  }

  async init(): Promise<void> {
    if (!this.userIdRestored) {
      logger.debug('[ANALYTICS] Restoring user ID...');
      await this.restoreUserId();
    }

    if (!this.randomizedUserId) {
      logger.debug('[ANALYTICS] User ID not found - generating new one');
      this.randomizedUserId = randomBytes(USER_ID_BYTE_SIZE).toString('hex');
    }
  }

  private async getWalletBasedUserId(): Promise<string | undefined> {
    const active = await getActiveWallet({
      walletManager: this.walletManager,
      walletRepository: this.walletRepository
    });
    if (!active) return;

    const { usePersistentUserId } = await this.storage.get();

    if (!usePersistentUserId) {
      return undefined;
    }

    if (!this.walletBasedUserId) {
      const extendedAccountPublicKey =
        active.wallet.type === WalletType.Script
          ? active.wallet.metadata.multiSigExtendedPublicKey
          : active.account.extendedAccountPublicKey;
      this.walletBasedUserId = this.generateWalletBasedUserId(extendedAccountPublicKey);

      if (this.userTrackingType$.value !== UserTrackingType.Enhanced) {
        this.userTrackingType$.next(UserTrackingType.Enhanced);
      }
    }
    logger.debug(`[ANALYTICS] getwalletBasedUserId() called (current Wallet Based ID: ${this.walletBasedUserId})`);
    // eslint-disable-next-line consistent-return
    return this.walletBasedUserId;
  }

  // TODO: make this method private when Motamo is not longer in use
  async getRandomizedUserId(): Promise<string> {
    await this.init();

    logger.debug(`[ANALYTICS] getId() called (current ID: ${this.randomizedUserId})`);
    return this.randomizedUserId;
  }

  async getUserId(): Promise<string> {
    const walletBasedId = await this.getWalletBasedUserId();

    if (!walletBasedId) {
      return await this.getRandomizedUserId();
    }

    return walletBasedId;
  }

  async getAliasProperties(): Promise<{ alias: string; id: string }> {
    const id = await this.getWalletBasedUserId();
    const alias = await this.getRandomizedUserId();
    return { alias, id };
  }

  async resetToDefaultValues(): Promise<void> {
    const { usePersistentUserId, userId } = await this.storage.get();
    if (isUndefined(usePersistentUserId) && isUndefined(userId)) {
      await this.clearId();
      this.userIdRestored = false;
    }
  }

  async clearId(): Promise<void> {
    logger.debug('[ANALYTICS] clearId() called');
    this.randomizedUserId = undefined;
    this.walletBasedUserId = undefined;
    this.clearSessionTimeout();
    this.hasNewSessionStarted = false;
    await this.storage.clear({ keys: ['userId', 'usePersistentUserId'] });
    this.userTrackingType$.next(UserTrackingType.Basic);
  }

  async makePersistent(): Promise<void> {
    logger.debug('[ANALYTICS] Converting user ID into persistent');
    this.clearSessionTimeout();
    this.setSessionTimeout();
    const userId = await this.getRandomizedUserId();
    await this.storage.set({ usePersistentUserId: true, userId });
    this.userId$.next({
      id: userId,
      type: UserTrackingType.Enhanced
    });
    this.userTrackingType$.next(UserTrackingType.Enhanced);
  }

  async makeTemporary(): Promise<void> {
    logger.debug('[ANALYTICS] Converting user ID into temporary');
    await this.storage.set({ usePersistentUserId: false, userId: undefined });
    this.setSessionTimeout();
    this.userTrackingType$.next(UserTrackingType.Basic);
  }

  async extendLifespan(): Promise<void> {
    logger.debug('[ANALYTICS] Extending temporary ID lifespan');
    this.clearSessionTimeout();
    this.setSessionTimeout();
  }

  private async restoreUserId(): Promise<void> {
    const { userId, usePersistentUserId } = await this.storage.get();

    if (usePersistentUserId) {
      logger.debug('[ANALYTICS] Restoring user ID from extension storage');
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
      if (this.userTrackingType$.value === UserTrackingType.Basic) {
        this.randomizedUserId = undefined;
      }
      this.hasNewSessionStarted = false;
    }, this.sessionLength);
  }

  private clearSessionTimeout(): void {
    clearTimeout(this.sessionTimeout);
    this.sessionTimeout = undefined;
  }

  generateWalletBasedUserId(extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex): string {
    logger.debug('[ANALYTICS] Wallet based ID not found - generating new one');
    // by requirement, we want to hash the extended account public key twice
    const hash = hashExtendedAccountPublicKey(extendedAccountPublicKey);
    return hashExtendedAccountPublicKey(hash);
  }

  async isNewSession(): Promise<boolean> {
    const isNewSession = !this.hasNewSessionStarted;
    this.hasNewSessionStarted = true;
    return isNewSession;
  }
}
