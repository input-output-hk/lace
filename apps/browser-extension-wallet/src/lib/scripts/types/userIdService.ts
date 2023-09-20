import { Wallet } from '@lace/cardano';
import { UserTrackingType } from '@providers/AnalyticsProvider/analyticsTracker';
import { Subject } from 'rxjs';
export const USER_ID_SERVICE_BASE_CHANNEL = 'user-id-actions';

export interface UserIdService {
  getUserId(networkMagic: Wallet.Cardano.NetworkMagic): Promise<string>;
  getRandomizedUserId(): Promise<string>;
  getAliasProperties(networkMagic: Wallet.Cardano.NetworkMagic): Promise<{ alias: string; id: string }>;
  clearId(): Promise<void>;
  makePersistent(): Promise<void>;
  makeTemporary(): Promise<void>;
  extendLifespan(): Promise<void>;
  userTrackingType$: Subject<UserTrackingType>;
}
