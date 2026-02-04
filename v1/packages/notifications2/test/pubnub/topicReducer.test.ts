import { topicReducer, INITIAL_TOPIC_STATE, TopicState } from '../../src/PubNubProviders/topicReducer';
import { StoredTopic, Topic } from '../../src/types';
import { makeTopic, makeStoredTopic } from './testUtils';

const initializedState = (topics: StoredTopic[]): TopicState => ({
  initialized: true,
  topics: new Map(topics.map((t) => [t.id, t]))
});

describe('topicReducer', () => {
  describe('loaded', () => {
    it('sets initialized=true and populates topics', () => {
      const topics = [makeStoredTopic('a', { isSubscribed: true }), makeStoredTopic('b')];
      const result = topicReducer(INITIAL_TOPIC_STATE, { type: 'loaded', topics });

      expect(result.initialized).toBe(true);
      expect(result.topics.size).toBe(topics.length);
      expect(result.topics.get('a')?.isSubscribed).toBe(true);
      expect(result.topics.get('b')?.isSubscribed).toBe(false);
    });

    it('replaces any existing state', () => {
      const before = initializedState([makeStoredTopic('old')]);
      const result = topicReducer(before, { type: 'loaded', topics: [makeStoredTopic('new')] });

      expect(result.topics.has('old')).toBe(false);
      expect(result.topics.has('new')).toBe(true);
    });

    it('handles empty topics array', () => {
      const result = topicReducer(INITIAL_TOPIC_STATE, { type: 'loaded', topics: [] });

      expect(result.initialized).toBe(true);
      expect(result.topics.size).toBe(0);
    });
  });

  describe('fetched', () => {
    it('adds new topics using autoSubscribe for isSubscribed', () => {
      const before = initializedState([]);
      const fetched: Topic[] = [makeTopic('a', { autoSubscribe: true }), makeTopic('b', { autoSubscribe: false })];
      const result = topicReducer(before, { type: 'fetched', topics: fetched });

      expect(result.topics.get('a')?.isSubscribed).toBe(true);
      expect(result.topics.get('b')?.isSubscribed).toBe(false);
    });

    it('preserves isSubscribed for existing topics', () => {
      const before = initializedState([
        makeStoredTopic('a', { isSubscribed: true }),
        makeStoredTopic('b', { isSubscribed: false })
      ]);
      // Server says autoSubscribe=false for 'a', but user already subscribed — preserve it
      const fetched: Topic[] = [
        makeTopic('a', { autoSubscribe: false, name: 'Updated A' }),
        makeTopic('b', { autoSubscribe: true, name: 'Updated B' })
      ];
      const result = topicReducer(before, { type: 'fetched', topics: fetched });

      expect(result.topics.get('a')?.isSubscribed).toBe(true);
      expect(result.topics.get('a')?.name).toBe('Updated A');
      expect(result.topics.get('b')?.isSubscribed).toBe(false);
      expect(result.topics.get('b')?.name).toBe('Updated B');
    });

    it('merges new and existing topics', () => {
      const before = initializedState([makeStoredTopic('existing', { isSubscribed: true })]);
      const fetched: Topic[] = [makeTopic('existing'), makeTopic('new', { autoSubscribe: true })];
      const result = topicReducer(before, { type: 'fetched', topics: fetched });

      expect(result.topics.size).toBe(fetched.length);
      expect(result.topics.get('existing')?.isSubscribed).toBe(true);
      expect(result.topics.get('new')?.isSubscribed).toBe(true);
    });

    it('works on uninitialized state', () => {
      const fetched: Topic[] = [makeTopic('a', { autoSubscribe: true })];
      const result = topicReducer(INITIAL_TOPIC_STATE, { type: 'fetched', topics: fetched });

      // Still not initialized — only 'loaded' sets that flag
      expect(result.initialized).toBe(false);
      expect(result.topics.get('a')?.isSubscribed).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('sets isSubscribed=true for existing topic', () => {
      const before = initializedState([makeStoredTopic('a', { isSubscribed: false })]);
      const result = topicReducer(before, { type: 'subscribe', topicId: 'a' });

      expect(result.topics.get('a')?.isSubscribed).toBe(true);
    });

    it('creates placeholder for unknown topic', () => {
      const before = initializedState([]);
      const result = topicReducer(before, { type: 'subscribe', topicId: 'unknown' });

      expect(result.topics.has('unknown')).toBe(true);
      expect(result.topics.get('unknown')?.isSubscribed).toBe(true);
      expect(result.topics.get('unknown')?.autoSubscribe).toBe(false);
    });

    it('is no-op when not initialized', () => {
      const result = topicReducer(INITIAL_TOPIC_STATE, { type: 'subscribe', topicId: 'a' });

      expect(result).toBe(INITIAL_TOPIC_STATE);
    });

    it('does not mutate other topics', () => {
      const before = initializedState([
        makeStoredTopic('a', { isSubscribed: false }),
        makeStoredTopic('b', { isSubscribed: true })
      ]);
      const result = topicReducer(before, { type: 'subscribe', topicId: 'a' });

      expect(result.topics.get('b')?.isSubscribed).toBe(true);
    });
  });

  describe('unsubscribe', () => {
    it('sets isSubscribed=false for existing topic', () => {
      const before = initializedState([makeStoredTopic('a', { isSubscribed: true })]);
      const result = topicReducer(before, { type: 'unsubscribe', topicId: 'a' });

      expect(result.topics.get('a')?.isSubscribed).toBe(false);
    });

    it('is no-op for unknown topic', () => {
      const before = initializedState([makeStoredTopic('a')]);
      const result = topicReducer(before, { type: 'unsubscribe', topicId: 'unknown' });

      expect(result.topics.size).toBe(1);
    });

    it('is no-op when not initialized', () => {
      const result = topicReducer(INITIAL_TOPIC_STATE, { type: 'unsubscribe', topicId: 'a' });

      expect(result).toBe(INITIAL_TOPIC_STATE);
    });
  });

  describe('immutability', () => {
    it('does not mutate the input state', () => {
      const original = initializedState([makeStoredTopic('a', { isSubscribed: false })]);
      const originalTopics = new Map(original.topics);

      topicReducer(original, { type: 'subscribe', topicId: 'a' });

      expect(original.topics).toEqual(originalTopics);
    });

    it('returns new Map reference on every mutation', () => {
      const before = initializedState([makeStoredTopic('a')]);
      const after = topicReducer(before, { type: 'subscribe', topicId: 'a' });

      expect(after.topics).not.toBe(before.topics);
    });
  });
});
