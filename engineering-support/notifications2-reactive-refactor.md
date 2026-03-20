# notifications2 — Pure Reactive Refactor Plan

## Root Cause Analysis

All symptoms (duplicate API calls, duplicate notifications, stale/missing state) trace to **three architectural violations**:

| Root Cause | Symptoms |
|---|---|
| Cold observables re-execute on each subscription (`initializeState$` subscribed twice in `_topics$`) | Duplicate API calls, duplicate state initialization |
| Fire-and-forget `.subscribe()` for storage writes (uncoordinated with main pipeline) | Race conditions → stale/missing state, storage reads return outdated values |
| Imperative `BehaviorSubject.next()` inside `tap()` side-effects | State changes invisible to the reactive graph → inconsistent emissions, stale data |

The fundamental design flaw: **state is mutated as a side-effect rather than derived from the stream**. The `BehaviorSubject` acts as a mutable global variable that gets poked from multiple places, rather than being the single output of a well-defined reactive pipeline.

### What "pure reactive" means for this library:

1. **Every state change** flows through an observable pipeline — no imperative `.next()` calls scattered across methods
2. **Storage writes are in the pipeline**, not fire-and-forget side-effects — they must complete before the next step
3. **Cold observables are shared** at the point of definition if they'll be subscribed to more than once
4. **`subscribe()`/`unsubscribe()`** push commands into the pipeline via a Subject, rather than mutating state directly

---

## Architecture: Command-Driven State via `scan()`

Replace imperative `BehaviorSubject.next()` with a command-driven `scan()` pattern.

Currently, state is mutated from 5 different call sites via `this.topicsState$.next()`:
- `initializeState$` tap (line 169)
- `updateTopicsWithFetched` (line 359) called from `topicSyncUpdates$` tap
- `subscribe()` method (via `updateTopicState`)
- `unsubscribe()` method (via `updateTopicState`)
- `catchError` in initializeState$ (line 174)

The refactor introduces a single **action stream** that all state changes flow through:

```typescript
type TopicAction =
  | { type: 'loaded'; topics: StoredTopic[] }
  | { type: 'fetched'; topics: Topic[] }
  | { type: 'subscribe'; topicId: string }
  | { type: 'unsubscribe'; topicId: string };

type TopicState = {
  initialized: boolean;
  topics: Map<string, StoredTopic>;
};

private readonly actions$ = new Subject<TopicAction>();

private readonly topicsState$: Observable<Map<string, StoredTopic>> = this.actions$.pipe(
  scan((state, action) => this.reduceTopicState(state, action),
    { initialized: false, topics: new Map() }
  ),
  filter((state) => state.initialized),
  map((state) => state.topics),
  shareReplay(1)
);
```

### Reducer design — merge, don't replace

```typescript
case 'fetched':
  const merged = new Map(state.topics);
  action.topics.forEach(fetched => {
    const existing = state.topics.get(fetched.id);
    merged.set(fetched.id, {
      ...fetched,
      isSubscribed: existing ? existing.isSubscribed : fetched.autoSubscribe
    });
  });
  return { ...state, topics: merged };
```

### Gate subscribe/unsubscribe behind initialization (Option B)

`subscribe()` and `unsubscribe()` wait for `_topics$` to emit (= initialized) before pushing actions:

```typescript
subscribe(topicId: string): Observable<void> {
  return this._topics$.pipe(
    take(1),
    tap(() => this.actions$.next({ type: 'subscribe', topicId })),
    switchMap(() => this.persistSubscription$(topicId))
  );
}
```

---

## `_topics$` Pipeline — No Double Subscription

```typescript
private readonly _topics$: Observable<StoredTopic[]> = defer(() => {
  const initialize$ = this.storage.getItem<CachedTopics>(this.storageKeys.getTopics()).pipe(
    this.migrateLegacySubscribedTopics(),
    tap((cached) => {
      this.actions$.next({ type: 'loaded', topics: cached?.topics ?? [] });
    }),
    shareReplay(1)  // shared: subscribed once, replayed to initialFetchIfNeeded$
  );

  const initialFetchIfNeeded$ = initialize$.pipe(
    filter((cached) => !cached),
    take(1),
    map(() => void 0)
  );

  const topicSyncUpdates$ = merge(initialFetchIfNeeded$, this.config.topicSync$).pipe(
    exhaustMap(() =>
      this.fetchTopicsWithRetry().pipe(
        tap((fetched) => this.actions$.next({ type: 'fetched', topics: fetched })),
        switchMap(() => this.persistTopics$()),
        catchError((error) => {
          this.logger.error('Failed to fetch topics:', error);
          return EMPTY;
        })
      )
    )
  );

  return concat(initialize$, topicSyncUpdates$).pipe(
    switchMap(() => this.topicsState$),
    map((topicsMap) => [...topicsMap.values()]),
    distinctUntilChanged((a, b) => this.areTopicsEqual(a, b)),
    concatMap((topics) => this.persistTopics$(topics).pipe(map(() => topics))),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}).pipe(shareReplay({ bufferSize: 1, refCount: true }));
```

---

## `_notifications$` Pipeline — Storage Writes In Pipeline

- **Keep `share()`** — notifications are events, not state. No replay. Consumer handles accumulation.
- Storage writes for `lastSync` moved into the pipeline via `switchMap`:

```typescript
// BEFORE (fire-and-forget):
tap((notifications) => {
  this.storage.setItem(...).pipe(catchError(...)).subscribe();
})

// AFTER (in the pipeline):
switchMap((notifications) =>
  this.storage.setItem(this.storageKeys.getLastSync(topicId), newLastSync).pipe(
    map(() => notifications),
    catchError((error) => {
      this.logger.warn(`Failed to persist lastSync:`, error);
      return of(notifications);  // still emit even if storage fails
    })
  )
)
```

---

## Eliminate All Fire-and-Forget `.subscribe()` Calls

| Location | Current | Refactored |
|---|---|---|
| Line 207-217: Init lastSync for auto-subscribed | `forEach` + `.subscribe()` in `tap` | `concatMap` + `forkJoin` — all writes complete before pipeline continues |
| Line 237-245: Persist topics | `.subscribe()` in `tap` | `concatMap` in pipeline |
| Line 543-551: Persist lastSync after fetch | `.subscribe()` in `tap` | `switchMap` passing notifications through |

---

## Refactor Checklist

### Phase 1: Action stream + pure reducer
- [ ] Define `TopicAction` union type (`loaded`, `fetched`, `subscribe`, `unsubscribe`)
- [ ] Define `TopicState` type (`{ initialized: boolean; topics: Map<string, StoredTopic> }`)
- [ ] Replace `BehaviorSubject<Map>` with `actions$ = new Subject<TopicAction>()`
- [ ] Implement `reduceTopicState(state, action)` as a pure function
  - `loaded`: set `initialized: true`, populate from cached topics
  - `fetched`: **merge** with existing state, preserve `isSubscribed`
  - `subscribe`/`unsubscribe`: update `isSubscribed` on existing map (only when initialized)
- [ ] Derive `topicsState$` from `actions$.pipe(scan(...), shareReplay(1))`
- [ ] Remove `updateTopicState()` and `updateTopicsWithFetched()` helper methods

### Phase 2: Fix `_topics$` double subscription
- [ ] Make `initialize$` a shared cold observable (`shareReplay(1)`)
- [ ] `initialize$` pushes `{ type: 'loaded' }` via `tap`
- [ ] `initialFetchIfNeeded$` derives from shared `initialize$` (no re-execution)
- [ ] Keep `concat(initialize$, topicSyncUpdates$)` structure — guarantees ordering
- [ ] `topicSyncUpdates$` pushes `{ type: 'fetched' }` via `tap` after fetch

### Phase 3: Storage writes in the pipeline
- [ ] `_topics$`: replace `tap` + `.subscribe()` persist with `concatMap`
- [ ] `fetchHistoryAndEmit`: replace `tap` + `.subscribe()` lastSync persist with `switchMap`
- [ ] Auto-subscribe lastSync init: replace `forEach` + `.subscribe()` with `forkJoin` + `concatMap`
- [ ] Verify: zero `.subscribe()` calls inside the class

### Phase 4: Gate `subscribe()`/`unsubscribe()` behind initialization
- [ ] `subscribe(topicId)`: `this._topics$.pipe(take(1), tap(() => push action), switchMap(() => persist))`
- [ ] `unsubscribe(topicId)`: same pattern
- [ ] Remove synchronous `topicsState$.value` access

### Phase 5: Cleanup
- [ ] `close()`: `actions$.complete()` + `wrapper.stop()`
- [ ] `notifications$`: keep `share()` (correct for event stream)
- [ ] Remove dead code: `updateTopicState()`, `mergeTopicMetadata()` (logic in reducer)
- [ ] Update tests

### Out of scope
- `PubNubRxWrapper` cold observables — deduplicated by `exhaustMap` at higher level
- `PubNubAuthProvider` — in-memory cache already prevents duplicate fetches
- Error hierarchy, retry logic, legacy migration — structurally sound

### Risk assessment

| Risk | Mitigation |
|---|---|
| Existing tests break | Tests use public API. Internal refactor shouldn't affect contracts, but marble timings may shift. |
| `subscribe()`/`unsubscribe()` now async-gated | Consumer already treats them as async (`firstValueFrom(...)`) |
| `scan` initial state empty until `'loaded'` | `filter(s => s.initialized)` ensures no premature emission |
