# Migration Specification: @lace/notifications → @lace/notifications2

**Date:** 2026-02-02
**Status:** Approved
**Author:** System Design

---

## Purpose

Replace `@lace/notifications` with `@lace/notifications2` in the browser extension background script while maintaining existing storage compatibility and API surface exposed to the extension UI.

---

## Key Constraints

- Must migrate existing stored data (notifications + topics) on first load
- Maintain the same `NotificationsCenterProperties` API exposed via `exposeApi()`
- Keep hybrid storage: persist notifications across restarts + expose live streams
- Only trigger syncs when PostHog feature flag `latestMessageTimestamp` changes
- Sync topics once per 24 hours based on storage timestamp
- Minimal refactoring to [notifications-center.ts](../v1/apps/browser-extension-wallet/src/lib/scripts/background/notifications-center.ts) structure

---

## Architecture Overview

### Old Pattern (notifications v1)
```typescript
NotificationsClient (callback-based)
  ├─ onNotification: (message) => { ... }
  └─ onTopics: (topics) => { ... }
  └─ updateLatestMessageTimestamp(timestamp) → triggers fetch
```

### New Pattern (notifications2)
```typescript
PubNubPollingProvider (observable-based)
  ├─ notifications$: Observable<Notification>
  ├─ topics$: Observable<StoredTopic[]>
  └─ Sync triggers (external):
      ├─ notificationSync$: Subject<string>  // PostHog timestamp
      └─ topicSync$: Subject<void>           // Daily topic refresh
```

### Key Differences

| Aspect | Old Package | New Package |
|--------|-------------|-------------|
| **Main Class** | `NotificationsClient` | Provider pattern (`PubNubPollingProvider`) |
| **API Style** | Callback-based | Observable-based (RxJS) |
| **Storage Interface** | Promise-based | Observable-based |
| **Topic Format** | `{ id, name, description, isSubscribed? }` | `{ id, name, description, isSubscribed, lastSync? }` |
| **Sync Mechanism** | Implicit (method call) | Explicit (observable triggers) |
| **Error Handling** | Generic | Typed errors (AuthError, NetworkError, UnknownError) |

---

## Storage Migration Strategy

### One-Time Migration on First Load

**Location:** Inside `exposeProductionNotificationsCenterAPI()` around line 131-139

**Old Format:**
```typescript
{
  notifications: LaceNotification[],
  topics: NotificationsTopic[]  // isSubscribed?: boolean
}
```

**New Format:**
```typescript
{
  notifications: LaceNotification[],  // Compatible, no changes
  topics: StoredTopic[]  // isSubscribed: boolean, lastSync?: string
}
```

**Migration Logic:**
```typescript
// 1. Load existing data
let { notifications, topics } = {
  notifications: [],
  topics: [],
  ...(await localStorage.get(STORAGE_KEY))[STORAGE_KEY]
};

// 2. Detect old format (missing isSubscribed as required boolean)
const needsMigration = topics.length > 0 && !('isSubscribed' in topics[0]);

if (needsMigration) {
  logger.info('Migrating topics from old format to new format');

  // 3. Transform topics
  topics = topics.map((topic) => ({
    ...topic,
    isSubscribed: topic.isSubscribed ?? false,  // Convert undefined → false
    lastSync: undefined  // Will sync full history on first subscribe
  }));

  // 4. Save migrated format
  await localStorage.set({
    [STORAGE_KEY]: {
      notifications,
      topics,
      _persist: '{"version":1,"rehydrated":true}'
    }
  });

  logger.info(`Migrated ${topics.length} topics to new format`);
}
```

**No backwards compatibility needed** - this is a one-time upgrade.

---

## Storage Adapter Implementation

### WebExtensionStorageAdapter

**Purpose:** Convert `storage.local` Promise-based API to Observable-based API required by `notifications2`.

**Location:** Define inline in `notifications-center.ts` before `exposeProductionNotificationsCenterAPI` (~line 126)

**Implementation:**
```typescript
import { from, map, Observable } from 'rxjs';
import type { StorageAdapter } from '@lace/notifications2';

class WebExtensionStorageAdapter implements StorageAdapter {
  constructor(private storage: typeof storage.local) {}

  get<T>(key: string): Observable<T | null> {
    return from(this.storage.get(key)).pipe(
      map(result => result[key] ?? null)
    );
  }

  set<T>(key: string, value: T): Observable<void> {
    return from(this.storage.set({ [key]: value })).pipe(
      map(() => undefined)
    );
  }

  remove(key: string): Observable<void> {
    return from(this.storage.remove(key)).pipe(
      map(() => undefined)
    );
  }
}
```

**Usage:**
- **App-level storage** (notifications/topics array): Use existing `storage.local` promise-based API
- **Provider-level storage** (tokens, sync state, cachedTopics): Use `WebExtensionStorageAdapter` wrapper

---

## User ID Management

### Storage Location

**Storage Key:** `notifications:userId` (managed by `StorageKeys.getUserId()`)

**Reuses existing location** from old package - same key, same logic.

### Implementation

```typescript
import { v4, validate } from 'uuid';

// Get or create userId
const userIdKey = 'notifications:userId';
let userId = (await localStorage.get(userIdKey))[userIdKey];

if (!userId) {
  // Generate new UUID v4
  userId = v4();
  await localStorage.set({ [userIdKey]: userId });
  logger.info('Generated new userId for notifications');
} else if (!validate(userId)) {
  // Validate stored UUID
  throw new Error(`Stored userId is not a valid UUID: ${userId}`);
}

logger.debug(`Using userId for notifications: ${userId}`);
```

**This ensures continuity** - existing users keep their userId, new users get a fresh one.

---

## Provider Initialization

### Dependencies Setup

```typescript
import {
  createPubNubWrapper,
  PubNubAuthProvider,
  PubNubPollingProvider,
  StorageKeys
} from '@lace/notifications2';
import { Subject } from 'rxjs';

// 1. Create sync trigger subjects (BEFORE provider init)
const notificationSync$ = new Subject<string>();
const topicSync$ = new Subject<void>();

// 2. Get userId (see previous section)
const userId = await getUserIdFromStorage();

// 3. Create storage adapter
const storageAdapter = new WebExtensionStorageAdapter(localStorage);

// 4. Create storage keys manager
const storageKeys = new StorageKeys('lace-notifications');

// 5. Create PubNub wrapper
const pubNubWrapper = createPubNubWrapper({
  subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY,
  userId,
  logger
});

// 6. Create auth provider (if authentication enabled)
let authProvider;
if (process.env.PUBNUB_SKIP_AUTHENTICATION !== 'true') {
  authProvider = new PubNubAuthProvider({
    userId,
    tokenEndpoint: process.env.PUBNUB_TOKEN_ENDPOINT,
    storage: storageAdapter,
    storageKeys
  });
}

// 7. Create provider
const provider = new PubNubPollingProvider({
  authProvider,
  notificationSync$,
  topicSync$,
  storage: storageAdapter,
  storageKeys,
  logger,
  wrapper: pubNubWrapper
});

// Store reference for cleanup
let providerInstance = provider;
```

---

## Observable Subscriptions

### Subscribe to Provider Streams

**Location:** After provider initialization in `exposeProductionNotificationsCenterAPI()`

```typescript
// 1. Subscribe to notifications stream
provider.notifications$.subscribe({
  next: (notification) => {
    // Deduplicate (same logic as line 164)
    if (notifications.some((n) => n.message.id === notification.id)) return;

    // Store notification
    notifications.unshift({ message: notification });
    notifications$.next(notifications);

    // Persist to storage
    save().catch((error) => logger.error('Failed to save notifications', error));
  },
  error: (error) => {
    logger.error('Notifications stream error', error);
  }
});

// 2. Subscribe to topics stream
provider.topics$.subscribe({
  next: (storedTopics) => {
    // Update local topics array
    topics = storedTopics;
    topics$.next(topics);

    // Persist to storage
    save().catch((error) => logger.error('Failed to save topics', error));
  },
  error: (error) => {
    logger.error('Topics stream error', error);
  }
});
```

**Key Points:**
- Notification format is compatible: `{ message: Notification }` = `LaceNotification`
- Topics now have `isSubscribed: boolean` + `lastSync?: string` fields
- Same deduplication logic as before
- Same persistence strategy as before

---

## Exposed API Methods

### Update subscribe/unsubscribe

**Old API:** Returns `Promise<void>`
**New Provider API:** Returns `Observable<void>`
**Solution:** Convert Observable to Promise

```typescript
const subscribe = (topicId: NotificationsTopic['id']): Promise<void> => {
  return new Promise((resolve, reject) => {
    provider.subscribe(topicId).subscribe({
      next: () => resolve(),
      error: (error) => reject(error)
    });
  });
};

const unsubscribe = (topicId: NotificationsTopic['id']): Promise<void> => {
  return new Promise((resolve, reject) => {
    provider.unsubscribe(topicId).subscribe({
      next: () => resolve(),
      error: (error) => reject(error)
    });
  });
};
```

### Keep existing methods unchanged

```typescript
// markAsRead - no changes (lines 200-205)
const markAsRead = (id?: LaceNotification['message']['id']) => {
  for (const notification of notifications)
    if (notification.message.id === id || !id)
      notification.read = true;

  notifications$.next(notifications);
  return save();
};

// remove - no changes (lines 207-212)
const remove = (id: LaceNotification['message']['id']) => {
  notifications = notifications.filter(
    (notification) => notification.message.id !== id
  );

  notifications$.next(notifications);
  return save();
};
```

---

## Sync Trigger Strategy

### Notification Sync: PostHog-Driven

**Trigger:** When PostHog feature flag `latestMessageTimestamp` changes

```typescript
// Helper to extract timestamp from PostHog
const getLatestMessageTimestamp = (backgroundStorage: any) => {
  const featureFlagPayload =
    backgroundStorage?.featureFlagPayloads?.[ExperimentName.NOTIFICATIONS_CENTER];

  if (
    featureFlagPayload &&
    typeof featureFlagPayload === 'object' &&
    'latestMessageTimestamp' in featureFlagPayload &&
    typeof featureFlagPayload.latestMessageTimestamp === 'string'
  ) {
    return featureFlagPayload.latestMessageTimestamp;
  }
  return undefined;
};

// Initial sync on startup
const backgroundStorage = await getBackgroundStorage();
const initialTimestamp = getLatestMessageTimestamp(backgroundStorage);

if (initialTimestamp) {
  notificationSync$.next(initialTimestamp);
  logger.debug(`Triggered initial notification sync: ${initialTimestamp}`);
}

// Monitor for PostHog feature flag changes
storage.onChanged?.addListener((changes, areaName) => {
  if (areaName === 'local' && changes['redux:persist:background']) {
    const newBackgroundStorage = changes['redux:persist:background'].newValue;
    const newTimestamp = getLatestMessageTimestamp(newBackgroundStorage);

    if (newTimestamp && newTimestamp !== initialTimestamp) {
      notificationSync$.next(newTimestamp);
      logger.debug(`Triggered sync from PostHog update: ${newTimestamp}`);
    }
  }
});
```

### Topic Sync: Once Per Day

**Trigger:** Based on storage timestamp, checked on init

```typescript
const TOPIC_SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const TOPIC_SYNC_TIMESTAMP_KEY = 'notifications:lastTopicSync';

const shouldSyncTopics = async (): Promise<boolean> => {
  const result = await localStorage.get(TOPIC_SYNC_TIMESTAMP_KEY);
  const lastSync = result[TOPIC_SYNC_TIMESTAMP_KEY];

  if (!lastSync) return true;

  const elapsed = Date.now() - lastSync;
  return elapsed >= TOPIC_SYNC_INTERVAL;
};

const updateTopicSyncTimestamp = async () => {
  await localStorage.set({ [TOPIC_SYNC_TIMESTAMP_KEY]: Date.now() });
};

// Check and trigger topic sync if needed (on init only)
if (await shouldSyncTopics()) {
  topicSync$.next();
  await updateTopicSyncTimestamp();
  logger.debug('Triggered daily topic sync');
}
```

**Why not sync on every init?**
Inits might happen frequently (browser restart, extension reload, etc.). We want to avoid unnecessary PubNub API calls and only refresh topic metadata once per day.

---

## Cleanup & Error Handling

### Provider Cleanup

```typescript
// Store provider reference globally for cleanup
let providerInstance: PubNubPollingProvider | undefined;

// ... after initialization ...
providerInstance = provider;

// Cleanup function (can be called on extension unload/disable)
const cleanup = () => {
  if (providerInstance) {
    providerInstance.close();
    providerInstance = undefined;
  }
};
```

### Error Handling

The new package provides typed errors:
- `AuthError` - 401/403 responses → token refresh needed
- `NetworkError` - Network failures → retryable
- `UnknownError` - 5xx/unexpected → propagate immediately

Provider handles errors internally with retry logic. Observable subscriptions should log errors but not crash:

```typescript
provider.notifications$.subscribe({
  next: (notification) => { /* handle */ },
  error: (error) => {
    logger.error('Notifications stream error', error);
    // Don't re-throw - let provider handle reconnection
  }
});
```

---

## Implementation Checklist

### Dependencies
- [ ] Add `@lace/notifications2` to package.json
- [ ] Add `rxjs` if not already present (for `from`, `map`, `Subject`)
- [ ] Keep `uuid` dependency (already used)

### Code Changes in notifications-center.ts
- [ ] Import types/classes from `@lace/notifications2` instead of `@lace/notifications`
- [ ] Create `WebExtensionStorageAdapter` class inline
- [ ] Implement userId retrieval/generation logic
- [ ] Add topic migration logic (detect old format, transform, save)
- [ ] Create sync trigger subjects (`notificationSync$`, `topicSync$`)
- [ ] Initialize `PubNubPollingProvider` with all dependencies
- [ ] Implement daily topic sync logic with timestamp storage
- [ ] Subscribe to `provider.notifications$` observable
- [ ] Subscribe to `provider.topics$` observable
- [ ] Update `subscribe()` method (Observable → Promise)
- [ ] Update `unsubscribe()` method (Observable → Promise)
- [ ] Add PostHog feature flag monitoring for notification sync
- [ ] Remove old `notificationsClientInstance` reference
- [ ] Update `getNotificationsClient()` export if needed

### Testing
- [ ] Test with fresh install (no existing storage)
- [ ] Test with existing storage (migration path)
- [ ] Test topic sync timing (should happen once per 24h)
- [ ] Test PostHog timestamp trigger (notification sync)
- [ ] Test subscribe/unsubscribe operations
- [ ] Test notification deduplication
- [ ] Test persistence across browser restarts
- [ ] Verify userId is reused across sessions

### Cleanup
- [ ] Remove `@lace/notifications` dependency from package.json
- [ ] Remove old imports
- [ ] Update any type references

---

## Risk Assessment

### Low Risk
✓ Storage migration is additive (adds fields, doesn't remove)
✓ Notification format is fully compatible
✓ UserId storage location unchanged
✓ API surface remains the same

### Medium Risk
⚠️ Observable subscriptions need proper error handling
⚠️ PostHog feature flag monitoring logic more complex
⚠️ Topic sync timing must be tested to avoid over-syncing

### Mitigation
- Add comprehensive error logging
- Test migration thoroughly with existing user data
- Monitor PostHog integration in staging environment
- Add feature flag to control rollout if needed

---

## References

### Key Files
- **Migration Target:** [v1/apps/browser-extension-wallet/src/lib/scripts/background/notifications-center.ts](../v1/apps/browser-extension-wallet/src/lib/scripts/background/notifications-center.ts)
- **Old Package:** [v1/packages/notifications/](../v1/packages/notifications/)
- **New Package:** [v1/packages/notifications2/](../v1/packages/notifications2/)

### Storage Keys Used
- `redux:persist:notificationsCenter` - App-level notifications + topics
- `notifications:userId` - User UUID (shared between old and new)
- `notifications:lastTopicSync` - Daily topic sync timestamp (NEW)
- `notifications:topics` - Provider-level topic state with subscription info
- `notifications:token` - PubNub auth token cache
- `notifications:cachedTopics` - PubNub metadata cache
- `notifications:lastSync:{topicId}` - Per-topic sync timestamps

---

## Approval

**Specification approved for implementation.**

**Next Steps:** Follow the implementation checklist to execute the migration.
