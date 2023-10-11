import { BackgroundStorage } from '@lib/scripts/types';
import { mockKeyAgentsByChain } from '@src/utils/mocks/test-helpers';
import { SESSION_LENGTH, USER_ID_BYTE_SIZE, UserIdService } from '.';
import * as utils from '../util';
import { UserTrackingType } from '@providers/AnalyticsProvider/analyticsTracker';

const mockWalletBasedId =
  '15d632f6b0ab82c72a194d634d8783ea0ef5419c8a8f638cb0c3fc49280e0a0285fc88fbfad04554779d19bec4ab30e5afee2f9ee736ba090c2213d98fe3a475';

const generateStorageMocks = (
  store: Pick<BackgroundStorage, 'usePersistentUserId' | 'userId' | 'keyAgentsByChain'> = {}
) => ({
  getStorageMock: jest.fn(() => Promise.resolve(store)),
  setStorageMock: jest.fn(),
  clearStorageMock: jest.fn()
});

describe('userIdService', () => {
  describe('restoring persistent user id', () => {
    it('should restore a persistent user id', async () => {
      const store = {
        usePersistentUserId: true,
        userId: 'test'
      };
      const { getStorageMock } = generateStorageMocks(store);
      const userIdService = new UserIdService(getStorageMock);
      expect(await userIdService.getRandomizedUserId()).toEqual(store.userId);
    });

    it('should generate a random user id if none was stored', async () => {
      const { getStorageMock } = generateStorageMocks({});
      const userIdService = new UserIdService(getStorageMock);
      expect(Buffer.from(await userIdService.getRandomizedUserId(), 'hex')).toHaveLength(USER_ID_BYTE_SIZE);
    });
  });

  describe('making a user id persistent', () => {
    it('should save the temporary user id', async () => {
      const { getStorageMock, setStorageMock } = generateStorageMocks({});
      const userIdService = new UserIdService(getStorageMock, setStorageMock);
      await userIdService.makePersistent();
      const temporaryUserId = await userIdService.getRandomizedUserId();
      expect(setStorageMock).toHaveBeenCalledWith({
        usePersistentUserId: true,
        userId: temporaryUserId
      });
    });
  });

  describe('switching from persistent to temporary', () => {
    it('should unset the stored user id', async () => {
      jest.useFakeTimers();
      const store = {
        usePersistentUserId: true,
        userId: 'test'
      };
      const { getStorageMock, setStorageMock } = generateStorageMocks(store);

      const userIdService = new UserIdService(getStorageMock, setStorageMock);
      await userIdService.makeTemporary();

      expect(setStorageMock).toHaveBeenCalledWith({
        usePersistentUserId: false,
        userId: undefined
      });
      // it should still retain the previously stored user id in memory
      expect(await userIdService.getRandomizedUserId()).toEqual(store.userId);
      // simulate a session timeout
      jest.advanceTimersByTime(SESSION_LENGTH + 1);
      // assert new temporary user id being generated after session timeout
      expect(await userIdService.getRandomizedUserId()).not.toEqual(store.userId);
      expect(Buffer.from(await userIdService.getRandomizedUserId(), 'hex')).toHaveLength(USER_ID_BYTE_SIZE);
    });
  });

  describe('extending the lifespan of a temporary user id', () => {
    it('should reset the internal session timeout correctly', async () => {
      jest.useFakeTimers();
      const store = {
        usePersistentUserId: true,
        userId: 'test'
      };
      const { getStorageMock, setStorageMock } = generateStorageMocks(store);

      const userIdService = new UserIdService(getStorageMock, setStorageMock);
      await userIdService.makeTemporary();

      // simulate an almost session timeout
      jest.advanceTimersByTime(SESSION_LENGTH - 1);
      // it should still retain the previously stored user id in memory
      expect(await userIdService.getRandomizedUserId()).toEqual(store.userId);

      await userIdService.extendLifespan();
      // simulate an almost session timeout
      jest.advanceTimersByTime(SESSION_LENGTH - 1);
      expect(await userIdService.getRandomizedUserId()).toEqual(store.userId);

      // simulate a session timeout
      jest.advanceTimersByTime(1);
      // assert new temporary user id being generated after session timeout
      expect(await userIdService.getRandomizedUserId()).not.toEqual(store.userId);
      expect(Buffer.from(await userIdService.getRandomizedUserId(), 'hex')).toHaveLength(USER_ID_BYTE_SIZE);
    });
  });

  describe('clearing the ID', () => {
    it('should remove the ID from storage and switch back to basic tracking', async () => {
      const { getStorageMock, setStorageMock, clearStorageMock } = generateStorageMocks({});
      const userIdService = new UserIdService(getStorageMock, setStorageMock, clearStorageMock);
      await userIdService.makePersistent();
      const previousUserId = await userIdService.getUserId(1);
      await userIdService.clearId();
      const newUserId = await userIdService.getUserId(1);

      expect(clearStorageMock).toHaveBeenCalledWith(expect.arrayContaining(['userId', 'usePersistentUserId']));
      expect(previousUserId).not.toEqual(newUserId);
      const subscription = userIdService.userTrackingType$.subscribe((trackingType) => {
        expect(trackingType).toEqual(UserTrackingType.Basic);
      });
      subscription.unsubscribe();
    });
  });

  describe('getting user ID depending on wallet creation and opted in user', () => {
    it('should return random ID if keyAgentsByChain is not defined', async () => {
      const mockHashExtendedAccountPublicKey = jest.spyOn(utils, 'hashExtendedAccountPublicKey');
      mockHashExtendedAccountPublicKey.mockReturnValue(mockWalletBasedId);
      const { getStorageMock, setStorageMock, clearStorageMock } = generateStorageMocks();
      const userIdService = new UserIdService(getStorageMock, setStorageMock, clearStorageMock);
      const userId = await userIdService.getUserId(1);
      expect(userId).toBeDefined();
      expect(mockHashExtendedAccountPublicKey).not.toHaveBeenCalled();
      expect(userId).not.toEqual(mockWalletBasedId);
    });

    it('should return random ID if keyAgentsByChain is defined but usePersistentUserId is false', async () => {
      const mockHashExtendedAccountPublicKey = jest.spyOn(utils, 'hashExtendedAccountPublicKey');
      mockHashExtendedAccountPublicKey.mockReturnValue(mockWalletBasedId);
      const { getStorageMock, setStorageMock, clearStorageMock } = generateStorageMocks({
        usePersistentUserId: false,
        keyAgentsByChain: mockKeyAgentsByChain
      });
      const userIdService = new UserIdService(getStorageMock, setStorageMock, clearStorageMock);
      const userId = await userIdService.getUserId(1);
      expect(userId).toBeDefined();
      expect(mockHashExtendedAccountPublicKey).not.toHaveBeenCalled();
      expect(userId).not.toEqual(mockWalletBasedId);
    });

    it('should return wallet based ID if keyAgentsByChain is defined and usePersistentUserId is true', async () => {
      const mockHashExtendedAccountPublicKey = jest.spyOn(utils, 'hashExtendedAccountPublicKey');
      mockHashExtendedAccountPublicKey.mockReturnValue(mockWalletBasedId);
      const { getStorageMock, setStorageMock, clearStorageMock } = generateStorageMocks({
        usePersistentUserId: true,
        keyAgentsByChain: mockKeyAgentsByChain
      });
      const userIdService = new UserIdService(getStorageMock, setStorageMock, clearStorageMock);
      const userId = await userIdService.getUserId(1);
      expect(userId).toBe(mockWalletBasedId);
      expect(mockHashExtendedAccountPublicKey).toHaveBeenCalled();
    });
  });

  describe('getting user alias and id', () => {
    it('should return alias and id properties if keyAgentsByChain is defined and is persistent user', async () => {
      const mockHashExtendedAccountPublicKey = jest.spyOn(utils, 'hashExtendedAccountPublicKey');
      mockHashExtendedAccountPublicKey.mockReturnValue(mockWalletBasedId);

      const { getStorageMock, setStorageMock, clearStorageMock } = generateStorageMocks({
        usePersistentUserId: true,
        keyAgentsByChain: mockKeyAgentsByChain
      });
      const userIdService = new UserIdService(getStorageMock, setStorageMock, clearStorageMock);
      // call getRandomizedUserId to know the saved random ID in memory
      const randomUserId = await userIdService.getRandomizedUserId();
      const properties = await userIdService.getAliasProperties(1);
      expect(properties).toEqual(
        expect.objectContaining({
          id: mockWalletBasedId,
          alias: randomUserId
        })
      );
    });

    it('should not return id property if keyAgentsByChain is not defined', async () => {
      const { getStorageMock, setStorageMock, clearStorageMock } = generateStorageMocks();
      const userIdService = new UserIdService(getStorageMock, setStorageMock, clearStorageMock);
      const properties = await userIdService.getAliasProperties(1);
      expect(properties.id).toBeUndefined();
    });

    it('should not return id property if keyAgentsByChain is defined but is not persistent user', async () => {
      const { getStorageMock, setStorageMock, clearStorageMock } = generateStorageMocks({
        usePersistentUserId: false,
        keyAgentsByChain: mockKeyAgentsByChain
      });
      const userIdService = new UserIdService(getStorageMock, setStorageMock, clearStorageMock);
      const properties = await userIdService.getAliasProperties(1);
      expect(properties.id).toBeUndefined();
    });
  });
});
