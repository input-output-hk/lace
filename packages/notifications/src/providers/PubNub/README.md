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
   - Returns initial list of topics

### Topic Management

Topics are stored in the `topics` array and represent PubNub channels. Each topic contains:

- `id`: Channel ID
- `name`: Display name
- `autoSubscribe`: Whether to automatically subscribe when discovered
- `chain`: Blockchain identifier
- `isSubscribed`: Current subscription status

Topics are initially loaded from PubNub channel metadata during initialization. They can be dynamically updated via the `control.topics` channel.

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
2. **Notification Messages**: Messages on subscribed topic channels are routed to `onNotification()` callback

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

## Testing

The provider can be tested with `skipAuthentication: true` to bypass token management. See `PubNubProvider.test.ts` for comprehensive test coverage.

## Dependencies

- `pubnub`: PubNub SDK
- `TokenManager`: Manages authentication token lifecycle
- `PubNubFunctionClient`: HTTP client for token requests
- `ConnectionStatus`: Tracks and reports connection state
- `StorageKeys`: Generates storage key names
- `NotificationsStorage`: Persists token data
