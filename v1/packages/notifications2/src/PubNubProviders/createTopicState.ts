import { Observable, merge } from 'rxjs';
import { distinctUntilChanged, filter, map, scan } from 'rxjs/operators';
import { StoredTopic } from '../types';
import { TopicCommand, TopicState, INITIAL_TOPIC_STATE, topicReducer } from './topicReducer';

/**
 * Order-independent comparison of two topic arrays.
 * Compares id, isSubscribed, name, and publisher so metadata updates propagate.
 */
const topicKey = (t: StoredTopic): string => `${t.id}:${t.isSubscribed}:${t.name}:${t.publisher}`;

const areTopicsEqual = (a: StoredTopic[], b: StoredTopic[]): boolean => {
  if (a.length !== b.length) return false;
  const aSet = new Set(a.map((topic) => topicKey(topic)));
  return b.every((topic) => aSet.has(topicKey(topic)));
};

/**
 * Creates a topic state observable from merged command sources.
 *
 * - Merges all command sources into a single stream
 * - Accumulates state via scan(topicReducer)
 * - Only emits after initialization (first 'loaded' command)
 * - Deduplicates emissions (order-independent compare on id + isSubscribed + name + publisher)
 *
 * @param sources - Observable command sources to merge
 * @returns Observable emitting StoredTopic[] after each state change
 */
export const createTopicState$ = (sources: {
  loaded$: Observable<TopicCommand>;
  fetched$: Observable<TopicCommand>;
  commands$: Observable<TopicCommand>;
}): Observable<StoredTopic[]> =>
  merge(sources.loaded$, sources.fetched$, sources.commands$).pipe(
    scan(topicReducer, INITIAL_TOPIC_STATE),
    filter((state: TopicState) => state.initialized),
    map((state) => [...state.topics.values()]),
    distinctUntilChanged(areTopicsEqual)
  );
