# notifications2 — Simplification Spec

## Goal

Rewrite `PubNubPollingProvider` as a composition of small, pure reactive building blocks.
Each block is a **function** (not a class) with typed inputs/outputs, zero side-effects,
and testable with marble tests in isolation.

## Design Principles

1. **Every building block is a function** `(...observables, ...config) => Observable<T>`
2. **No `tap(() => subject.next())`** — actions enter `scan` via `merge`, not side-effects
3. **No fire-and-forget `.subscribe()`** — storage writes are operators in the pipeline
4. **One Subject total** — `commands$` at the imperative boundary (subscribe/unsubscribe calls)
5. **Storage failures never crash pipelines** — in-memory state is authoritative, storage is best-effort
6. **Function expressions only** — use `const fn = (...) => ...` or `const fn = function(...)`, never `function fn(...)` (ESLint `func-style: "expression"` via `eslint-config-formidable`)

---

## Architecture

Two independent output pipelines, built from shared building blocks:

```
                          ┌─────────────────────┐
topicSync$ ──────────────→│                     │
                          │   createTopics$()   │──→ topics$
subscribe/unsubscribe ──→ │                     │
                          └─────────────────────┘
                                    │
                                    │ reads (withLatestFrom)
                                    ▼
                          ┌─────────────────────┐
notificationSync$ ──────→ │ createNotifications$│──→ notifications$
                          └─────────────────────┘

```

---

## Building Blocks

### Block 1: `topicReducer` — pure function

```typescript
// file: topicReducer.ts

type TopicCommand =
  | { type: 'loaded'; topics: StoredTopic[] }
  | { type: 'fetched'; topics: Topic[] }
  | { type: 'subscribe'; topicId: TopicId }
  | { type: 'unsubscribe'; topicId: TopicId };

interface TopicState {
  initialized: boolean;
  topics: Map<TopicId, StoredTopic>;
}

const INITIAL_STATE: TopicState = { initialized: false, topics: new Map() };

const topicReducer = (state: TopicState, command: TopicCommand): TopicState => { ... };
```

**Contract:**
- Input: current state + command
- Output: new state
- Pure function — no I/O, no observables
- `loaded`: sets initialized=true, populates map
- `fetched`: merges with existing, preserves `isSubscribed` for known topics, uses `autoSubscribe` for new ones
- `subscribe`: sets `isSubscribed=true` (creates placeholder if unknown topic)
- `unsubscribe`: sets `isSubscribed=false`

**Test:** unit tests (not marble — it's a pure function)

---

### Block 2: `createTopicState$` — state pipeline factory

```typescript
// file: createTopicState.ts

const createTopicState$ = (sources: {
  loaded$: Observable<StoredTopic[]>;
  fetched$: Observable<Topic[]>;
  commands$: Observable<TopicCommand>;
}): Observable<StoredTopic[]> => { ... };
```

**Contract:**
- Input: three observable sources (already mapped to commands by caller)
- Output: `Observable<StoredTopic[]>` — emits after each state change, only when initialized
- Implementation: `merge(loaded$, fetched$, commands$).pipe(scan(topicReducer, INITIAL), ...)`
- `distinctUntilChanged` on the output (shallow compare id + isSubscribed)
- `shareReplay(1)`

**Test:** marble test — cold sources in, verify emissions with `expectObservable`

---

### Block 3: `persistTopics` — RxJS operator

```typescript
// file: persistTopics.ts

const persistTopics = (
  storage: StorageAdapter,
  storageKeys: StorageKeys,
  logger: NotificationsLogger
): OperatorFunction<StoredTopic[], StoredTopic[]> => { ... };
```

**Contract:**
- Input operator: receives `StoredTopic[]` emissions
- Output: same `StoredTopic[]` passthrough, after persistence completes
- Uses `concatMap` — waits for storage write before passing through
- `catchError` on write failure — logs warning, passes through anyway (in-memory is authoritative)

**Test:** marble test — verify passthrough timing, verify storage mock called, verify error recovery

---

### Block 4: `withAuthRetry` — authenticated operation wrapper

```typescript
// file: withAuthRetry.ts

const withAuthRetry = <T>(
  authProvider: NotificationsAuthProvider,
  wrapper: PubNubRxWrapper,
  operation: () => Observable<T>,
  logger: NotificationsLogger
): Observable<T> => { ... };
```

**Contract:**
- Gets token from `authProvider.getToken()`
- Sets token on wrapper via `wrapper.setToken(token)`
- Executes `operation()`
- On auth error (first attempt): `authProvider.clearToken()` → `getToken(forceRefresh=true)` → `setToken` → retry once
- On auth error (second attempt): throw (unrecoverable)
- On network/other errors: throw (caller handles retry)

**Test:** marble test — mock authProvider + wrapper, verify token flow, verify retry on auth error, verify give-up on second auth error

---

### Block 5: `withNetworkRetry` — retry operator

```typescript
// file: withNetworkRetry.ts

const withNetworkRetry = <T>(
  logger: NotificationsLogger,
  config?: { initialInterval?: number; maxRetries?: number }
): MonoTypeOperatorFunction<T> => { ... };
```

**Contract:**
- Retries on network errors with exponential backoff
- Non-network errors pass through immediately
- Defaults: 1s initial interval, 10 max retries

**Test:** marble test — verify retry timing, verify non-network errors pass through

---

### Block 6: `syncTopicNotifications` — per-topic notification fetcher

```typescript
// file: syncTopicNotifications.ts

const syncTopicNotifications = (
  topicId: TopicId,
  incomingTimestamp: string,
  deps: {
    wrapper: PubNubRxWrapper;
    storage: StorageAdapter;
    storageKeys: StorageKeys;
    logger: NotificationsLogger;
  }
): Observable<Notification[]> => { ... };
```

**Contract:**
- Reads `lastSync` for this topic from storage
- If `incomingTimestamp <= lastSync`: emits `[]`
- If `incomingTimestamp > lastSync`:
  - Fetches history from PubNub via `wrapper.fetchHistory([topicId], lastSync)`
  - Transforms PubNub messages to `Notification[]`
  - Persists new lastSync to storage (catchError — emit notifications even if persist fails)
- If lastSync missing: logs warning, emits `[]` (topic should have been initialized on subscribe or resubscribe via `resetLastSync$`)

**Note:** this function does NOT handle auth — caller wraps it with `withAuthRetry`.

**Test:** marble test — mock storage + wrapper, verify timestamp comparison, verify lastSync update, verify storage failure handling

---

### Block 7: `createTopics$` — topics pipeline factory

```typescript
// file: createTopics.ts

const createTopics$ = (config: {
  topicSync$: Observable<void>;
  storage: StorageAdapter;
  storageKeys: StorageKeys;
  wrapper: PubNubRxWrapper;
  logger: NotificationsLogger;
}): {
  topics$: Observable<StoredTopic[]>;
  commands$: Subject<TopicCommand>;
} => { ... };
```

**Contract:**
- Creates the single `commands$` Subject (imperative boundary)
- Builds `loaded$`: reads topics from storage on first subscription (+ legacy migration)
- Builds `fetched$`: on each `topicSync$` emission, fetches from PubNub with `withNetworkRetry`
  - Uses `exhaustMap` — drops sync signals while a fetch is in progress
  - After fetch: initializes lastSync for newly auto-subscribed topics
- Wires `loaded$` + `fetched$` + `commands$` → `createTopicState$` → `persistTopics` → `topics$`
- Returns both `topics$` and `commands$` (provider needs `commands$` for subscribe/unsubscribe)

**Initialization flow:**
```
defer(() => {
  loaded$ = storage.getItem(topicsKey).pipe(migrateLegacy, map(toLoadedCommand))
  initialFetchIfEmpty$ = loaded$.pipe(filter(empty), map(() => void 0))
  fetched$ = merge(initialFetchIfEmpty$, topicSync$).pipe(
    exhaustMap(() => wrapper.fetchTopics().pipe(withNetworkRetry)),
    map(toFetchedCommand)
  )
  return createTopicState$(loaded$, fetched$, commands$).pipe(persistTopics)
})
```

**Test:** marble test — mock storage + wrapper, verify load → fetch → merge → persist flow

---

### Block 8: `createNotifications$` — notifications pipeline factory

```typescript
// file: createNotifications.ts

const createNotifications$ = (config: {
  notificationSync$: Observable<string>;
  topics$: Observable<StoredTopic[]>;
  authProvider: NotificationsAuthProvider;
  wrapper: PubNubRxWrapper;
  storage: StorageAdapter;
  storageKeys: StorageKeys;
  logger: NotificationsLogger;
}): Observable<Notification> => { ... };
```

**Contract:**
- On each `notificationSync$` emission (carries timestamp):
  - Reads subscribed topics from `topics$` (withLatestFrom)
  - Gets auth token ONCE via `withAuthRetry` wrapping the whole batch
  - For each subscribed topic (mergeMap, concurrency=5):
    - `syncTopicNotifications(topicId, timestamp, deps)`
  - On auth error from any topic: retry entire batch once (via `withAuthRetry`)
  - On network error per-topic: `catchError` → skip topic, continue others
- Uses `exhaustMap` on `notificationSync$` — drops signals while fetch is in progress
- Uses `share()` — notifications are events, not state (no replay)
- Flattens `Notification[]` to individual `Notification` emissions

**Test:** marble test — mock all deps, verify fan-out, verify auth is fetched once per batch, verify concurrency

---

### Block 9: `PubNubPollingProvider` — composition layer

```typescript
// file: PubNubPollingProvider.ts

class PubNubPollingProvider implements NotificationProvider {
  readonly topics$: Observable<StoredTopic[]>;
  readonly notifications$: Observable<Notification>;

  constructor(config: PubNubPollingConfig) {
    const { topics$, commands$ } = createTopics$({ ... });
    this.topics$ = topics$;
    this.notifications$ = createNotifications$({ topics$, ... });
    this._commands$ = commands$;
  }

  subscribe(topicId: TopicId): Observable<void> {
    return this.topics$.pipe(
      take(1),
      tap(() => this._commands$.next({ type: 'subscribe', topicId })),
      switchMap(() => concat(
        persistSubscription$(topicId, this.storage, this.storageKeys),
        resetLastSync$(topicId, this.storage, this.storageKeys, this.logger),
      )),
    );
  }

  unsubscribe(topicId: TopicId): Observable<void> { /* mirror of subscribe */ }
  close(): void { this._commands$.complete(); this.wrapper.stop(); }
}
```

**~50 lines.** Only class in the system. Everything else is functions.

**Resubscribe lastSync reset:**
On `subscribe()`, after persisting the subscription, `resetLastSync$` writes `lastSync = now`
for the topic. This ensures that after an unsubscribe→resubscribe cycle, only messages arriving
*after* the resubscription point are fetched — messages from the unsubscribed period are skipped.
`resetLastSync$` follows the standard storage failure strategy (best-effort, catchError + log).

---

## Storage Failure Strategy

All storage operations follow:

```typescript
// Writes: best-effort, never crash
storage.setItem(key, value).pipe(
  catchError((error) => {
    logger.warn(`Failed to persist ${key}:`, error);
    return of(void 0);
  })
)

// Reads: fallback to undefined
storage.getItem(key).pipe(
  catchError((error) => {
    logger.warn(`Failed to read ${key}:`, error);
    return of(undefined);
  })
)
```

In-memory state (the `scan` accumulator) is authoritative. Storage is a cache that may lag or be unavailable.

---

## File Structure

```
src/PubNubProviders/
  PubNubPollingProvider.ts    — Block 9 (composition, ~50 lines)
  createTopics.ts             — Block 7 (~100 lines)
  createNotifications.ts      — Block 8 (~80 lines)
  topicReducer.ts             — Block 1 (~60 lines)
  createTopicState.ts         — Block 2 (~30 lines)
  persistTopics.ts            — Block 3 (~20 lines)
  withAuthRetry.ts            — Block 4 (~40 lines)
  withNetworkRetry.ts         — Block 5 (~15 lines)
  syncTopicNotifications.ts   — Block 6 (~60 lines)
  PubNubRxWrapper.ts          — existing, unchanged
  PubNubAuthProvider.ts       — existing, unchanged
  types.ts                    — existing + TopicCommand, TopicState exports

test/pubnub/
  topicReducer.test.ts
  createTopicState.test.ts
  persistTopics.test.ts
  withAuthRetry.test.ts
  withNetworkRetry.test.ts
  syncTopicNotifications.test.ts
  createTopics.test.ts
  createNotifications.test.ts
  PubNubPollingProvider.test.ts
```

**Total: ~455 lines of implementation** (down from 714), split across 9 files averaging ~50 lines each.

---

## Migration Checklist

- [x] Block 1: `topicReducer` — extract from current `reduceTopicState`, add unit tests
- [x] Block 2: `createTopicState$` — new file, marble tests
- [x] Block 3: `persistTopics` — extract operator, marble tests
- [x] Block 4: `withAuthRetry` — extract from current `fetchHistoryWithAuth`, marble tests
- [x] Block 5: `withNetworkRetry` — extract from current retry config, marble tests
- [x] Block 6: `syncTopicNotifications` — extract from current `syncTopicIfNeeded` + `fetchHistoryAndEmit`, marble tests
- [x] Block 7: `createTopics$` — extract from current `_topics$`, marble tests
- [x] Block 8: `createNotifications$` — extract from current `_notifications$`, marble tests
- [x] Block 9: `PubNubPollingProvider` — rewrite as thin composition, integration marble tests
- [x] Block 10: Test review — deduplicate and extract shared utils
  - Extract `test/pubnub/testUtils.ts` with shared helpers:
    `createMockLogger`, `createMockStorageKeys`, `createMockStorage`, `createMockWrapper`,
    `makeTopic`, `makeStoredTopic`, `makePubNubResponse`
  - Mocks are minimal — tests configure state after creation, no config/preset objects
  - Remove duplicate tests (block-level tests own detailed behavior, integration tests verify wiring only):
    - Migration logic: keep in `createTopics.test.ts`, remove from `PubNubPollingProvider.test.ts`
    - Storage write failures: keep in `persistTopics.test.ts`, remove from `createTopics.test.ts`
    - Network retry timing: keep in `withNetworkRetry.test.ts`, simplify in `PubNubPollingProvider.retry.test.ts`
    - Auth token refresh: keep in `withAuthRetry.test.ts`, simplify in `PubNubPollingProvider.retry.test.ts`
- [x] Delete old monolithic implementation
- [x] Verify all existing integration tests pass

Each block can be implemented independently given only its contract (types + description above).
