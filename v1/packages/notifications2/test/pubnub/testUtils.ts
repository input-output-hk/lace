import { NotificationsLogger, StoredTopic, Topic } from '../../src/types';
import { StorageKeys } from '../../src/StorageKeys';

export const createMockLogger = () =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }) as unknown as NotificationsLogger;

export const createMockStorageKeys = () =>
  ({
    getTopics: jest.fn(() => 'notifications:topics'),
    getSubscribedTopics: jest.fn(() => 'notifications:subscribedTopics'),
    getLastSync: jest.fn((id: string) => `notifications:lastSync:${id}`)
  }) as unknown as StorageKeys;

export const makeStoredTopic = (id: string, overrides: Partial<StoredTopic> = {}): StoredTopic => ({
  id,
  name: id,
  isSubscribed: false,
  autoSubscribe: false,
  chain: '',
  publisher: id,
  ...overrides
});

export const makeTopic = (id: string, overrides: Partial<Topic> = {}): Topic => ({
  id,
  name: id,
  autoSubscribe: false,
  chain: '',
  publisher: id,
  ...overrides
});

export const makePubNubResponse = (
  topicId: string,
  messages: { message: unknown; timetoken: string }[]
) => ({
  channels: { [topicId]: messages }
});
