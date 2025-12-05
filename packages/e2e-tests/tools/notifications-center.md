# e2eNotificationsCenter – E2E Notifications Center Utility

The `e2eNotificationsCenter` object is a helper for end-to-end (E2E) testing of the Notifications Center in Lace wallet application. It allows you to conveniently initialize test data, add notifications, and inspect notifications' state directly via the browser JavaScript console.

## How to Use

### 1. Making `e2eNotificationsCenter` Available

Copy the content of `notifications-center.js` (located in this directory) and paste it into the browser's JavaScript developer console while the Lace app is running. After doing this, a global `e2eNotificationsCenter` object will be available for use.

### 2. Methods Overview

#### `e2eNotificationsCenter.init(topics, notifications)`

- **Purpose:** Initializes `localStorage` with mock topics and notifications for E2E tests.
- **Parameters:**
  - `topics`: Array of topics.
  - `notifications`: Array of notifications.
- **Notes:**
  - This method clears and sets initial topics and notification data in the wallet's local storage.

#### `e2eNotificationsCenter.add(notification)`

- **Purpose:** Adds a new notification to the running wallet.
- **Parameters:**
  - `notification`: The notification object to add.
- **Notes:**
  - This method can be called while the wallet is running.
  - Useful for injecting notifications during E2E tests.

#### `e2eNotificationsCenter.dump()`

- **Purpose:** Retrieves the current state of notifications and topics.
- **Usage:** Call this at the end of the test to verify that the state matches expectations.

#### Internal Methods

- `validateNotification(notification, topics)`
- `validateTopic(topic)`

These are used internally for verifying input formats and should generally **not** be called directly.

## Example Usage

```js
// 1. Init the test and let the wallet start

// 2. Paste notifications-center.js in the browser console to define e2eNotificationsCenter

// => From now on, while the test is running,
// => next steps can be executed zero or more times depending on the test needs

// 3. Initialize topics and notifications for test and check wallet correctly shows data
await e2eNotificationsCenter.init(
  [
    { id: 'topic-1', name: 'Topic 1', subscribed: true },
    { id: 'topic-2', name: 'Topic 2' }
  ],
  [
    {
      message: {
        id: 'notification-1',
        title: 'Test Notification',
        body: 'This is a notification body',
        publisher: 'test-publisher',
        chain: 'testnet',
        format: 'plain',
        topicId: 'topic-1'
      }
    }
  ]
);

// 4. Add a new notification and check wallet correctly updates shown data
await e2eNotificationsCenter.add({
  message: {
    id: 'notification-2',
    title: 'Another',
    body: 'Added on-the-fly',
    publisher: 'test-publisher',
    chain: 'testnet',
    format: 'plain',
    topicId: 'topic-1'
  }
});

// 5. Get the current notifications and topics (for double-checking after the test)
const state = await e2eNotificationsCenter.dump();
console.log(state);
```

## Additional Notes

- Use the `init` method to seed initial data for tests.
- Use `add` to insert notifications while the app is running.
- Use `dump` at the end of tests for assertions or quick verification.
- `validateNotification` and `validateTopic` are input validation helpers and are called automatically as needed.

---
