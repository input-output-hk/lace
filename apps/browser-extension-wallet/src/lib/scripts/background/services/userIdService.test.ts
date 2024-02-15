/* eslint-disable unicorn/no-null */
import { BackgroundStorage } from '@lib/scripts/types';
import { SESSION_LENGTH, USER_ID_BYTE_SIZE, UserIdService } from './userIdService';
import * as utils from '../util';
import { UserTrackingType } from '@providers/AnalyticsProvider/analyticsTracker';
import {
  InMemoryWallet,
  WalletManagerActivateProps,
  WalletManagerApi,
  WalletRepositoryApi,
  WalletType
} from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { of } from 'rxjs';

const mockWalletBasedId =
  '15d632f6b0ab82c72a194d634d8783ea0ef5419c8a8f638cb0c3fc49280e0a0285fc88fbfad04554779d19bec4ab30e5afee2f9ee736ba090c2213d98fe3a475';

const mockedStorage = { state: {} };
const generateStorageMocks = (state: Pick<BackgroundStorage, 'usePersistentUserId' | 'userId'> = {}) => {
  mockedStorage.state = { ...state };
  return {
    get: jest.fn(() => Promise.resolve(mockedStorage.state)),
    set: jest.fn((newState) => {
      mockedStorage.state = {
        ...mockedStorage.state,
        ...newState
      };
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockedStorage.state = {};
      return Promise.resolve();
    })
  };
};

describe('userIdService', () => {
  let walletRepository: jest.Mocked<WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>>;
  let walletManager: jest.Mocked<WalletManagerApi>;
  const repositoryWalletId = 'walletId';
  const wmActiveWalletId = {
    walletId: repositoryWalletId,
    accountIndex: 0
  } as WalletManagerActivateProps;
  const repositoryWallets = [
    {
      type: WalletType.InMemory,
      walletId: wmActiveWalletId.walletId,
      accounts: [
        {
          accountIndex: wmActiveWalletId.accountIndex,
          metadata: { name: 'wally' },
          extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex(
            'fc5ab25e830b67c47d0a17411bf7fdabf711a597fb6cf04102734b0a2934ceaaa65ff5e7c52498d52c07b8ddfcd436fc2b4d2775e2984a49d0c79f65ceee4779'
          )
        }
      ],
      encryptedSecrets: {}
    } as InMemoryWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
  ];
  let mockHashExtendedAccountPublicKey: jest.SpyInstance;

  beforeEach(() => {
    walletRepository = {} as jest.Mocked<WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>>;
    walletManager = {} as jest.Mocked<WalletManagerApi>;
    walletManager.activeWalletId$ = of(null);
    mockHashExtendedAccountPublicKey = jest.spyOn(utils, 'hashExtendedAccountPublicKey');
    mockHashExtendedAccountPublicKey.mockReturnValue(mockWalletBasedId);
  });

  afterEach(() => mockHashExtendedAccountPublicKey.mockClear());

  describe('restoring persistent user id', () => {
    it('should restore a persistent user id', async () => {
      const store = {
        usePersistentUserId: true,
        userId: 'test'
      };
      const userIdService = new UserIdService(walletRepository, walletManager, generateStorageMocks(store));
      expect(await userIdService.getRandomizedUserId()).toEqual(store.userId);
    });

    it('should generate a random user id if none was stored', async () => {
      const userIdService = new UserIdService(walletRepository, walletManager, generateStorageMocks({}));
      expect(Buffer.from(await userIdService.getRandomizedUserId(), 'hex')).toHaveLength(USER_ID_BYTE_SIZE);
    });
  });

  describe('making a user id persistent', () => {
    it('should save the temporary user id', async () => {
      const storage = generateStorageMocks({});
      const userIdService = new UserIdService(walletRepository, walletManager, storage);
      await userIdService.makePersistent();
      const temporaryUserId = await userIdService.getRandomizedUserId();
      expect(storage.set).toHaveBeenCalledWith({
        usePersistentUserId: true,
        userId: temporaryUserId
      });
    });
  });

  describe('switching from persistent to temporary', () => {
    it('should unset the stored user id', async () => {
      jest.useFakeTimers();
      const storedUserId = 'test';
      const storage = generateStorageMocks({
        usePersistentUserId: true,
        userId: storedUserId
      });
      const userIdService = new UserIdService(walletRepository, walletManager, storage);
      await userIdService.init();
      await userIdService.makeTemporary();
      expect(storage.set).toHaveBeenCalledWith({
        usePersistentUserId: false,
        userId: undefined
      });
      // it should still retain the previously stored user id in memory
      expect(await userIdService.getRandomizedUserId()).toEqual(storedUserId);
      // simulate a session timeout
      jest.advanceTimersByTime(SESSION_LENGTH + 1);
      // assert new temporary user id being generated after session timeout
      expect(await userIdService.getRandomizedUserId()).not.toEqual(storedUserId);
      expect(Buffer.from(await userIdService.getRandomizedUserId(), 'hex')).toHaveLength(USER_ID_BYTE_SIZE);
    });
  });

  describe('extending the lifespan of a temporary user id', () => {
    it('should reset the internal session timeout correctly', async () => {
      jest.useFakeTimers();
      const storedUserId = 'test';
      const storage = generateStorageMocks({
        usePersistentUserId: true,
        userId: storedUserId
      });
      const userIdService = new UserIdService(walletRepository, walletManager, storage);
      await userIdService.init();
      await userIdService.makeTemporary();
      // simulate an almost session timeout
      jest.advanceTimersByTime(SESSION_LENGTH - 1);
      // it should still retain the previously stored user id in memory
      expect(await userIdService.getRandomizedUserId()).toEqual(storedUserId);
      await userIdService.extendLifespan();
      // simulate an almost session timeout
      jest.advanceTimersByTime(SESSION_LENGTH - 1);
      expect(await userIdService.getRandomizedUserId()).toEqual(storedUserId);
      // simulate a session timeout
      jest.advanceTimersByTime(1);
      // assert new temporary user id being generated after session timeout
      expect(await userIdService.getRandomizedUserId()).not.toEqual(storedUserId);
      expect(Buffer.from(await userIdService.getRandomizedUserId(), 'hex')).toHaveLength(USER_ID_BYTE_SIZE);
    });
  });

  describe('clearing the ID', () => {
    it('should remove the ID from storage and switch back to basic tracking', async () => {
      const storage = generateStorageMocks({});
      walletManager.activeWalletId$ = of(wmActiveWalletId);
      walletRepository.wallets$ = of(repositoryWallets);
      const userIdService = new UserIdService(walletRepository, walletManager, storage);
      await userIdService.makePersistent();
      const previousUserId = await userIdService.getUserId();
      await userIdService.clearId();
      const newUserId = await userIdService.getUserId();
      expect(storage.clear).toHaveBeenCalledWith({ keys: ['userId', 'usePersistentUserId'] });
      expect(previousUserId).not.toEqual(newUserId);
      const subscription = userIdService.userId$.subscribe(({ type: trackingType }) => {
        expect(trackingType).toEqual(UserTrackingType.Basic);
      });
      subscription.unsubscribe();
    });
  });

  describe('getting user ID depending on wallet creation and opted in user', () => {
    it('should return random ID if there is no active wallet', async () => {
      const storage = generateStorageMocks();
      walletManager.activeWalletId$ = of(null);
      const userIdService = new UserIdService(walletRepository, walletManager, storage);
      const userId = await userIdService.getUserId();
      expect(userId).toBeDefined();
      expect(mockHashExtendedAccountPublicKey).not.toHaveBeenCalled();
      expect(userId).not.toEqual(mockWalletBasedId);
    });

    it('should return random ID if there is active wallet, but usePersistentUserId is false', async () => {
      walletManager.activeWalletId$ = of(wmActiveWalletId);
      walletRepository.wallets$ = of(repositoryWallets);
      const storage = generateStorageMocks({ usePersistentUserId: false });
      const userIdService = new UserIdService(walletRepository, walletManager, storage);
      const userId = await userIdService.getUserId();
      expect(userId).toBeDefined();
      expect(mockHashExtendedAccountPublicKey).not.toHaveBeenCalled();
      expect(userId).not.toEqual(mockWalletBasedId);
    });

    it('should return wallet based ID if there is active wallet and usePersistentUserId is true', async () => {
      walletManager.activeWalletId$ = of(wmActiveWalletId);
      walletRepository.wallets$ = of(repositoryWallets);
      const storage = generateStorageMocks({ usePersistentUserId: true });
      const userIdService = new UserIdService(walletRepository, walletManager, storage);
      const userId = await userIdService.getUserId();
      expect(userId).toBe(mockWalletBasedId);
      expect(mockHashExtendedAccountPublicKey).toHaveBeenCalled();
    });
  });

  describe('getting user alias and id', () => {
    it('should return alias and id properties if there is active wallet and is persistent user', async () => {
      walletManager.activeWalletId$ = of(wmActiveWalletId);
      walletRepository.wallets$ = of(repositoryWallets);
      const storage = generateStorageMocks({ usePersistentUserId: true });
      const userIdService = new UserIdService(walletRepository, walletManager, storage);
      // call getRandomizedUserId to know the saved random ID in memory
      const randomUserId = await userIdService.getRandomizedUserId();
      const properties = await userIdService.getAliasProperties();
      expect(properties).toEqual(
        expect.objectContaining({
          id: mockWalletBasedId,
          alias: randomUserId
        })
      );
    });

    it('should not return id property if there is no active wallet', async () => {
      walletManager.activeWalletId$ = of(null);
      const storage = generateStorageMocks();
      const userIdService = new UserIdService(walletRepository, walletManager, storage);
      const properties = await userIdService.getAliasProperties();
      expect(properties.id).toBeUndefined();
    });

    it('should not return id property if there is active wallet but is not persistent user', async () => {
      walletManager.activeWalletId$ = of(wmActiveWalletId);
      walletRepository.wallets$ = of(repositoryWallets);
      const storage = generateStorageMocks({ usePersistentUserId: false });
      const userIdService = new UserIdService(walletRepository, walletManager, storage);
      const properties = await userIdService.getAliasProperties();
      expect(properties.id).toBeUndefined();
    });
  });
});
