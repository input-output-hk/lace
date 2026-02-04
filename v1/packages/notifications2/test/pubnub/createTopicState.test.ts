import { TestScheduler } from 'rxjs/testing';
import { createTopicState$ } from '../../src/PubNubProviders/createTopicState';
import { TopicCommand } from '../../src/PubNubProviders/topicReducer';
import { Topic } from '../../src/types';
import { NEVER } from 'rxjs';
import { makeTopic, makeStoredTopic } from './testUtils';

describe('createTopicState$', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('emits topics after loaded command', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topics = [makeStoredTopic('a', { isSubscribed: true })];
      const loaded$ = cold<TopicCommand>('a', { a: { type: 'loaded', topics } });
      const fetched$ = NEVER;
      const commands$ = NEVER;

      const state$ = createTopicState$({ loaded$, fetched$, commands$ });

      expectObservable(state$).toBe('a', { a: topics });
    });
  });

  it('does not emit before loaded command', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const fetched: Topic[] = [makeTopic('a', { autoSubscribe: true })];
      const loaded$ = cold<TopicCommand>('--a', { a: { type: 'loaded', topics: [] } });
      const fetched$ = cold<TopicCommand>('a', { a: { type: 'fetched', topics: fetched } });
      const commands$ = NEVER;

      const state$ = createTopicState$({ loaded$, fetched$, commands$ });

      // Frame 0: fetched arrives but state not initialized → no emission
      // Frame 2: loaded arrives with empty topics → initialized
      // Fetched was already processed (a is in state from scan), but loaded replaces state with empty []
      // So the emission is empty array since loaded overwrites everything
      expectObservable(state$).toBe('--a', { a: [] });
    });
  });

  it('emits merged state after fetched command', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const existing = [makeStoredTopic('a', { isSubscribed: true })];
      const fetched: Topic[] = [makeTopic('a', { name: 'Updated' }), makeTopic('b', { autoSubscribe: true })];

      const loaded$ = cold<TopicCommand>('a----', { a: { type: 'loaded', topics: existing } });
      const fetched$ = cold<TopicCommand>('--a', { a: { type: 'fetched', topics: fetched } });
      const commands$ = NEVER;

      const state$ = createTopicState$({ loaded$, fetched$, commands$ });

      expectObservable(state$).toBe('a-b', {
        a: existing,
        b: [
          makeStoredTopic('a', { isSubscribed: true, name: 'Updated' }),
          makeStoredTopic('b', { isSubscribed: true, autoSubscribe: true })
        ]
      });
    });
  });

  it('emits updated state after subscribe command', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topics = [makeStoredTopic('a', { isSubscribed: false })];

      const loaded$ = cold<TopicCommand>('a----', { a: { type: 'loaded', topics } });
      const fetched$ = NEVER;
      const commands$ = cold<TopicCommand>('--a', { a: { type: 'subscribe', topicId: 'a' } });

      const state$ = createTopicState$({ loaded$, fetched$, commands$ });

      expectObservable(state$).toBe('a-b', {
        a: topics,
        b: [makeStoredTopic('a', { isSubscribed: true })]
      });
    });
  });

  it('emits updated state after unsubscribe command', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topics = [makeStoredTopic('a', { isSubscribed: true })];

      const loaded$ = cold<TopicCommand>('a----', { a: { type: 'loaded', topics } });
      const fetched$ = NEVER;
      const commands$ = cold<TopicCommand>('--a', { a: { type: 'unsubscribe', topicId: 'a' } });

      const state$ = createTopicState$({ loaded$, fetched$, commands$ });

      expectObservable(state$).toBe('a-b', {
        a: topics,
        b: [makeStoredTopic('a', { isSubscribed: false })]
      });
    });
  });

  it('deduplicates identical emissions', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topics = [makeStoredTopic('a')];

      // Two loaded commands with the same data — should only emit once
      const loaded$ = cold<TopicCommand>('a-a', {
        a: { type: 'loaded', topics }
      });
      const fetched$ = NEVER;
      const commands$ = NEVER;

      const state$ = createTopicState$({ loaded$, fetched$, commands$ });

      expectObservable(state$).toBe('a--', { a: topics });
    });
  });

  it('handles multiple commands in sequence', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const initial = [makeStoredTopic('a', { isSubscribed: false }), makeStoredTopic('b', { isSubscribed: true })];

      const loaded$ = cold<TopicCommand>('a---------', { a: { type: 'loaded', topics: initial } });
      const fetched$ = NEVER;
      const commands$ = cold<TopicCommand>('--a--b', {
        a: { type: 'subscribe', topicId: 'a' } as TopicCommand,
        b: { type: 'unsubscribe', topicId: 'b' } as TopicCommand
      });

      const state$ = createTopicState$({ loaded$, fetched$, commands$ });

      expectObservable(state$).toBe('a-b--c', {
        a: initial,
        b: [makeStoredTopic('a', { isSubscribed: true }), makeStoredTopic('b', { isSubscribed: true })],
        c: [makeStoredTopic('a', { isSubscribed: true }), makeStoredTopic('b', { isSubscribed: false })]
      });
    });
  });
});
