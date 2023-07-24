/* eslint-disable no-magic-numbers */
/* eslint-disable import/imports-first */
/* eslint-disable prettier/prettier */
const mockHashId =
  '15d632f6b0ab82c72a194d634d8783ea0ef5419c8a8f638cb0c3fc49280e0a0285fc88fbfad04554779d19bec4ab30e5afee2f9ee736ba090c2213d98fe3a475';
const mockBlake2b = jest.fn(() => ({
  update: () => ({
    digest: () => mockHashId
  })
}));

import { BackgroundStorage } from '@lib/scripts/types';
import { mockKeyAgentsByChain } from '@src/utils/mocks/test-helpers';
import { SESSION_LENGTH, USER_ID_BYTE_SIZE, UserIdService } from '.';

jest.mock('blake2b-no-wasm', () => mockBlake2b);

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
      expect(await userIdService.getId()).toEqual(store.userId);
    });

    it('should generate a random user id if none was stored', async () => {
      const { getStorageMock } = generateStorageMocks({});
      const userIdService = new UserIdService(getStorageMock);
      expect(Buffer.from(await userIdService.getId(), 'hex')).toHaveLength(USER_ID_BYTE_SIZE);
    });
  });

  describe('making a user id persistent', () => {
    it('should save the temporary user id', async () => {
      const { getStorageMock, setStorageMock } = generateStorageMocks({});
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
      const { getStorageMock, setStorageMock } = generateStorageMocks(store);

      const userIdService = new UserIdService(getStorageMock, setStorageMock);
      await userIdService.makeTemporary();

      expect(setStorageMock).toHaveBeenCalledWith({
        usePersistentUserId: false,
        userId: undefined
      });
      // it should still retain the previously stored user id in memory
      expect(await userIdService.getId()).toEqual(store.userId);
      // simulate a session timeout
      jest.advanceTimersByTime(SESSION_LENGTH + 1);
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
      const { getStorageMock, setStorageMock } = generateStorageMocks(store);

      const userIdService = new UserIdService(getStorageMock, setStorageMock);
      await userIdService.makeTemporary();

      // simulate an almost session timeout
      jest.advanceTimersByTime(SESSION_LENGTH - 1);
      // it should still retain the previously stored user id in memory
      expect(await userIdService.getId()).toEqual(store.userId);

      await userIdService.extendLifespan();
      // simulate an almost session timeout
      jest.advanceTimersByTime(SESSION_LENGTH - 1);
      expect(await userIdService.getId()).toEqual(store.userId);

      // simulate a session timeout
      jest.advanceTimersByTime(1);
      // assert new temporary user id being generated after session timeout
      expect(await userIdService.getId()).not.toEqual(store.userId);
      expect(Buffer.from(await userIdService.getId(), 'hex')).toHaveLength(USER_ID_BYTE_SIZE);
    });
  });

  describe('clearing the id', () => {
    it('should should clear the correct props', () => {
      const { getStorageMock, setStorageMock, clearStorageMock } = generateStorageMocks({});
      const userIdService = new UserIdService(getStorageMock, setStorageMock, clearStorageMock);
      userIdService.clearId();
      expect(clearStorageMock).toHaveBeenCalledWith(expect.arrayContaining(['userId', 'usePersistentUserId']));
    });
  });

  describe('getting hash ID', () => {
    it('should generate hash ID if keyAgentsByChain is defined', async () => {
      const { getStorageMock, setStorageMock, clearStorageMock } = generateStorageMocks({
        keyAgentsByChain: mockKeyAgentsByChain
      });
      const userIdService = new UserIdService(getStorageMock, setStorageMock, clearStorageMock);
      const hashId = await userIdService.getHashId('Preview');
      expect(hashId).toEqual(mockHashId);
      expect(mockBlake2b).toHaveBeenCalledTimes(1);
    });

    it('should not generate hash ID twice - should retrieve hash from memory', async () => {
      mockBlake2b.mockClear();
      const { getStorageMock, setStorageMock, clearStorageMock } = generateStorageMocks({
        keyAgentsByChain: mockKeyAgentsByChain
      });
      const userIdService = new UserIdService(getStorageMock, setStorageMock, clearStorageMock);
      await userIdService.getHashId('Preview');
      const hashId = await userIdService.getHashId('Preview');
      expect(hashId).toEqual(mockHashId);
      expect(mockBlake2b).toHaveBeenCalledTimes(1);
    });

    it('should not generate hash ID if keyAgentsByChain is not defined', async () => {
      const { getStorageMock, setStorageMock, clearStorageMock } = generateStorageMocks({});
      const userIdService = new UserIdService(getStorageMock, setStorageMock, clearStorageMock);
      expect(await userIdService.getHashId('Preview')).toBeUndefined();
    });
  });
});
