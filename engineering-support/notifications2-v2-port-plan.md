# Port notifications2 to Lace v2 — Implementation Plan

**Date:** 2026-03-20
**Status:** Approved

---

## Context

Port the `@lace/notifications2` library from v1 (`v1/packages/notifications2/`) into the Lace v2 architecture, integrating it with the existing `@lace-contract/notification-center` contract and `@lace-module/notification-center` module.

### Runtime Architecture

v1 and v2 share the same browser extension service worker. The v1 notification center in the service worker is being removed. v2's notification center (Redux + side effects) replaces it. The v1 UI will be updated to consume the notification center API from v2 instead of running its own.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Library placement** | New `@lace-lib/notifications2` package | Self-contained, own test suite, no React/Redux dependency, follows v2 lib separation (ADR 14) |
| **Type relationship** | Aligned types | Contract `NotificationsTopic` uses `isSubscribed` (matching library's `StoredTopic`), `publisher` on topic (not message). `LaceMessage` fields `chain`, `format` are optional (matching v1). Minimizes adapter mapping. |
| **PostHog trigger** | Side effect watches feature store selector | Idiomatic v2 pattern (ADR 19), marble-testable, no extension messaging needed for internal triggers |
| **Storage** | `storageDependencyContract` | Injected via `dependsOn`, platform-agnostic |
| **Notification dispatch** | Reuse existing `addNotification` action | Provider emits one at a time via `share()`, no batch action needed |
| **Topic dispatch** | New `syncTopicsFromProvider` action | Merge semantics are non-trivial — must preserve user subscription state for known topics |
| **Mode switching** | Single module, two feature flags | `NOTIFICATION_CENTER` = production (PubNub). `NOTIFICATION_CENTER_DEV` = dev/test (no PubNub, data seeded via test API). Single branching point in `bootstrapProvider`. `expose-api.ts` test methods gated by `NOTIFICATION_CENTER_DEV`. Noop = neither flag active |
| **v1 data migration** | New `@lace-module/migrate-v1-notifications` module | Separate from `migrate-v1-data` (which is gated behind unshipped `V1_MIGRATION` flag). Always loads (no feature flag). Own marker slice `migrateV1Notifications`. Uses same `preloadedState` pattern. |
| **v1 UI bridge** | v1 UI updated to consume v2's channel | v1 `consumeRemoteApi` updated to use v2's `notification-center` channel name. Both messaging libraries (`@cardano-sdk/web-extension`, `@lace-sdk/extension-messaging`) are wire-compatible |

### Module Variants

| Mode | v1 Mechanism | v2 Mechanism |
|------|-------------|--------------|
| **Production** | `NOTIFICATION_CENTER_MODE=production` | `NOTIFICATION_CENTER` feature flag — module loads, PubNub bootstraps, data from real provider |
| **Dev/Test** | `NOTIFICATION_CENTER_MODE=test` | `NOTIFICATION_CENTER_DEV` feature flag — module loads, PubNub skipped, data seeded via `test.init`/`test.add` in `expose-api.ts` |
| **Noop/Disabled** | `NOTIFICATION_CENTER_MODE=noop` (default) | Neither flag active — module doesn't load, Redux slice stays empty |

### Dependency Chain

```
Phase 1 (library)  ──┐
                      ├──→ Phase 4 (prod module: dependencies + side effects + tests)
Phase 2 (contract) ──┤
                      ├──→ Phase 3 (migration — new @lace-module/migrate-v1-notifications)
                      └──→ Phase 5 (v1 integration)
```

- Phases 1 and 2 are independent (parallelizable)
- Phase 3 depends on Phase 2 only (needs contract types for preloadedState shape). Does NOT depend on Phase 1 (migration reads raw v1 storage, not the library). Separate module from `migrate-v1-data` — always loads, no feature flag.
- Phase 4 (production module) depends on Phases 1+2. Dependencies, side effects, and tests are a single phase because the provider must be created in a side effect (not during init — `ModuleInitDependencies` only provides `logger`), making the boundary artificial. The `test.add`/`test.init` API in `expose-api.ts` (gated by `NOTIFICATION_CENTER_DEV` flag) serves as the dev/QA injection mechanism — no separate dev module needed.
- Phase 5 (v1 integration) depends on Phase 4 (v2 must expose the API before v1 can consume it)

---

## Phase 1: Create `@lace-lib/notifications2` library package ✅ COMPLETE

**Goal**: Standalone, self-contained library in `v2/packages/lib/notifications2/` that builds and passes all tests independently.

### Steps

- [x] Create package scaffold (`package.json`, `tsconfig.json`, `tsconfig.eslint.json`, `tsconfig.test.json`, `vitest.config.js`, `project.json`, `eslint.config.mjs`)
- [x] Copy all source files from `v1/packages/notifications2/src/` preserving directory structure
- [x] Add dependencies: `pubnub`, `rxjs`, `backoff-rxjs` in `package.json`
- [x] Copy all test files from `v1/packages/notifications2/test/`
- [x] Adapt tests from Jest to Vitest: `jest.fn` → `vi.fn`, add explicit `import { vi } from 'vitest'`, import `Mock`/`Mocked`/`MockInstance` types
- [x] Fix `vi.spyOn(global, 'fetch').mockImplementation()` — Vitest requires an argument unlike Jest
- [x] Convert 5 tests using Jest `done()` callback to `async/await` with `lastValueFrom()` (Vitest deprecated `done()`)
- [x] Fix ESLint errors: `explicit-member-accessibility`, `naming-convention` (boolean `is/has` prefix), `no-base-to-string`, `consistent-type-imports`, `no-unsafe-assignment` (eslint-disable for `expect.objectContaining`)
- [x] Verify: `npx nx run @lace-lib/notifications2:type-check-src` passes
- [x] Verify: `npx nx lint @lace-lib/notifications2` passes (0 errors, 4 warnings)
- [x] Verify: `npx nx test @lace-lib/notifications2` passes (148 tests, 12 test files)

### Implementation Notes

- Scaffold modeled after `@lace-lib/util-provider` and `@lace-lib/navigation` (libs with tests)
- v2 requires Node 24.14.0 — use `nvm use` before running commands
- `rxjs` must NOT have a local `node_modules` copy — delete `packages/lib/notifications2/node_modules/rxjs` if npm creates one (caused by workspace root having 7.8.2 vs package specifying 7.8.1)
- Test files need explicit `import { vi } from 'vitest'` — v2 uses `globals: true` in vitest config (runtime), but TypeScript type-checking requires the import
- No changes to contract or module
- The library has 21 source files and 12 test files with marble tests (+ testUtils.ts)
- Public API: `PubNubPollingProvider`, `PubNubAuthProvider`, `PubNubRxWrapper`, `createPubNubWrapper`, `StorageKeys`, `StorageAdapter`, error types, utility functions

---

## Phase 2: Update `@lace-contract/notification-center` contract

**Goal**: Align contract types with v1/library types and add provider-driven topic sync with merge semantics that preserve user subscription state.

### Type Changes

Update `v2/packages/contract/notification-center/src/store/types.ts`:

#### `LaceMessage` — align with v1

```typescript
export interface LaceMessage {
  body: string;
  chain?: string;    // optional (was required — v1 data may not have it)
  format?: string;   // optional (was required — v1 data may not have it)
  id: string;
  title: string;
  topicId: NotificationsTopic['id'];
  // NOTE: publisher removed from message — it belongs on the topic
}
```

#### `NotificationsTopic` — align with v1 and library `StoredTopic`

```typescript
export interface NotificationsTopic {
  id: string;
  name: string;
  publisher: string;          // moved here from LaceMessage (matches library's StoredTopic)
  isSubscribed?: boolean;     // renamed from 'subscribed' (matches v1 and library's StoredTopic)
  autoSubscribe?: boolean;    // persisted; used only when topic is first seen
}
```

Field renaming (`subscribed` → `isSubscribed`) requires updating:
- All reducers in `slice.ts` that reference `subscribed` (`subscribeToTopic`, `unsubscribeFromTopic`, `syncTopicsFromProvider`)
- All existing tests in `test/store/slice.test.ts`
- Any module code that reads `subscribed`

`autoSubscribe` is optional because:
- Topics from migration won't have it
- Existing persisted state won't have it (additive change, no persist version bump needed)

### Action: `syncTopicsFromProvider`

**Payload shape** — uses the contract's own `NotificationsTopic[]`. The module side effect (Phase 5) maps `StoredTopic[]` → `NotificationsTopic[]` before dispatching. The contract stays decoupled from the library.

```typescript
syncTopicsFromProvider: (
  state,
  action: { payload: { topics: NotificationsTopic[] } },
) => { /* merge logic */ }
```

### Merge Semantics

| Scenario | `isSubscribed` value | Other fields |
|----------|---------------------|--------------|
| **Topic exists in state** | Keep existing `isSubscribed` (even if `undefined`) | Update `name`, `publisher`, `autoSubscribe` from payload |
| **Topic is new** (no matching `id`) | `autoSubscribe === true ? true : undefined` | All fields from payload |

Key invariant: **a user's explicit subscribe/unsubscribe is never overwritten by a provider sync**. `autoSubscribe` only determines the default for topics the user has never seen.

**Topics removed from provider**: Topics in state but absent from payload are **kept** (not removed). Removing would silently unsubscribe users. Topic retirement, if needed, should be a separate action with explicit UX.

**`undefined` vs `false` convention**: New unsubscribed topics get `isSubscribed: undefined` (not `false`) to match `unsubscribeFromTopic` which does `delete topic.isSubscribed`.

### Reducer Implementation

```typescript
syncTopicsFromProvider: (
  state,
  action: { payload: { topics: NotificationsTopic[] } },
) => {
  const existingById = new Map(state.topics.map(t => [t.id, t]));

  for (const incoming of action.payload.topics) {
    const existing = existingById.get(incoming.id);
    if (existing) {
      existing.name = incoming.name;
      existing.publisher = incoming.publisher;
      existing.autoSubscribe = incoming.autoSubscribe;
      // existing.isSubscribed is intentionally untouched
    } else {
      state.topics.push({
        ...incoming,
        isSubscribed: incoming.autoSubscribe === true ? true : undefined,
      });
    }
  }
},
```

### Tests

All tests follow the existing pattern in `test/store/slice.test.ts` — call the reducer directly, assert state.

| # | Test case | Initial state topics | Payload | Expected |
|---|-----------|---------------------|---------|----------|
| 1 | New topic with `autoSubscribe=true` → subscribed | `[]` | `[{ id: 'a', name: 'Alpha', publisher: 'IOG', autoSubscribe: true }]` | `[{ id: 'a', name: 'Alpha', publisher: 'IOG', autoSubscribe: true, isSubscribed: true }]` |
| 2 | New topic with `autoSubscribe=false` → unsubscribed | `[]` | `[{ id: 'a', name: 'Alpha', publisher: 'IOG', autoSubscribe: false }]` | `[{ id: 'a', ..., isSubscribed: undefined }]` |
| 3 | New topic with `autoSubscribe` absent → unsubscribed | `[]` | `[{ id: 'a', name: 'Alpha', publisher: 'IOG' }]` | `[{ id: 'a', ..., isSubscribed: undefined }]` |
| 4 | Existing subscribed topic stays subscribed | `[{ id: 'a', isSubscribed: true }]` | `[{ id: 'a', autoSubscribe: false }]` | `isSubscribed: true` preserved |
| 5 | Existing unsubscribed topic stays unsubscribed even with `autoSubscribe=true` | `[{ id: 'a' }]` (isSubscribed undefined) | `[{ id: 'a', autoSubscribe: true }]` | `isSubscribed: undefined` preserved |
| 6 | Updates `name`, `publisher`, and `autoSubscribe` for existing topic | `[{ id: 'a', name: 'Old', publisher: 'IOG', autoSubscribe: false, isSubscribed: true }]` | `[{ id: 'a', name: 'Renamed', publisher: 'CF', autoSubscribe: true }]` | `name: 'Renamed', publisher: 'CF', autoSubscribe: true, isSubscribed: true` |
| 7 | Keeps topics not present in payload | `[{ id: 'a', isSubscribed: true }, { id: 'b' }]` | `[{ id: 'a', name: 'A-updated' }]` | Both topics present, `b` unchanged |
| 8 | Mix of new and existing topics | `[{ id: 'a', isSubscribed: true }]` | `[{ id: 'a', name: 'A-new' }, { id: 'b', publisher: 'IOG', autoSubscribe: true }]` | `a` name updated + isSubscribed preserved; `b` added with `isSubscribed: true` |

### Steps

- [ ] Update `LaceMessage` in `src/store/types.ts`: make `chain` and `format` optional, remove `publisher`
- [ ] Update `NotificationsTopic` in `src/store/types.ts`: rename `subscribed` → `isSubscribed`, add `publisher: string`, add `autoSubscribe?: boolean`
- [ ] Update all reducers in `src/store/slice.ts` that reference `subscribed` → `isSubscribed` (`subscribeToTopic`, `unsubscribeFromTopic`)
- [ ] Add `syncTopicsFromProvider` reducer to `src/store/slice.ts` with merge semantics above
- [ ] Update all existing tests in `test/store/slice.test.ts` for renamed fields
- [ ] Add 8 test cases to `test/store/slice.test.ts` per the table above
- [ ] Update any module code that references old field names (search for `subscribed`, `publisher` on message)
- [ ] Verify: `npx nx test @lace-contract/notification-center` passes
- [ ] Verify: `npx nx run @lace-contract/notification-center:type-check-src` passes
- [ ] Verify: `npx nx run @lace-contract/notification-center:type-check-test` passes

---

## Phase 3: v1 → v2 notification data migration

**Goal**: Migrate v1 notification center persisted data into v2's Redux store via a dedicated, always-on module `@lace-module/migrate-v1-notifications` in `v2/packages/module/migrate-v1-notifications/`.

### Why a separate module (not `migrate-v1-data`)

`@lace-module/migrate-v1-data` is an existing module gated behind the `V1_MIGRATION` feature flag (not yet enabled in production). It migrates wallets, dapps, network, analytics, etc. Notification migration is an independent concern that should ship on its own timeline. A separate module avoids coupling to the wallet migration's deployment schedule and feature flag.

### Module design

The module always loads (no feature flag — omit the `feature` property from `inferModuleContext`, same pattern as `app-mobile`). It uses the same `preloadedState` mechanism as `migrate-v1-data`:

1. **`init.ts`** returns `{ reducers, preloadedState }` at store creation time (before any side effects run)
2. **Marker slice** `migrateV1Notifications` with state `{ isMigrated: true }` and no actions — its redux-persist key `redux:persist:migrateV1Notifications` signals migration is done
3. **Migration detection**: `redux:persist:notificationsCenter` exists (v1 data present) AND `redux:persist:migrateV1Notifications` doesn't exist (migration hasn't run)
4. **Cleanup**: Delete `redux:persist:notificationsCenter` before returning preloadedState (prevents redux-persist rehydration from overwriting migrated data)

### v1 storage layout

| Key | Format | Migration action |
|-----|--------|-----------------|
| `redux:persist:notificationsCenter` | `{ notifications: LaceNotification[], _persist: '...' }` | Read `notifications` array → `preloadedState` → **delete key** |
| `notifications:topics` | `{ lastFetch: number, topics: StoredTopic[] }` | Read `topics` array → `preloadedState` (key stays — v2 library reuses it) |
| `notifications:userId` | UUID string | No action — v2 library reads same key |
| `notifications:token` | `AuthToken` object | No action — v2 library reads same key |
| `notifications:lastSync:<topicId>` | PubNub timetoken string | No action — v2 library reads same keys |

**Dev module migration**: Not needed. v1 test/dev mode stores data purely in-memory.

### Type mapping

**`LaceNotification`** — 1:1 after Phase 2 type alignment. v1 shape `{ message: LaceMessage, read?: boolean }` matches v2 directly (`chain`, `format` optional, `publisher` removed from message). Read `notifications` array, ignore `_persist`.

**`StoredTopic` → `NotificationsTopic`** — direct copy of `id`, `name`, `publisher`, `isSubscribed`. `autoSubscribe` omitted (not in v1 data).

### Startup sequence

1. Module loads (always — no feature flag)
2. `init.ts` calls `isMigrationRequired()` — checks for `redux:persist:notificationsCenter` without `redux:persist:migrateV1Notifications`
3. If migration needed: reads v1 notifications + topics, deletes `redux:persist:notificationsCenter`, returns `preloadedState` with `notificationCenter: { notifications, topics }`
4. Redux store initializes with preloadedState + `migrateV1Notifications` reducer
5. Redux-persist persists `migrateV1Notifications` → next startup skips migration
6. Later: notification-center module loads → provider syncs topics → `syncTopicsFromProvider` preserves `isSubscribed`

### Package structure

```
v2/packages/module/migrate-v1-notifications/
├── src/
│   ├── index.ts                    # Module definition (no feature property)
│   ├── augmentations.ts            # State augmentation for migrateV1Notifications slice
│   └── store/
│       ├── index.ts                # Store context inference
│       ├── init.ts                 # Migration check + preloadedState
│       ├── slice.ts                # migrateV1Notifications marker slice
│       └── v1-data/
│           ├── index.ts            # Re-exports
│           ├── is-migration-required.ts
│           ├── extension-storage.ts    # Reads v1 keys + cleanup
│           └── prepare-preloaded-state.ts
├── test/
│   └── store/
│       └── migration.test.ts
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.eslint.json
├── tsconfig.test.json
├── vitest.config.js
└── eslint.config.mjs
```

### Steps

- [ ] Create package scaffold modeled after `@lace-module/migrate-v1-data`
- [ ] Implement `slice.ts` — marker slice `migrateV1Notifications` with `{ isMigrated: true }`
- [ ] Implement `is-migration-required.ts` — check `redux:persist:notificationsCenter` exists AND `redux:persist:migrateV1Notifications` doesn't
- [ ] Implement `extension-storage.ts` — read `redux:persist:notificationsCenter` and `notifications:topics`, plus cleanup function to delete `redux:persist:notificationsCenter`
- [ ] Implement `prepare-preloaded-state.ts` — map v1 data to `{ notificationCenter: { notifications, topics } }`
- [ ] Implement `init.ts` — migration check → preparePreloadedState → return `{ reducers, preloadedState }`
- [ ] Implement `index.ts` — module definition with no `feature` property (always loads), no `dependsOn`, no `implements`
- [ ] Implement `augmentations.ts` — extend `State` with `migrateV1Notifications` slice
- [ ] Add to extension and mobile app module lists
- [ ] Add tests: v1 data present → notifications + topics migrated correctly
- [ ] Add tests: v1 data absent → no `notificationCenter` in preloadedState
- [ ] Add tests: v1 data with missing optional fields (`chain`, `format` absent on messages)
- [ ] Add tests: already migrated (`redux:persist:migrateV1Notifications` exists) → skip
- [ ] Verify: `npx nx test @lace-module/migrate-v1-notifications` passes
- [ ] Verify: `npx nx run @lace-module/migrate-v1-notifications:type-check-src` passes
- [ ] Verify: `npx nx run @lace-module/migrate-v1-notifications:type-check-test` passes

---

## Phase 4: Production module — dependencies, side effects, and tests

**Goal**: Wire the `notifications2` library into the production `@lace-module/notification-center` module with reactive side effects bridging the provider to Redux. Rewrite the existing `side-effects.ts` to work with the provider-based architecture while preserving the API shape the UI consumes.

### Why this is a single phase

v2's `ModuleInitDependencies` only provides `{ logger }`. Contract dependencies like `createKeyValueStorage` (from `storageDependencyContract`) are only available in side effects via the merged `SideEffectDependencies`. The provider requires storage (for the `StorageAdapter` bridge and userId retrieval), so it must be created in a bootstrap side effect — not in `dependencies.ts`. This makes the "plumbing" and "side effects" boundary artificial.

### Architecture

#### Module dependencies (`dependsOn`)

Add `storageDependencyContract` to the module's `dependsOn` (alongside existing `featureStoreContract`, `viewsStoreContract`).

#### Webpack: PubNub service worker alias ✅ COMPLETE

PubNub's `package.json` declares `"browser": "./dist/web/pubnub.min.js"` and `"main": "./lib/node/index.js"`. The v2 common webpack config (`webpack/base/common.webpack.config.js`) sets `conditionNames: ['edge', 'browser', ...]`, so webpack resolves PubNub to the browser bundle — which requires `window`, unavailable in service workers.

**Fix:** Add a `resolve.alias` in `apps/lace-extension/webpack/base/serviceworker.webpack.config.js` to force the Node.js entry point (same pattern as v1's `webpack.common.sw.js`):

```javascript
resolve: {
  alias: {
    pubnub: path.resolve(
      __dirname, '..', '..', '..', '..', 'node_modules', 'pubnub', 'lib', 'node', 'index.js',
    ),
  },
},
```

**Why only the service worker config?** The app/tab bundles run in a DOM context where the browser version works fine. Only the service worker lacks `window`. The common config must NOT be changed — it serves both targets.

**Path rationale:** `__dirname` is `webpack/base/`, so `../../../..` reaches the v2 monorepo root where `node_modules/pubnub` lives.

#### Manifest CSP: PubNub connect-src ✅ COMPLETE

The extension service worker makes outbound requests to PubNub services. Manifest V3 requires these hosts in the `connect-src` Content Security Policy. Add to `apps/lace-extension/assets/manifest.json` in the `connect-src` directive:

- `https://*.pndsn.com/` — PubNub's CDN for API and subscribe requests (covers `ps.pndsn.com` used in dev `.env`)
- `https://live-pubnub.lw.iog.io` — IOG's PubNub token endpoint (production, matching v1 manifest)

These are hardcoded hosts (not `$PLACEHOLDER` env vars) because they are fixed infrastructure URLs, not per-deployment variables. No corresponding `webpack-utils.js` `.replace()` needed.

**Reference:** v1 manifest has the same entries in its `connect-src`.

#### AppConfig augmentation

Add PubNub config to the notification-center contract (not a separate package — PubNub is an implementation detail of this module, unlike PostHog which is shared):

```typescript
// In @lace-contract/notification-center/src/types.ts
export interface NotificationCenterAppConfig {
  pubnubSubscribeKey: string;
  pubnubTokenEndpoint: string;
}

// In @lace-contract/notification-center/src/augmentations.ts
declare module '@lace-contract/module' {
  interface AppConfig extends NotificationCenterAppConfig {}
}
```

Environment variables per platform:
- Extension: `PUBNUB_SUBSCRIBE_KEY`, `PUBNUB_TOKEN_ENDPOINT`
- Mobile: `EXPO_PUBLIC_PUBNUB_SUBSCRIBE_KEY`, `EXPO_PUBLIC_PUBNUB_TOKEN_ENDPOINT`

Add validation in both app config files (extension + mobile) via `envalid`.

#### SideEffectDependencies type

Augment the global `SideEffectDependencies` in `@lace-contract/notification-center/src/augmentations.ts` (same pattern as `@lace-contract/posthog`):

```typescript
import type { NotificationProvider } from '@lace-lib/notifications2';
import type { BehaviorSubject, Subject } from 'rxjs';

export interface NotificationCenterDependencies {
  pubnubSubscribeKey: string;
  pubnubTokenEndpoint: string;
  notificationSync$: Subject<string>;
  topicSync$: Subject<void>;
  notificationProvider$: BehaviorSubject<NotificationProvider | null>;
}

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends NotificationCenterDependencies {}
}
```

#### What `dependencies.ts` creates (available during init — config + pure constructions only)

```typescript
// Only needs runtime.config (available in init) and pure Subject construction
const notificationSync$ = new Subject<string>();
const topicSync$ = new Subject<void>();
const notificationProvider$ = new BehaviorSubject<NotificationProvider | null>(null);

return {
  pubnubSubscribeKey: config.pubnubSubscribeKey,
  pubnubTokenEndpoint: config.pubnubTokenEndpoint,
  notificationSync$,
  topicSync$,
  notificationProvider$,
};
```

#### StorageAdapter bridge

The library's `StorageAdapter` (Observable-based `getItem/setItem/removeItem`) is bridged to v2's `KeyValueStorage` (from `createKeyValueStorage`):

```typescript
// Created in the bootstrap side effect (has access to createKeyValueStorage)
const kvStorage = createKeyValueStorage<string, unknown>({ collectionId: 'notifications' });

const storageAdapter: StorageAdapter = {
  getItem: <T>(key: string) =>
    kvStorage.getValues([key]).pipe(
      map(([v]) => v as T | undefined),
      defaultIfEmpty(undefined),
    ),
  setItem: <T>(key: string, value: T) => kvStorage.setValue(key, value),
  removeItem: (key: string) => kvStorage.setValue(key, undefined),
};
```

`KeyValueStorage` namespaces keys as `${collectionId}:${key}`. To avoid double-prefixing (library's `StorageKeys` also prepends `notifications:`), configure `StorageKeys` with no prefix:

```typescript
const storageKeys = new StorageKeys(); // no prefix — keys are 'topics', 'token', 'userId', etc.
// KeyValueStorage adds 'notifications:' → actual storage key is 'notifications:topics'
```

This requires updating `StorageKeys` in `@lace-lib/notifications2` to support an optional prefix:

```typescript
// Before: constructor(prefix: string) → this.topics = `${prefix}:topics`
// After:
constructor(prefix?: string) {
  const p = prefix ? `${prefix}:` : '';
  this.topics = `${p}topics`;
  // ... same for all other keys
}
```

Backward compatible — v1 callers still pass `'notifications'`.

#### Provider construction chain (in bootstrap side effect)

The bootstrap side effect has access to the full `SideEffectDependencies` and creates the provider:

```
1. kvStorage = createKeyValueStorage({ collectionId: 'notifications' })
2. storageAdapter = bridge wrapping kvStorage (see above)
3. storageKeys = new StorageKeys()  // no prefix
4. userId = read from storageAdapter via storageKeys.getUserId()
           → if absent, generate UUID, persist, return
5. wrapper = createPubNubWrapper({ subscribeKey, userId, logger })
6. authProvider = new PubNubAuthProvider({ userId, tokenEndpoint, storage: storageAdapter, storageKeys })
7. provider = new PubNubPollingProvider({
     authProvider, wrapper, storage: storageAdapter, storageKeys, logger,
     notificationSync$,  // Subject from dependencies.ts
     topicSync$,         // Subject from dependencies.ts
   })
8. notificationProvider$.next(provider)  // publish to BehaviorSubject
```

**The provider is fully lazy** — the constructor starts no network calls, no auth, no timers. Work only begins when `notificationSync$` or `topicSync$` emit. Auth happens lazily on first notification sync with internal retry/backoff. No error handling needed at bootstrap.

**No teardown needed** — v2 has no module unload lifecycle. PostHog client runs indefinitely without `shutdown()`. Same applies here.

#### userId handling

Independent UUID per device (same as v1). Read from storage key `userId` (namespaced to `notifications:userId`). If absent, generate `crypto.randomUUID()`, persist, and use. Decoupled from analytics `distinctId` — migrated v1 data already has a `notifications:userId` that the library will read via the same storage key.

### File Organization

- `src/store/storage-adapter.ts` — `StorageAdapter` bridge (wraps `KeyValueStorage`, reused by bootstrap and tests)
- `src/store/notification-mapper.ts` — `Notification` → `LaceNotification` and `StoredTopic[]` → `NotificationsTopic[]` mappers
- `src/store/side-effects/bootstrap-provider.ts`
- `src/store/side-effects/notification-sync-trigger.ts`
- `src/store/side-effects/topic-sync-trigger.ts`
- `src/store/side-effects/notifications-to-redux.ts`
- `src/store/side-effects/topics-to-redux.ts`
- `src/store/side-effects/subscribe-unsubscribe.ts`
- `src/store/side-effects/expose-api.ts` (rewrite of existing `side-effects.ts`)
- `src/store/side-effects/index.ts` — re-exports `initializeSideEffects`

### Side Effects

All side effects run on **both extension and mobile**. Only the extension messaging API is platform-gated (check `runtime.app !== 'lace-mobile'` inside the side effect, not in `init.ts`). Remove the current blanket `app !== 'lace-mobile'` exclusion in `init.ts`.

#### 1. Bootstrap provider
- **Single branching point for dev mode**: reads `selectLoadedFeatures$` (`take(1)`). If `NOTIFICATION_CENTER_DEV` flag is present, returns `EMPTY` — PubNub is never initialized. All other side effects remain registered: `filter(Boolean)` ones idle (provider stays null), sync triggers fire harmlessly into unlistened subjects.
- In production mode (`NOTIFICATION_CENTER`): access `createKeyValueStorage` from `SideEffectDependencies`, execute the construction chain above, push provider into `notificationProvider$` BehaviorSubject
- Returns `EMPTY` (one-time setup, no actions dispatched)

#### 2. Notification sync trigger
- Watches `selectLoadedFeatures$` from `featureStoreContract` (note: NOT a `selectFeatureFlagPayload$` — this selector doesn't exist)
- Extracts the `NOTIFICATION_CENTER` flag by key, reads `payload.latestMessageTimestamp` (ISO 8601 string)
- `distinctUntilChanged` on the timestamp string, `filter(Boolean)` to ignore absent/null
- Parses ISO to milliseconds: `new Date(isoString).getTime()`
- Converts to PubNub timetoken: `toPubNubTimetoken(ms)` (library export, takes **milliseconds** → returns 17-digit string)
- Pushes timetoken string into `notificationSync$` subject

```typescript
// Conversion chain: ISO string → ms → PubNub timetoken
const ms = new Date(latestMessageTimestamp).getTime();
const timetoken = toPubNubTimetoken(ms);
notificationSync$.next(timetoken);
```

#### 3. Topic sync trigger
- Uses `timer(0, 3_600_000)` (fire immediately, then every hour) piped through `switchMap`
- Each tick: read `storageKeys.lastTopicSync` from storage adapter → if absent or >24h ago, push into `topicSync$` subject and write current timestamp back to storage
- Use `flush()` + programmatic assertions in marble tests (complex timer logic)

```typescript
// Observable pattern:
timer(0, 3_600_000).pipe(
  switchMap(() => storageAdapter.getItem<number>(storageKeys.lastTopicSync)),
  filter(lastSync => !lastSync || Date.now() - lastSync > 86_400_000),
  tap(() => {
    topicSync$.next();
    storageAdapter.setItem(storageKeys.lastTopicSync, Date.now()).subscribe();
  }),
  mapTo(EMPTY),
  mergeAll(),
)
```

#### 4. Notifications → Redux
- `switchMap` on `notificationProvider$` (waits for non-null, i.e. bootstrap to complete)
- Subscribes to `provider.notifications$` (emits individual `Notification` objects)
- **Structural mapping** — library `Notification` is flat (`{id, body, timestamp, title, topicId, ...extras}`), contract `LaceNotification` wraps fields in `message`:

```typescript
// Notification → LaceNotification mapping
const toLaceNotification = (n: Notification): LaceNotification => ({
  message: {
    id: n.id,
    body: n.body,
    title: n.title,
    topicId: n.topicId,
    chain: typeof n['chain'] === 'string' ? n['chain'] : undefined,
    format: typeof n['format'] === 'string' ? n['format'] : undefined,
  },
});
```

- Dispatches `actions.notificationCenter.addNotification(laceNotification)` for each

#### 5. Topics → Redux
- `switchMap` on `notificationProvider$`
- Subscribes to `provider.topics$` (emits `StoredTopic[]`)
- **Mapping** — `StoredTopic` has `chain` field that `NotificationsTopic` does NOT. Drop `chain` during mapping:

```typescript
// StoredTopic → NotificationsTopic mapping
const toNotificationsTopic = (t: StoredTopic): NotificationsTopic => ({
  id: t.id,
  name: t.name,
  publisher: t.publisher,
  autoSubscribe: t.autoSubscribe,
  isSubscribed: t.isSubscribed,
  // t.chain deliberately dropped — not in contract type
});
```

- Dispatches `actions.notificationCenter.syncTopicsFromProvider({ topics })` with `distinctUntilChanged(isEqual)`

#### 6. Subscribe/unsubscribe → provider
- `switchMap` on `notificationProvider$`
- Listens for `subscribeToTopic` / `unsubscribeFromTopic` actions
- Calls `provider.subscribe(topicId)` / `provider.unsubscribe(topicId)`
- These are already Observable-returning in the library

#### 7. Extension messaging API (extension only)
- **Adapt existing `side-effects.ts`** — the current file has a fully implemented `exposeNotificationsCenterApi` that already correctly references contract selectors and actions (`selectAllNotifications$`, `selectAllTopics$`, `actions.notificationCenter.*`) — these all exist in the contract slice. The API shape (`NotificationsCenterProperties`) is defined in `src/types.ts` and includes `notifications.{markAsRead, notifications$, remove}`, `topics.{subscribe, topics$, unsubscribe}`, `test.{add, init}`.
- **What to change**: The existing implementation is mostly usable. Ensure it works end-to-end with the provider-based architecture (selectors feed from Redux state populated by side effects 4 and 5). Subscribe/unsubscribe calls in the API should dispatch Redux actions (which side effect 6 bridges to the provider). No direct provider access needed in this side effect.
- Exposes API via `@lace-sdk/extension-messaging` on the `notification-center` channel
- Gated: `if (runtime.app === 'lace-mobile') return EMPTY`
- **Dev/QA injection**: The `test.add`/`test.init` methods in this API serve as the dev/QA notification injection mechanism (replacing v1's `NOTIFICATION_CENTER_MODE=test`). They are gated by the `NOTIFICATION_CENTER_DEV` feature flag. No separate `notification-center-dev` module is needed. Developers enable `NOTIFICATION_CENTER_DEV` (instead of `NOTIFICATION_CENTER`) to inject notifications via the extension messaging channel without loading PubNub.

### Tests

Marble tests for each side effect, following v2 testing strategy (100% coverage for side effects).

#### Testing approach

- Use `testSideEffect` helper with marble syntax
- Mock the provider (from dependencies) — cold/hot observables for `notifications$`, `topics$`
- Mock feature store selectors — hot observable for `selectLoadedFeatures$` (returns `{ featureFlags: [...], modules: [...] }`)
- Mock `createKeyValueStorage` — return a mock `KeyValueStorage` for bootstrap test
- Use `flush()` + programmatic assertions for complex timing (topic sync interval)

#### Test cases

- [ ] Bootstrap provider — verify construction chain, verify `notificationProvider$` emits provider
- [ ] Bootstrap provider — verify userId generation when absent, reuse when present
- [ ] Notification sync trigger — verify `distinctUntilChanged` (no duplicate syncs), verify `filter` (null timestamps ignored), verify ISO→ms→timetoken conversion chain
- [ ] Topic sync trigger — verify interval logic, verify 24h elapsed check (use `flush()` + programmatic assertions)
- [ ] Notifications → Redux — verify structural mapping (`Notification.body/title/id/topicId` → `LaceNotification.message.*`, `chain`/`format` from extras), verify `addNotification` dispatched
- [ ] Topics → Redux — verify mapping drops `chain` field, preserves `id/name/publisher/autoSubscribe/isSubscribed`, verify `syncTopicsFromProvider` dispatched, verify `distinctUntilChanged`
- [ ] Subscribe/unsubscribe — verify provider method called, verify error handling (provider failure doesn't crash stream)
- [ ] Extension messaging API — verify API shape matches `NotificationsCenterProperties` (defined in `src/types.ts`)
- [ ] StorageAdapter bridge — verify `getItem`/`setItem`/`removeItem` correctly delegate to `KeyValueStorage`
- [ ] Notification mapper — unit tests for `toLaceNotification` (with/without `chain`/`format` extras)
- [ ] Topic mapper — unit tests for `toNotificationsTopic` (verify `chain` dropped)

### Steps

- [ ] Update `@lace-lib/notifications2`: make `StorageKeys` prefix optional (empty prefix support)
- [ ] Update `@lace-lib/notifications2` tests for optional prefix
- [ ] Add `NotificationCenterAppConfig` type to `@lace-contract/notification-center/src/types.ts`
- [ ] Add `NotificationCenterDependencies` type and augment `AppConfig` + `SideEffectDependencies` in `@lace-contract/notification-center/src/augmentations.ts`
- [x] Add PubNub Node.js alias to v2 service worker webpack config (`serviceworker.webpack.config.js`) — browser version requires `window`, unavailable in service workers
- [x] Add PubNub CSP entries to v2 manifest (`assets/manifest.json`) — `https://*.pndsn.com/` and `https://live-pubnub.lw.iog.io` in `connect-src`
- [ ] Add env var validation in extension and mobile app config files
- [ ] Update `willLoad` in `src/index.ts` to accept both `NOTIFICATION_CENTER` and `NOTIFICATION_CENTER_DEV`
- [ ] Add `NOTIFICATION_CENTER_DEV` guard in `bootstrapProvider` — check `selectLoadedFeatures$` (`take(1)`), return `EMPTY` if flag is present
- [ ] Update `expose-api.ts` — gate `test.*` methods on `NOTIFICATION_CENTER_DEV` instead of `TEST_API`
- [ ] Update `apps/lace-extension/src/useHomeProps.tsx` — accept both flags for `isNotificationCenterEnabled`
- [ ] Update `apps/lace-mobile/src/app/useHomeProps.tsx` — same
- [ ] Update `apps/lace-extension/src/feature-flags.ts` — swap `NOTIFICATION_CENTER` → `NOTIFICATION_CENTER_DEV` for local dev
- [ ] Add `storageDependencyContract` to module's `dependsOn` in `src/index.ts`
- [ ] Create `src/store/storage-adapter.ts` — `StorageAdapter` bridge (wraps `KeyValueStorage` for the library)
- [ ] Create `src/store/notification-mapper.ts` — `toLaceNotification` and `toNotificationsTopic` mapper functions
- [ ] Update `dependencies.ts` — return config values, Subjects, `BehaviorSubject<NotificationProvider | null>`
- [ ] Remove blanket mobile side-effect exclusion in `init.ts`, load all side effects on both platforms
- [ ] Implement bootstrap provider side effect (`src/store/side-effects/bootstrap-provider.ts`)
- [ ] Implement notification sync trigger side effect (`src/store/side-effects/notification-sync-trigger.ts`)
- [ ] Implement topic sync trigger side effect (`src/store/side-effects/topic-sync-trigger.ts`)
- [ ] Implement notifications → Redux side effect (`src/store/side-effects/notifications-to-redux.ts`)
- [ ] Implement topics → Redux side effect (`src/store/side-effects/topics-to-redux.ts`)
- [ ] Implement subscribe/unsubscribe → provider side effect (`src/store/side-effects/subscribe-unsubscribe.ts`)
- [ ] Adapt extension messaging API side effect (`src/store/side-effects/expose-api.ts` — existing code is mostly usable, ensure it works with provider-populated Redux state)
- [ ] Create `src/store/side-effects/index.ts` — export `initializeSideEffects` returning all 7 side effects
- [ ] Register side effects in module's `init.ts`
- [ ] Add marble tests for all side effects per test cases above
- [ ] Add unit tests for StorageAdapter bridge
- [ ] Add unit tests for notification/topic mappers
- [ ] Verify: `npx nx test @lace-module/notification-center` passes
- [ ] Verify: `npx nx run @lace-module/notification-center:type-check-src` passes
- [ ] Verify: `npx nx run @lace-module/notification-center:type-check-test` passes
- [ ] Verify: `npm run check` passes (full workspace)

---

## Phase 5: v1 integration

**Goal**: Remove v1's notification center from the service worker and update v1 UI to consume v2's notification center API via the extension messaging channel.

### API shape difference between v1 and v2

v1's `NotificationsCenterProperties` includes `notifications.triggerNotificationSync(timestamp)` — used by `onStorageChange.ts` to push PostHog timestamps into the provider. v2 does **not** expose this method — the notification-sync-trigger side effect reads PostHog timestamps internally from the feature store selector. The v1 listener is therefore redundant and must be removed.

v1 also uses `@cardano-sdk/web-extension` for `consumeRemoteApi`/`exposeApi`, while v2 uses `@lace-sdk/extension-messaging`. Both are wire-compatible (same Chrome runtime messaging protocol), but the v1 consumer must use v2's channel name (`notification-center`, not `notifications-center`).

### v1 Service Worker Cleanup

- [ ] Remove `./notifications-center` import from `v1/apps/browser-extension-wallet/src/lib/scripts/background/index.ts`
- [ ] Remove the entire `notifications-center.ts` file (`v1/apps/browser-extension-wallet/src/lib/scripts/background/notifications-center.ts`) — all three modes (production, test, noop) are replaced by v2's module
- [ ] Remove the `notificationsCenterApi` promise export and its resolver — no longer consumed by any v1 code once `onStorageChange.ts` is cleaned up
- [ ] Remove the `latestMessageTimestamp` handler from `v1/apps/browser-extension-wallet/src/lib/scripts/background/onStorageChange.ts` — v2's notification-sync-trigger side effect reads PostHog timestamps internally via the feature store selector

### v1 Type Alignment

- [ ] Update `v1/apps/browser-extension-wallet/src/types/notifications-center.ts`:
  - Remove `triggerNotificationSync` from `NotificationsCenterProperties.notifications`
  - Remove `triggerNotificationSync` from `notificationsCenterProperties` descriptor
  - Verify remaining shape matches v2's: `notifications.{markAsRead, notifications$, remove}`, `test.{add, init}`, `topics.{subscribe, topics$, unsubscribe}`

### v1 UI Bridge

- [ ] Update `v1/apps/browser-extension-wallet/src/hooks/useNotificationsCenter.ts`:
  - Change `consumeRemoteApi` channel from `'notifications-center'` to `'notification-center'` (matching v2's `ChannelName('notification-center')`)
  - Import types from the updated v1 types file (no structural change needed — hook doesn't use `triggerNotificationSync`)
- [ ] Verify v1 UI displays notifications from v2's Redux store (populated by provider side effects)
- [ ] Verify v1 UI actions (markAsRead, remove, subscribe, unsubscribe) dispatch through v2's expose-api and bridge to the provider via side effect 6

### Verification

- [ ] E2E: fresh install — v2 notification center works, v1 UI shows empty state
- [ ] E2E: upgrade from v1 — v1 data migrated (Phase 3), v1 UI shows existing notifications from v2
- [ ] E2E: both UIs — notification read in v1 UI reflects in v2 UI and vice versa
- [ ] E2E: test mode — enable `NOTIFICATION_CENTER_DEV` flag (instead of `NOTIFICATION_CENTER`), verify `test.init`/`test.add` work from v1 UI consumer without PubNub initializing
- [ ] Verify: `npm run check` passes (full workspace including v1)

---

## References

- **v1 library**: `v1/packages/notifications2/`
- **v1 integration**: `v1/apps/browser-extension-wallet/src/lib/scripts/background/notifications-center.ts`
- **v1 UI hook**: `v1/apps/browser-extension-wallet/src/hooks/useNotificationsCenter.ts`
- **v1 PostHog listener**: `v1/apps/browser-extension-wallet/src/lib/scripts/background/onStorageChange.ts`
- **v1 SW entry**: `v1/apps/browser-extension-wallet/src/lib/scripts/background/index.ts`
- **v2 contract**: `v2/packages/contract/notification-center/`
- **v2 production module**: `v2/packages/module/notification-center/`
- **v2 notification migration module** (new): `v2/packages/module/migrate-v1-notifications/`
- **v2 migration pattern reference**: `v2/packages/module/migrate-v1-data/` (same preloadedState + marker slice pattern)
- **v2 storage contract**: `v2/packages/contract/storage/` (StorageDependencies, KeyValueStorage, StorageAdapter)
- **v2 posthog contract pattern**: `v2/packages/contract/posthog/` (AppConfig + SideEffectDependencies augmentation pattern)
- **v2 posthog dependency init pattern**: `v2/packages/module/posthog-client-extension/src/store/dependencies.ts`
- **v2 feature-posthog BehaviorSubject pattern**: `v2/packages/module/feature-posthog/src/store/dependencies.ts`
- **v1↔v2 bridge reference**: `v2/packages/module/v2-bundle/src/store/dependencies.ts` (existing bridge pattern)
- **Migration spec**: `engineering-support/notifications-migration-spec.md`
- **Reactive refactor spec**: `engineering-support/notifications2-reactive-refactor.md`
- **Simplification spec**: `engineering-support/notifications2-simplification-spec.md`
