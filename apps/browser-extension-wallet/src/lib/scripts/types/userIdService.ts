export const USER_ID_SERVICE_BASE_CHANNEL = 'user-id-actions';

export interface UserIdService {
  getId(): Promise<string>;
  makePersistent(): Promise<void>;
  makeTemporary(): Promise<void>;
  extendLifespan(): Promise<void>;
}
