import { StoredTopic, Topic, TopicId } from '../types';

/**
 * All possible state mutations for the topic state.
 */
export type TopicCommand =
  | { type: 'loaded'; topics: StoredTopic[] }
  | { type: 'fetched'; topics: Topic[] }
  | { type: 'subscribe'; topicId: TopicId }
  | { type: 'unsubscribe'; topicId: TopicId };

/**
 * Internal topic state managed by the reducer.
 */
export interface TopicState {
  initialized: boolean;
  topics: Map<TopicId, StoredTopic>;
}

export const INITIAL_TOPIC_STATE: TopicState = {
  initialized: false,
  topics: new Map()
};

/**
 * Pure reducer for topic state. Given current state and a command, returns new state.
 *
 * - loaded: sets initialized=true, populates map from cached topics
 * - fetched: merges with existing state, preserves isSubscribed for known topics,
 *            uses autoSubscribe for new ones
 * - subscribe: sets isSubscribed=true (creates placeholder if unknown topic)
 * - unsubscribe: sets isSubscribed=false (no-op if unknown topic)
 */
export const topicReducer = (state: TopicState, command: TopicCommand): TopicState => {
  switch (command.type) {
    case 'loaded': {
      const topics = new Map(command.topics.map((t): [TopicId, StoredTopic] => [t.id, t]));
      return { initialized: true, topics };
    }

    case 'fetched': {
      const merged = new Map(state.topics);
      for (const fetched of command.topics) {
        const existing = state.topics.get(fetched.id);
        merged.set(fetched.id, {
          ...fetched,
          isSubscribed: existing ? existing.isSubscribed : fetched.autoSubscribe
        });
      }
      return { ...state, topics: merged };
    }

    case 'subscribe': {
      if (!state.initialized) return state;
      const topics = new Map(state.topics);
      const existing = topics.get(command.topicId);
      if (existing) {
        topics.set(command.topicId, { ...existing, isSubscribed: true });
      } else {
        topics.set(command.topicId, {
          id: command.topicId,
          isSubscribed: true,
          autoSubscribe: false,
          chain: '',
          name: command.topicId,
          publisher: command.topicId
        });
      }
      return { ...state, topics };
    }

    case 'unsubscribe': {
      if (!state.initialized) return state;
      const topics = new Map(state.topics);
      const existing = topics.get(command.topicId);
      if (existing) {
        topics.set(command.topicId, { ...existing, isSubscribed: false });
      }
      return { ...state, topics };
    }

    default:
      return state;
  }
};
