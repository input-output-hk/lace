/* eslint-disable no-magic-numbers */
import { TestScheduler } from 'rxjs/testing';
import { PubNubPollingProvider } from '../../src/PubNubProviders/PubNubPollingProvider';
import { PubNubPollingConfig } from '../../src/PubNubProviders/types';
import { PubNubRxWrapper } from '../../src/PubNubProviders/PubNubRxWrapper';
import { NotificationsLogger, StorageAdapter, Topic } from '../../src/types';
import { of, Subject } from 'rxjs';
import { NotificationsAuthProvider } from '../../src/provider.interface';
import { StorageKeys } from '../../src/StorageKeys';

describe('PubNubPollingProvider', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  describe('setupTopicSync', () => {
    it('should emit topics when topicSync$ triggers and wrapper fetchTopics emits', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Mock channel metadata from PubNub
        const mockChannels: Topic[] = [
          {
            id: 'topic-1',
            name: 'Topic One',
            autoSubscribe: true,
            chain: 'mainnet',
            publisher: 'Publisher One'
          },
          {
            id: 'topic-2',
            name: 'Topic Two',
            autoSubscribe: false,
            chain: 'testnet',
            publisher: 'Publisher Two'
          }
        ];

        // Expected topics after transformation
        const expectedTopics: Topic[] = [
          {
            id: 'topic-1',
            name: 'Topic One',
            autoSubscribe: true,
            isSubscribed: true,
            lastSync: expect.any(String),
            chain: 'mainnet',
            publisher: 'Publisher One'
          },
          {
            id: 'topic-2',
            name: 'Topic Two',
            autoSubscribe: false,
            isSubscribed: false,
            lastSync: undefined,
            chain: 'testnet',
            publisher: 'Publisher Two'
          }
        ];

        // Create mock wrapper with marble-testable fetchTopics
        const mockWrapper = {
          fetchTopics: jest.fn(() => cold('--a|', { a: mockChannels }))
        } as unknown as jest.Mocked<PubNubRxWrapper>;

        // Create topicSync$ subject that we control
        const topicSync$ = new Subject<void>();

        // Mock storage that returns empty topics on load
        const mockStorage = {
          getItem: jest.fn(() => of(void 0)),
          setItem: jest.fn(() => of(void 0))
        } as unknown as StorageAdapter;

        // Mock logger
        const mockLogger = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        } as unknown as NotificationsLogger;

        // Mock storage keys
        const mockStorageKeys = {
          getTopics: jest.fn(() => 'topics-key')
        } as unknown as StorageKeys;

        // Mock config
        const mockConfig: PubNubPollingConfig = {
          authProvider: {} as NotificationsAuthProvider,
          notificationSync$: new Subject(),
          topicSync$,
          storage: mockStorage,
          storageKeys: mockStorageKeys,
          wrapper: mockWrapper,
          logger: mockLogger
        };

        // Create provider (now lazy - doesn't load until topics$ is subscribed)
        const provider = new PubNubPollingProvider(mockConfig);

        // Get the topics$ observable (no parentheses - it's a getter)
        const topics$ = provider.topics$;

        // Emit sync signal at frame 10
        cold('----------a', { a: undefined }).subscribe(() => topicSync$.next());

        // Expect topics to be emitted 2 frames after the sync signal (10 + 2 = 12)
        expectObservable(topics$).toBe('i-----------a', { i: [], a: expectedTopics });
      });
    });
  });
});
