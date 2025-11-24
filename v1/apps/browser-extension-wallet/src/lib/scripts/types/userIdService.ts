import { Wallet } from '@lace/cardano';
import { UserTrackingType } from '@providers/AnalyticsProvider/analyticsTracker';
import { Observable } from 'rxjs';
export const USER_ID_SERVICE_BASE_CHANNEL = 'user-id-actions';

export type UserId = { type: UserTrackingType; id: string };

export interface UserIdService {
  userId$: Observable<UserId>;
  getUserId(networkMagic: Wallet.Cardano.NetworkMagic): Promise<string>;
  getRandomizedUserId(): Promise<string>;
  getAliasProperties(networkMagic: Wallet.Cardano.NetworkMagic): Promise<{ alias: string; id: string }>;
  clearId(): Promise<void>;
  makePersistent(): Promise<void>;
  makeTemporary(): Promise<void>;
  extendLifespan(): Promise<void>;
  resetToDefaultValues(): Promise<void>;
  isNewSession(): Promise<boolean>;
  generateWalletBasedUserId(extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex): string;
}
