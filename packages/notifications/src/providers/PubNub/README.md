# PubNubProvider

This document describes the internal architecture and behavior of the `PubNubProvider` class, which implements the `NotificationsProvider` interface using PubNub as the underlying messaging infrastructure.

## Overview

The `PubNubProvider` manages PubNub connections, channel subscriptions, and message routing for the notifications system. It handles:

- Authentication via PubNub tokens
- Topic (channel) discovery and management
- Real-time message delivery
- Connection status monitoring
- Dynamic topic updates via control channel

## Architecture

### Initialization Flow

1. **Constructor**: Creates configuration but doesn't initialize PubNub yet
2. **`init()` method**:
   - Retrieves authentication token (unless `skipAuthentication` is true)
   - Creates PubNub instance with auth key
   - Sets up event listeners
   - Fetches all channel metadata from PubNub
   - Maps channels to topics
   - Automatically subscribes to control channels (channels starting with `control.`)
   - Sets up periodic channel refresh (every 24 hours)
   - Fetches missed messages for subscribed topics (runs asynchronously, errors are logged)
   - Returns initial list of topics

### Topic Management

Topics are stored in the `topics` array and represent PubNub channels. Each topic contains:

- `id`: Channel ID
- `name`: Display name
- `autoSubscribe`: Whether to automatically subscribe when discovered
- `chain`: Blockchain identifier
- `isSubscribed`: Current subscription status

Topics are initially loaded from PubNub channel metadata during initialization. They can be dynamically updated via:
- The `control.topics` channel (real-time updates)
- The `refreshChannels()` method (periodic refresh every 24 hours)

### Control Channel Protocol

The provider listens to the `control.topics` channel for dynamic topic management. This channel uses a simple protocol with two action types:

#### PUT Action (Add/Update)

Used for both adding new topics and updating existing ones. When updating, the entire metadata set replaces the channel metadata (partial updates are not supported - you cannot remove a specific metadata key/value pair).

```json
{
  "action": "PUT",
  "topicId": "id of the channel",
  "details": {
    "name": "Topic Name",
    "autoSubscribe": true,
    "chain": "mainnet",
    "key": "value",
    ...
  }
}
```

**Behavior:**

- If `topicId` doesn't exist: Creates a new topic with `isSubscribed: false`
- If `topicId` exists: Replaces the entire topic metadata, preserving the current `isSubscribed` status
- After processing, calls `onTopics()` with the updated topics array

#### DEL Action (Delete)

Removes a topic from the list.

```json
{
  "action": "DEL",
  "topicId": "id of the channel"
}
```

**Behavior:**

- If `topicId` doesn't exist: Logs a warning and ignores
- If `topicId` exists: Removes it from the topics array
- After processing, calls `onTopics()` with the updated topics array

### Message Routing

The provider handles two types of messages:

1. **Control Channel Messages**: Messages on channels starting with `control.` are routed to `handleChannelsControl()`
2. **Notification Messages**: Messages on subscribed topic channels are processed via `processNotification()` which:
   - Validates the notification object
   - Adds the `topicId` to the notification
   - Calls `onNotification()` callback
   - Stores the last sync timestamp (timetoken + 1) for the topic

### Message Synchronization

The provider implements message synchronization to ensure no notifications are missed:

1. **On Initialization**: After loading topics, `fetchMissedMessages()` is called to retrieve any messages that arrived while the client was offline
2. **Message Processing**: All incoming messages are processed via `processNotification()` which:
   - Validates the notification structure
   - Updates the last sync timestamp in storage
   - Ensures notifications are delivered even if processing fails (errors are logged)

The `fetchMissedMessages()` method:
- Retrieves subscribed topics from storage
- For each topic that is either currently subscribed or was previously subscribed (stored in `subscribedTopics`):
  - Fetches up to 100 messages from PubNub using the last sync timestamp
  - Processes each message via `processNotification()`
- Handles topics that may have been subscribed before but are not in the current topics list

### Subscription Management

#### Subscribe Flow

1. Updates topic's `isSubscribed` to `true` in the topics array
2. Calls `onTopics()` to notify listeners
3. Calls `pubnub.subscribe()` with the channel ID
4. Stores a pending action in `pendingSubscriptions` map
5. Waits for `PNSubscribeOperation` status event
6. On success: Resolves the promise and removes from pending map
7. On network error: Rejects all pending subscriptions

#### Unsubscribe Flow

1. Updates topic's `isSubscribed` to `false` in the topics array
2. Calls `onTopics()` to notify listeners
3. Calls `pubnub.unsubscribe()` with the channel ID
4. Stores a pending action in `pendingUnsubscriptions` map
5. Waits for `PNUnsubscribeOperation` status event
6. On success: Resolves the promise and removes from pending map
7. Special case: If unsubscribing from `control.topics` during `close()`, stops PubNub and resolves close promise

### Connection Status Handling

The provider monitors PubNub status events and updates the `ConnectionStatus` accordingly:

- **`PNHeartbeatOperation`**: Ignored (heartbeat operations)
- **`PNNetworkDownCategory`**: Ignored (happens after errors)
- **`PNNetworkUpCategory`**: Sets connection status to OK
- **`PNReconnectedCategory`**: Ignored (happens after network up)
- **`PNNetworkIssuesCategory`**:
  - Rejects all pending subscriptions/unsubscriptions
  - Clears pending maps
  - Sets connection status to error
- **`PNSubscribeOperation`**:
  - Resolves pending subscriptions for affected channels
  - Sets connection status to OK
- **`PNUnsubscribeOperation`**:
  - Resolves pending unsubscriptions for affected channels
  - Sets connection status to OK
  - Special handling for `control.topics` during close

### Authentication

Authentication is handled via the `TokenManager` and `PubNubFunctionClient`:

1. `getAuthKey()` creates a `TokenManager` instance
2. `TokenManager` requests a token from the PubNub Function endpoint
3. Token is cached in storage and automatically refreshed when expiring
4. Token is used as `authKey` in PubNub configuration

If `skipAuthentication` is true (test mode), no token is requested and PubNub is initialized without authentication.

### Channel Mapping

The `mapChannelToTopic()` function converts PubNub channel metadata to `Topic` objects:

- Validates channel structure
- Extracts `id`, `name`, and `custom` fields
- Handles control channels (auto-subscribes but doesn't create topics)
- Validates and extracts `autoSubscribe` and `chain` from custom fields
- Returns `undefined` for invalid channels (logged as warnings)

The `channelsToTopics()` function processes an array of channels and filters out invalid ones, returning only valid Topic objects.

### Periodic Channel Refresh

The provider automatically refreshes the channel list every 24 hours via the `refreshChannels()` method:

1. Fetches all channel metadata from PubNub
2. Converts channels to topics using `channelsToTopics()`
3. Compares new topics with current topics using JSON stringification
4. If topics have changed: Updates the topics array and calls `onTopics()` callback
5. If topics are unchanged: No callback is triggered (avoids unnecessary updates)
6. Errors during refresh are logged but do not interrupt the provider's operation

This ensures the provider stays in sync with PubNub channel metadata even if control channel messages are missed or if channels are modified directly in PubNub.

## Key Implementation Details

### Pending Actions

The provider maintains two maps for tracking pending operations:

- `pendingSubscriptions`: Maps topic ID to `{ resolve, reject }` callbacks
- `pendingUnsubscriptions`: Maps topic ID to `{ resolve, reject }` callbacks

These are used to resolve/reject promises when PubNub status events confirm the operations.

### Control Channel Auto-Subscription

During channel mapping, any channel with ID starting with `control.` is automatically subscribed to, but not added to the topics list. This ensures the provider receives control messages without cluttering the topics array.

### Topic State Preservation

When a PUT action updates an existing topic, the `isSubscribed` status is preserved. This ensures that subscription state is maintained across metadata updates.

### Error Handling

- Invalid control messages are logged as warnings and ignored
- Network errors reject all pending operations and clear pending maps
- Invalid channel metadata is logged and filtered out
- Unexpected status events are logged as warnings
- Channel refresh errors are logged but do not throw exceptions (provider continues operating)
- Invalid notification objects throw errors and are logged (processing continues for other messages)
- Message processing errors are caught and logged without interrupting the provider
- `fetchMissedMessages()` errors are caught and logged during initialization (provider continues operating)

## Testing

The provider can be tested with `skipAuthentication: true` to bypass token management. See `PubNubProvider.test.ts` for comprehensive test coverage.

## Dependencies

- `pubnub`: PubNub SDK
- `TokenManager`: Manages authentication token lifecycle
- `PubNubFunctionClient`: HTTP client for token requests
- `ConnectionStatus`: Tracks and reports connection state
- `StorageKeys`: Generates storage key names
- `NotificationsStorage`: Persists token data
