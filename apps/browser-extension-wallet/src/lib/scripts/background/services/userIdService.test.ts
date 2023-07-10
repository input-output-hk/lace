import { USER_ID_BYTE_SIZE, UserIdService } from '.';

describe.only('userIdService', () => {
  describe('restoring persistent user id', () => {
    it('should restore a persistent user id', async () => {
      const store = {
        usePersistentUserId: true,
        userId: 'test'
      };
      const getStorageMock = jest.fn(() => Promise.resolve(store));
      const userIdService = new UserIdService(getStorageMock);
      expect(await userIdService.getId()).toEqual(store.userId);
    });

    it('should generate a random user id if none was stored', async () => {
      const getStorageMock = jest.fn(() => Promise.resolve({}));
      const userIdService = new UserIdService(getStorageMock);
      expect(Buffer.from(await userIdService.getId(), 'hex')).toHaveLength(USER_ID_BYTE_SIZE);
    });
  });

  describe('making a user id persistent', () => {
    it('should save the temporary user id', async () => {
      const getStorageMock = jest.fn(() => Promise.resolve({}));
      const setStorageMock = jest.fn();
      const userIdService = new UserIdService(getStorageMock, setStorageMock);
      await userIdService.makePersistent();
      const temporaryUserId = await userIdService.getId();
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
      const getStorageMock = jest.fn(() => Promise.resolve(store));
      const setStorageMock = jest.fn();
      const sessionLength = 10;

      const userIdService = new UserIdService(getStorageMock, setStorageMock, sessionLength);
      await userIdService.makeTemporary();

      expect(setStorageMock).toHaveBeenCalledWith({
        usePersistentUserId: false,
        userId: undefined
      });
      // it should still retain the previously stored user id in memory
      expect(await userIdService.getId()).toEqual(store.userId);
      // simulate a session timeout
      jest.advanceTimersByTime(sessionLength + 1);
      // assert new temporary user id being generated after session timeout
      expect(await userIdService.getId()).not.toEqual(store.userId);
      expect(Buffer.from(await userIdService.getId(), 'hex')).toHaveLength(USER_ID_BYTE_SIZE);
    });
  });

  describe('extending the lifespan of a temporary user id', () => {
    it('should reset the internal session timeout correctly', async () => {
      jest.useFakeTimers();
      const store = {
        usePersistentUserId: true,
        userId: 'test'
      };
      const getStorageMock = jest.fn(() => Promise.resolve(store));
      const setStorageMock = jest.fn();
      const sessionLength = 10;

      const userIdService = new UserIdService(getStorageMock, setStorageMock, sessionLength);
      await userIdService.makeTemporary();

      // simulate an almost session timeout
      jest.advanceTimersByTime(sessionLength - 1);
      // it should still retain the previously stored user id in memory
      expect(await userIdService.getId()).toEqual(store.userId);

      await userIdService.extendLifespan();
      // simulate an almost session timeout
      jest.advanceTimersByTime(sessionLength - 1);
      expect(await userIdService.getId()).toEqual(store.userId);

      // simulate a session timeout
      jest.advanceTimersByTime(1);
      // assert new temporary user id being generated after session timeout
      expect(await userIdService.getId()).not.toEqual(store.userId);
      expect(Buffer.from(await userIdService.getId(), 'hex')).toHaveLength(USER_ID_BYTE_SIZE);
    });
  });
});
