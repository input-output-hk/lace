# e2eNotificationsCenter – E2E Notifications Center Utility

The `e2eNotificationsCenter` object is a helper for end-to-end (E2E) testing of the Notifications Center in your Lace wallet application. It allows you to conveniently initialize test data, add notifications, and inspect notifications' state directly via the browser JavaScript console.

## How to Use

### 1. Making `e2eNotificationsCenter` Available

Copy the content of `notifications-center.js` (located in this directory) and paste it into the browser's JavaScript developer console while the Lace app is running. After doing this, a global `e2eNotificationsCenter` object will be available for use.

### 2. Methods Overview

#### `e2eNotificationsCenter.init(topics, notifications, v1)`

- **Purpose:** Initializes `localStorage` with mock topics and notifications for E2E tests.
- **Parameters:**
  - `topics`: Array of topics.
  - `notifications`: Array of notifications.
  - `v1`: Boolean; if `true`, initializes `localStorage` using the key for Lace v1. If omitted (or `false`), uses the key for Lace v2 (i.e. bundled build).
- **Notes:**
  - This method clears and sets initial topics and notification data in the wallet's local storage.
  - **After calling `init`, you must restart the application for changes to take effect.**

#### `e2eNotificationsCenter.add(notification)`

- **Purpose:** Adds a new notification to the running wallet.
- **Parameters:**
  - `notification`: The notification object to add.
- **Notes:**
  - This method can be called while the wallet is running.
  - Useful for injecting notifications during E2E tests without a restart.

#### `e2eNotificationsCenter.dump()`

- **Purpose:** Retrieves the current state of notifications and topics.
- **Usage:** Call this at the end of your test to verify that the state matches expectations.

#### Internal Methods

- `validateNotification(notification, topics)`
- `validateTopic(topic)`

These are used internally for verifying input formats and should generally **not** be called directly.

## Example Usage

```js
// 1. Paste notifications-center.js in the browser console to define e2eNotificationsCenter

// 2. Initialize topics and notifications for test
await e2eNotificationsCenter.init(
  [
    { id: 'topic-1', name: 'Topic 1', subscribed: true },
    { id: 'topic-2', name: 'Topic 2' },
  ],
  [
    {
      message: {
        id: 'notif-1',
        title: 'Test Notification',
        body: 'This is a notification body',
        publisher: 'test-publisher',
        chain: 'testnet',
        format: 'plain',
        topicId: 'topic-1',
      },
    },
  ],
  // true for Lace v1
);

// => Now restart the application and run the test (first part of the test)

// 3. While the wallet is running, add a notification dynamically
await e2eNotificationsCenter.add({
  message: {
    id: 'notif-2',
    title: 'Another',
    body: 'Added on-the-fly',
    publisher: 'test-publisher',
    chain: 'testnet',
    format: 'plain',
    topicId: 'topic-1',
  },
});

// => Now check the wallet correctly behaves on new notifications (second part of the test)

// 4. Get the current notifications and topics (for double-checking after your test)
const state = await e2eNotificationsCenter.dump();
console.log(state);
```

## Additional Notes

- Use the `init` method to seed initial data for your tests, remembering to restart the app afterwards.
- Use `add` to insert notifications while the app is running, no restart required.
- Use `dump` at the end of tests for assertions or quick verification.
- `validateNotification` and `validateTopic` are input validation helpers and are called automatically as needed.

---
