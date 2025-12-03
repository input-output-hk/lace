/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PubNubProvider } from '../../../src/providers/PubNub/PubNubProvider';
import { ConnectionStatus } from '../../../src/ConnectionStatus';
import { MockStorage } from '../../MockStorage';
import { StorageKeys } from '../../../src/StorageKeys';
import type { NotificationsLogger, Notification } from '../../../src/types';
import { getNow } from '../../../src/utils';
import PubNub from 'pubnub';

// Mock PubNub
jest.mock('pubnub', () =>
  jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    objects: {
      getAllChannelMetadata: jest.fn()
    },
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    unsubscribeAll: jest.fn(),
    stop: jest.fn(),
    fetchMessages: jest.fn()
  }))
);

// Mock TokenManager and PubNubFunctionClient
jest.mock('../../../src/providers/PubNub/TokenManager', () => ({
  TokenManager: jest.fn().mockImplementation(() => ({
    getValidToken: jest.fn().mockResolvedValue({
      token: 'mock-token',
      subscribeKey: 'mock-subscribe-key',
      expiresAt: getNow() + 3600
    })
  }))
}));

jest.mock('../../../src/providers/PubNub/PubnubFunctionClient', () => ({
  PubNubFunctionClient: jest.fn()
}));

describe('PubNubProvider', () => {
  let mockLogger: jest.Mocked<NotificationsLogger>;
  let mockStorage: MockStorage;
  let mockStorageKeys: StorageKeys;
  let mockConnectionStatus: ConnectionStatus;
  let mockOnNotification: jest.Mock;
  let mockOnTopics: jest.Mock;
  let mockOnConnectionStatusChange: jest.Mock;
  let provider: PubNubProvider;
  let mockPubNub: any;

  const subscribeKey = 'test-subscribe-key';

  const defaultTopics = [
    { id: 'topic-1', name: 'Topic 1', custom: {} },
    { id: 'topic-2', name: 'Topic 2', custom: {} }
  ];

  const setupProvider = async (channels: any[] = [], userId = 'test-user-id'): Promise<void> => {
    provider = new PubNubProvider({
      logger: mockLogger,
      skipAuthentication: true,
      storage: mockStorage,
      storageKeys: mockStorageKeys,
      subscribeKey
    });

    mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
      data: channels
    });

    await provider.init({
      connectionStatus: mockConnectionStatus,
      onNotification: mockOnNotification,
      onTopics: mockOnTopics,
      userId
    });
  };

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    mockStorage = new MockStorage();
    mockStorageKeys = new StorageKeys('test');
    mockOnConnectionStatusChange = jest.fn();
    mockConnectionStatus = new ConnectionStatus(mockLogger, mockOnConnectionStatusChange);
    mockOnNotification = jest.fn();
    mockOnTopics = jest.fn();

    // Reset PubNub mock
    (PubNub as unknown as jest.Mock).mockClear();
    mockPubNub = {
      addListener: jest.fn(),
      objects: {
        getAllChannelMetadata: jest.fn()
      },
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      unsubscribeAll: jest.fn(),
      stop: jest.fn(),
      fetchMessages: jest.fn()
    };
    (PubNub as unknown as jest.Mock).mockImplementation(() => mockPubNub);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default heartbeatInterval', () => {
      provider = new PubNubProvider({
        logger: mockLogger,
        storage: mockStorage,
        storageKeys: mockStorageKeys,
        subscribeKey
      });

      expect(provider).toBeInstanceOf(PubNubProvider);
      expect(PubNub as unknown as jest.Mock).not.toHaveBeenCalled(); // PubNub is created in init
    });

    test('should initialize with custom heartbeatInterval', () => {
      provider = new PubNubProvider({
        heartbeatInterval: 30,
        logger: mockLogger,
        storage: mockStorage,
        storageKeys: mockStorageKeys,
        subscribeKey
      });

      expect(provider).toBeInstanceOf(PubNubProvider);
    });

    test('should initialize with skipAuthentication', () => {
      provider = new PubNubProvider({
        logger: mockLogger,
        skipAuthentication: true,
        storage: mockStorage,
        storageKeys: mockStorageKeys,
        subscribeKey
      });

      expect(provider).toBeInstanceOf(PubNubProvider);
    });
  });

  describe('init', () => {
    const mockChannels = [
      {
        id: 'topic-1',
        name: 'Topic 1',
        custom: {
          autoSubscribe: true,
          chain: 'mainnet',
          publisher: 'Test Publisher 1'
        }
      },
      {
        id: 'topic-2',
        name: 'Topic 2',
        custom: {
          autoSubscribe: false,
          chain: 'testnet',
          publisher: 'Test Publisher 2'
        }
      },
      {
        id: 'control.other',
        name: 'Control Other'
      }
    ];

    beforeEach(() => {
      provider = new PubNubProvider({
        logger: mockLogger,
        storage: mockStorage,
        storageKeys: mockStorageKeys,
        subscribeKey
      });

      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: mockChannels
      });
    });

    test('should initialize without authentication when skipAuthentication is true', async () => {
      provider = new PubNubProvider({
        logger: mockLogger,
        skipAuthentication: true,
        storage: mockStorage,
        storageKeys: mockStorageKeys,
        subscribeKey
      });

      const topics = await provider.init({
        connectionStatus: mockConnectionStatus,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        userId: 'test-user-id'
      });

      expect(PubNub as unknown as jest.Mock).toHaveBeenCalledWith({
        autoNetworkDetection: true,
        heartbeatInterval: 0,
        restore: true,
        subscribeKey,
        userId: 'test-user-id',
        authKey: undefined
      });
      expect(mockPubNub.addListener).toHaveBeenCalled();
      expect(topics).toHaveLength(2); // control.other is filtered out
    });

    test('should initialize with authentication when skipAuthentication is false', async () => {
      const topics = await provider.init({
        connectionStatus: mockConnectionStatus,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        userId: 'test-user-id'
      });

      expect(PubNub as unknown as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          authKey: 'mock-token'
        })
      );
      expect(mockPubNub.addListener).toHaveBeenCalled();
      expect(topics).toHaveLength(2);
    });

    test('should map channels to topics correctly', async () => {
      const topics = await provider.init({
        connectionStatus: mockConnectionStatus,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        userId: 'test-user-id'
      });

      expect(topics).toEqual([
        {
          id: 'topic-1',
          name: 'Topic 1',
          autoSubscribe: true,
          chain: 'mainnet',
          isSubscribed: false,
          publisher: 'Test Publisher 1'
        },
        {
          id: 'topic-2',
          name: 'Topic 2',
          autoSubscribe: false,
          chain: 'testnet',
          isSubscribed: false,
          publisher: 'Test Publisher 2'
        }
      ]);
    });

    test('should subscribe to control channels', async () => {
      await provider.init({
        connectionStatus: mockConnectionStatus,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        userId: 'test-user-id'
      });

      expect(mockPubNub.subscribe).toHaveBeenCalledWith({ channels: ['control.other'] });
    });

    test('should handle channels with invalid data', async () => {
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: [
          null,
          { id: 123 }, // invalid id
          { id: 'valid-topic', name: 123 }, // invalid name
          { id: 'valid-topic-2', custom: 'invalid' }, // invalid custom
          { id: 'valid-topic-3', custom: { autoSubscribe: 'invalid' } }, // invalid autoSubscribe
          { id: 'valid-topic-4', custom: { chain: 123 } }, // invalid chain
          { id: 'valid-topic-5', custom: { publisher: 123 } } // invalid publisher
        ]
      });

      const topics = await provider.init({
        connectionStatus: mockConnectionStatus,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        userId: 'test-user-id'
      });

      expect(topics).toHaveLength(5);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test('should use cached topics when available and not expired', async () => {
      const cachedTopics = [
        {
          id: 'cached-topic-1',
          name: 'Cached Topic 1',
          autoSubscribe: false,
          chain: 'mainnet',
          isSubscribed: false,
          publisher: 'Cached Publisher 1'
        },
        {
          id: 'cached-topic-2',
          name: 'Cached Topic 2',
          autoSubscribe: true,
          chain: 'testnet',
          isSubscribed: false,
          publisher: 'Cached Publisher 2'
        }
      ];

      // Set cached topics with recent lastFetch (less than 1 day ago)
      await mockStorage.setItem(mockStorageKeys.getTopics(), {
        lastFetch: Date.now() - 1000, // 1 second ago (well within 1 day)
        topics: cachedTopics
      });

      // Clear mock to verify it's not called
      mockPubNub.objects.getAllChannelMetadata.mockClear();

      const topics = await provider.init({
        connectionStatus: mockConnectionStatus,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        userId: 'test-user-id'
      });

      // Verify refreshChannels was not called (getAllChannelMetadata should not be called)
      expect(mockPubNub.objects.getAllChannelMetadata).not.toHaveBeenCalled();

      // Verify onTopics was called with cached topics
      expect(mockOnTopics).toHaveBeenCalledWith(cachedTopics);

      // Verify returned topics are the cached ones
      expect(topics).toEqual(cachedTopics);
    });
  });

  describe('subscribe', () => {
    beforeEach(async () => {
      await setupProvider(defaultTopics);
    });

    test('should subscribe to a topic', async () => {
      const subscribePromise = provider.subscribe('topic-1');

      expect(mockPubNub.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: ['topic-1'],
          timetoken: expect.any(String)
        })
      );
      expect(mockOnTopics).toHaveBeenCalled();

      // Simulate successful subscription
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNSubscribeOperation',
        affectedChannels: ['topic-1']
      });

      await subscribePromise;
    });

    test('should update topic isSubscribed flag', async () => {
      const subscribePromise = provider.subscribe('topic-1');

      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNSubscribeOperation',
        affectedChannels: ['topic-1']
      });

      await subscribePromise;

      expect(mockOnTopics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'topic-1',
            isSubscribed: true
          })
        ])
      );
    });

    test('should handle subscription error', async () => {
      const subscribePromise = provider.subscribe('topic-1');

      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        category: 'PNNetworkIssuesCategory',
        errorData: new Error('Network error')
      });

      await expect(subscribePromise).rejects.toThrow('Network error');
    });
  });

  describe('unsubscribe', () => {
    beforeEach(async () => {
      await setupProvider(defaultTopics);
    });

    test('should unsubscribe from a topic', async () => {
      const unsubscribePromise = provider.unsubscribe('topic-1');

      expect(mockPubNub.unsubscribe).toHaveBeenCalledWith({ channels: ['topic-1'] });
      expect(mockOnTopics).toHaveBeenCalled();

      // Simulate successful unsubscription
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNUnsubscribeOperation',
        affectedChannels: ['topic-1']
      });

      await unsubscribePromise;
    });

    test('should update topic isSubscribed flag to false', async () => {
      // First subscribe
      const subscribePromise = provider.subscribe('topic-1');
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNSubscribeOperation',
        affectedChannels: ['topic-1']
      });
      await subscribePromise;

      // Then unsubscribe
      const unsubscribePromise = provider.unsubscribe('topic-1');
      listener.status({
        operation: 'PNUnsubscribeOperation',
        affectedChannels: ['topic-1']
      });

      await unsubscribePromise;

      expect(mockOnTopics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'topic-1',
            isSubscribed: false
          })
        ])
      );
    });

    test('should handle unsubscription error', async () => {
      const unsubscribePromise = provider.unsubscribe('topic-1');

      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        category: 'PNNetworkIssuesCategory',
        errorData: new Error('Network error')
      });

      await expect(unsubscribePromise).rejects.toThrow('Network error');
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      await setupProvider([]);
    });

    test('should close the connection', async () => {
      const closePromise = provider.close();

      expect(mockPubNub.unsubscribeAll).toHaveBeenCalled();

      // Simulate unsubscription from control channel
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNUnsubscribeOperation',
        affectedChannels: ['control.topics']
      });

      await closePromise;

      expect(mockPubNub.stop).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      await setupProvider([
        { id: 'topic-1', name: 'Topic 1', custom: { publisher: 'Test Publisher 1' } },
        { id: 'control.topics', name: 'Control', custom: {} }
      ]);
    });

    test('should handle notification messages', async () => {
      // Subscribe first
      const subscribePromise = provider.subscribe('topic-1');
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNSubscribeOperation',
        affectedChannels: ['topic-1']
      });
      await subscribePromise;

      const pubnubMessage = {
        id: 'notification-1',
        body: 'Test message',
        title: 'Test'
      };

      const notificationPromise = new Promise<unknown[]>((resolve) => {
        mockOnNotification.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      listener.message({
        channel: 'topic-1',
        timetoken: '17637246906038441',
        message: pubnubMessage
      });

      const notificationArgs = await notificationPromise;

      const notification: Notification = {
        id: 'notification-1',
        body: 'Test message',
        timestamp: '2025-11-21T11:31:30.603Z',
        title: 'Test',
        topicId: 'topic-1'
      };
      expect(notificationArgs[0]).toEqual(notification);
    });

    test('should handle control channel messages', async () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];

      // DEL action
      listener.message({
        channel: 'control.topics',
        message: {
          action: 'DEL',
          topicId: 'topic-1'
        }
      });

      expect(mockOnTopics).toHaveBeenCalled();

      // PUT action
      listener.message({
        channel: 'control.topics',
        message: {
          action: 'PUT',
          topicId: 'new-topic',
          details: {
            name: 'New Topic',
            autoSubscribe: true,
            chain: 'mainnet'
          }
        }
      });

      expect(mockOnTopics).toHaveBeenCalled();
    });
  });

  describe('status event handling', () => {
    beforeEach(async () => {
      await setupProvider([]);
    });

    test('should ignore heartbeat operations', () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNHeartbeatOperation',
        category: 'PNConnectedCategory'
      });

      expect(mockOnConnectionStatusChange).not.toHaveBeenCalled();
    });

    test('should ignore network down category', () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        category: 'PNNetworkDownCategory'
      });

      expect(mockOnConnectionStatusChange).not.toHaveBeenCalled();
    });

    test('should handle network up category', async () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      const statusChangePromise = new Promise<unknown[]>((resolve) => {
        mockOnConnectionStatusChange.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      listener.status({
        category: 'PNNetworkUpCategory'
      });

      await statusChangePromise;

      expect(mockOnConnectionStatusChange).toHaveBeenCalled();
    });

    test('should ignore reconnected category', () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        category: 'PNReconnectedCategory'
      });

      expect(mockOnConnectionStatusChange).not.toHaveBeenCalled();
    });

    test('should ignore AbortError constructor error in bad request category', () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      const abortError = new TypeError('node_fetch_1.AbortError is not a constructor');

      listener.status({
        category: 'PNBadRequestCategory',
        errorData: abortError
      });

      expect(mockOnConnectionStatusChange).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    test('should handle network issues category', async () => {
      const subscribePromise = provider.subscribe('topic-1');
      const listener = mockPubNub.addListener.mock.calls[0][0];

      const error = new Error('Network error');
      const statusChangePromise = new Promise<unknown[]>((resolve) => {
        mockOnConnectionStatusChange.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      listener.status({
        category: 'PNNetworkIssuesCategory',
        errorData: error
      });

      const [statusChangeArgs] = await Promise.allSettled([
        statusChangePromise,
        expect(subscribePromise).rejects.toThrow('Network error')
      ]);

      expect(statusChangeArgs.status).toBe('fulfilled');
      if (statusChangeArgs.status === 'fulfilled') {
        expect(statusChangeArgs.value[0]).toBe(error);
      }
    });

    test('should handle network issues with non-Error errorData', async () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      const statusChangePromise = new Promise<unknown[]>((resolve) => {
        mockOnConnectionStatusChange.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      listener.status({
        category: 'PNNetworkIssuesCategory',
        errorData: { message: 'Network error' }
      });

      const statusChangeArgs = await statusChangePromise;

      expect(statusChangeArgs[0]).toBeInstanceOf(Error);
    });

    test('should handle subscribe operation with invalid affectedChannels', () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNSubscribeOperation',
        affectedChannels: null
      });

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test('should handle unsubscribe operation with invalid affectedChannels', () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNUnsubscribeOperation',
        affectedChannels: null
      });

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test('should handle unhandled status events', () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'UnknownOperation',
        category: 'UnknownCategory'
      });

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('handleChannelsControl', () => {
    beforeEach(async () => {
      await setupProvider(defaultTopics);
    });

    test('should handle DEL action for existing topic', () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.message({
        channel: 'control.topics',
        message: {
          action: 'DEL',
          topicId: 'topic-1'
        }
      });

      expect(mockOnTopics).toHaveBeenCalledWith([expect.objectContaining({ id: 'topic-2' })]);
    });

    test('should handle DEL action for non-existing topic', () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.message({
        channel: 'control.topics',
        message: {
          action: 'DEL',
          topicId: 'non-existing'
        }
      });

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test('should handle PUT action for new topic', () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.message({
        channel: 'control.topics',
        message: {
          action: 'PUT',
          topicId: 'new-topic',
          details: {
            name: 'New Topic',
            autoSubscribe: true,
            chain: 'mainnet'
          }
        }
      });

      expect(mockOnTopics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'new-topic',
            name: 'New Topic',
            autoSubscribe: true,
            chain: 'mainnet',
            isSubscribed: false
          })
        ])
      );
    });

    test('should handle PUT action for existing topic', async () => {
      // First subscribe to topic-1
      const subscribePromise = provider.subscribe('topic-1');
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNSubscribeOperation',
        affectedChannels: ['topic-1']
      });
      await subscribePromise;

      // Then update it
      listener.message({
        channel: 'control.topics',
        message: {
          action: 'PUT',
          topicId: 'topic-1',
          details: {
            name: 'Updated Topic 1',
            autoSubscribe: false
          }
        }
      });

      expect(mockOnTopics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'topic-1',
            name: 'Updated Topic 1',
            autoSubscribe: false,
            isSubscribed: true // Should preserve subscription status
          })
        ])
      );
    });

    test('should handle invalid action', () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.message({
        channel: 'control.topics',
        message: {
          action: 'INVALID',
          topicId: 'topic-1'
        }
      });

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle close when control channel unsubscription is unexpected', async () => {
      await setupProvider([]);

      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNUnsubscribeOperation',
        affectedChannels: ['control.topics']
      });

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test('should handle unsubscribe from control.topics during close', async () => {
      await setupProvider([]);

      const closePromise = provider.close();
      const listener = mockPubNub.addListener.mock.calls[0][0];
      listener.status({
        operation: 'PNUnsubscribeOperation',
        affectedChannels: ['control.topics']
      });

      await closePromise;

      expect(mockPubNub.stop).toHaveBeenCalled();
    });
  });

  describe('refreshChannelsOnInterval', () => {
    beforeEach(async () => {
      await setupProvider([
        { id: 'topic-1', name: 'Topic 1', custom: { publisher: 'Test Publisher 1' } },
        { id: 'topic-2', name: 'Topic 2', custom: { publisher: 'Test Publisher 2' } }
      ]);
    });

    test('should call onTopics callback when topics change', async () => {
      mockOnTopics.mockClear();

      const newChannels = [
        { id: 'topic-1', name: 'Topic 1', custom: { publisher: 'Test Publisher 1' } },
        { id: 'topic-2', name: 'Topic 2', custom: { publisher: 'Test Publisher 2' } },
        { id: 'topic-3', name: 'Topic 3', custom: { publisher: 'Test Publisher 3' } }
      ];

      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: newChannels
      });

      provider.refreshChannelsOnInterval();

      // Wait for promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockPubNub.objects.getAllChannelMetadata).toHaveBeenCalledWith({
        include: { customFields: true }
      });
      expect(mockOnTopics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'topic-1' }),
          expect.objectContaining({ id: 'topic-2' }),
          expect.objectContaining({ id: 'topic-3' })
        ])
      );
      expect(mockOnTopics).toHaveBeenCalledTimes(1);
    });

    test('should not call onTopics callback when topics are unchanged', async () => {
      mockOnTopics.mockClear();

      const sameChannels = [
        { id: 'topic-1', name: 'Topic 1', custom: { publisher: 'Test Publisher 1' } },
        { id: 'topic-2', name: 'Topic 2', custom: { publisher: 'Test Publisher 2' } }
      ];

      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: sameChannels
      });

      provider.refreshChannelsOnInterval();

      // Wait for promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockPubNub.objects.getAllChannelMetadata).toHaveBeenCalledWith({
        include: { customFields: true }
      });
      expect(mockOnTopics).not.toHaveBeenCalled();
    });

    test('should log error when refresh fails', async () => {
      const error = new Error('Network error');
      mockPubNub.objects.getAllChannelMetadata.mockRejectedValue(error);

      provider.refreshChannelsOnInterval();

      // Wait for promise to reject
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'NotificationsClient:PubNubProvider: Failed to refresh channels',
        error
      );
      expect(mockOnTopics).not.toHaveBeenCalled();
    });
  });

  describe('fetchMissedMessages', () => {
    beforeEach(async () => {
      await setupProvider([
        { id: 'topic-1', name: 'Topic 1', custom: {} },
        { id: 'topic-2', name: 'Topic 2', custom: {} }
      ]);
    });

    test('should fetch missed messages for topics in subscribedTopics storage', async () => {
      mockStorage.setItem(mockStorageKeys.getSubscribedTopics(), ['topic-2']);
      mockStorage.setItem(mockStorageKeys.getLastSync('topic-2'), '1000');

      const messages = [
        {
          channel: 'topic-2',
          message: { id: 'msg-2', title: 'Test 2', timestamp: '2023-01-01T00:00:00Z' },
          timetoken: '12345678900000001'
        }
      ];

      mockPubNub.fetchMessages.mockResolvedValue({
        channels: {
          'topic-2': messages
        }
      });

      // Re-initialize to trigger fetchMissedMessages
      await provider.init({
        connectionStatus: mockConnectionStatus,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        userId: 'test-user-id'
      });

      // Wait for async fetchMissedMessages
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockPubNub.fetchMessages).toHaveBeenCalledWith({
        channels: ['topic-2'],
        count: 100,
        end: '1000'
      });
    });

    test('should process messages from fetchMessages', async () => {
      mockStorage.setItem(mockStorageKeys.getSubscribedTopics(), ['topic-1']);
      mockStorage.setItem(mockStorageKeys.getLastSync('topic-1'), 0);

      const notification = {
        id: 'msg-1',
        title: 'Test',
        body: 'Test message'
      };

      const messages = [
        {
          channel: 'topic-1',
          message: notification,
          timetoken: '12345678900000000'
        }
      ];

      mockPubNub.fetchMessages.mockResolvedValue({
        channels: {
          'topic-1': messages
        }
      });

      await provider.init({
        connectionStatus: mockConnectionStatus,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        userId: 'test-user-id'
      });

      // Wait for async fetchMissedMessages
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockOnNotification).toHaveBeenCalledWith({
        ...notification,
        timestamp: '2009-02-13T23:31:30.000Z',
        topicId: 'topic-1'
      });
      const storedValue = await mockStorage.getItem<number>(mockStorageKeys.getLastSync('topic-1'));
      expect(storedValue).toBe('12345678900000001');
    });

    test('should handle topics with no messages', async () => {
      mockStorage.setItem(mockStorageKeys.getSubscribedTopics(), ['topic-1']);
      mockStorage.setItem(mockStorageKeys.getLastSync('topic-1'), 0);

      mockPubNub.fetchMessages.mockResolvedValue({
        channels: {
          'topic-1': []
        }
      });

      await provider.init({
        connectionStatus: mockConnectionStatus,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        userId: 'test-user-id'
      });

      // Wait for async fetchMissedMessages
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockPubNub.fetchMessages).toHaveBeenCalled();
      expect(mockOnNotification).not.toHaveBeenCalled();
    });

    test('should handle topics with undefined messages in response', async () => {
      mockStorage.setItem(mockStorageKeys.getSubscribedTopics(), ['topic-1']);
      mockStorage.setItem(mockStorageKeys.getLastSync('topic-1'), 0);

      mockPubNub.fetchMessages.mockResolvedValue({
        channels: {
          'topic-1': undefined
        }
      });

      await provider.init({
        connectionStatus: mockConnectionStatus,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        userId: 'test-user-id'
      });

      // Wait for async fetchMissedMessages
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockPubNub.fetchMessages).toHaveBeenCalled();
      expect(mockOnNotification).not.toHaveBeenCalled();
    });

    test('should handle error in fetchMissedMessages during init', async () => {
      mockStorage.setItem(mockStorageKeys.getSubscribedTopics(), ['topic-1']);
      mockStorage.setItem(mockStorageKeys.getLastSync('topic-1'), 0);

      const error = new Error('Fetch error');
      mockPubNub.fetchMessages.mockRejectedValue(error);

      await provider.init({
        connectionStatus: mockConnectionStatus,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        userId: 'test-user-id'
      });

      // Wait for async fetchMissedMessages
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'NotificationsClient:PubNubProvider: Failed to fetch missed messages',
        error
      );
    });
  });

  describe('processNotification', () => {
    beforeEach(async () => {
      await setupProvider([{ id: 'topic-1', name: 'Topic 1', custom: {} }]);
    });

    test('should handle error for invalid notification (null)', async () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];

      // Subscribe first
      const subscribePromise = provider.subscribe('topic-1');
      listener.status({
        operation: 'PNSubscribeOperation',
        affectedChannels: ['topic-1']
      });
      await subscribePromise;

      // Clear previous error calls
      mockLogger.error.mockClear();

      // The error will be thrown and caught by the message handler's .catch()
      listener.message({
        channel: 'topic-1',
        message: null,
        timetoken: '12345678900000000'
      });

      // Wait for async processing and error handling
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify both error logs were called (invalid notification + failed to process)
      expect(mockLogger.error).toHaveBeenCalledWith('NotificationsClient:PubNubProvider: Invalid notification', null);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'NotificationsClient:PubNubProvider: Failed to process notification',
        expect.any(Error)
      );
    });

    test('should handle error for invalid notification (non-object)', async () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];

      // Subscribe first
      const subscribePromise = provider.subscribe('topic-1');
      listener.status({
        operation: 'PNSubscribeOperation',
        affectedChannels: ['topic-1']
      });
      await subscribePromise;

      // Clear previous error calls
      mockLogger.error.mockClear();

      // The error will be thrown and caught by the message handler's .catch()
      listener.message({
        channel: 'topic-1',
        message: 'invalid string',
        timetoken: '12345678900000000'
      });

      // Wait for async processing and error handling
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify both error logs were called (invalid notification + failed to process)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'NotificationsClient:PubNubProvider: Invalid notification',
        'invalid string'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'NotificationsClient:PubNubProvider: Failed to process notification',
        expect.any(Error)
      );
    });

    test('should process valid notification and store timetoken', async () => {
      const listener = mockPubNub.addListener.mock.calls[0][0];

      // Subscribe first
      const subscribePromise = provider.subscribe('topic-1');
      listener.status({
        operation: 'PNSubscribeOperation',
        affectedChannels: ['topic-1']
      });
      await subscribePromise;

      const notification = {
        id: 'msg-1',
        title: 'Test',
        body: 'Test message'
      };

      listener.message({
        channel: 'topic-1',
        message: notification,
        timetoken: '12345678900000000'
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockOnNotification).toHaveBeenCalledWith({
        ...notification,
        timestamp: '2009-02-13T23:31:30.000Z',
        topicId: 'topic-1'
      });
      const storedTimestamp = await mockStorage.getItem<number>(mockStorageKeys.getLastSync('topic-1'));
      expect(storedTimestamp).toBe('12345678900000001');
    });
  });
});
