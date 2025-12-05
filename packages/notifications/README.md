# @lace/notifications

A TypeScript library for managing real-time notifications with support for topic-based subscriptions, automatic reconnection, and persistent state management.

## Features

- 🔔 **Real-time notifications** - Receive notifications as they happen
- 📋 **Topic management** - Subscribe and unsubscribe from topics dynamically
- 🔄 **Auto-reconnection** - Automatic reconnection with retry logic for failed subscriptions
- 💾 **Persistent state** - Subscription state is persisted across sessions
- 🔐 **Authentication** - Built-in token-based authentication with automatic refresh
- 📦 **Provider-based** - Pluggable provider architecture (currently supports PubNub)
- 🎯 **Type-safe** - Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @lace/notifications
# or
yarn add @lace/notifications
```

## Quick Start

```typescript
import { NotificationsClient } from '@lace/notifications';

// Create a storage adapter (see Storage section)
const storage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    // Your storage implementation
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    // Your storage implementation
  },
  async removeItem(key: string): Promise<void> {
    // Your storage implementation
  }
};

// Create the client
const client = new NotificationsClient({
  storage,
  provider: {
    name: 'PubNub',
    configuration: {
      subscribeKey: 'your-subscribe-key'
    }
  },
  onNotification: (notification) => {
    console.log('Received notification:', notification);
  },
  onTopics: (topics) => {
    console.log('Available topics:', topics);
  },
  onConnectionStatusChange: (error) => {
    if (error) {
      console.error('Connection error:', error);
    } else {
      console.log('Connected');
    }
  }
});

// The client initializes automatically
// Topics will be available via the onTopics callback

// Subscribe to a topic
await client.subscribe('topic-id');

// Unsubscribe from a topic
await client.unsubscribe('topic-id');

// Clean up when done
await client.close();
```

## API Reference

### NotificationsClient

The main client class for managing notifications.

#### Constructor

```typescript
new NotificationsClient(options: NotificationsClientOptions)
```

**Options:**

- `storage` (required): Storage adapter for persisting state
- `provider` (required): Provider configuration
  - `name` (required): Provider name (currently only `'PubNub'` is supported)
  - `configuration` (optional): Provider-specific configuration
    - For PubNub:
      - `subscribeKey` (optional): PubNub subscribe key
      - `heartbeatInterval` (optional): Heartbeat interval in seconds (default: 15)
      - `skipAuthentication` (optional): Skip authentication (for testing only)
      - `tokenEndpoint` (optional): Custom token endpoint URL
- `onNotification` (required): Callback invoked when a notification is received
- `onTopics` (required): Callback invoked when the topics list changes
- `onConnectionStatusChange` (optional): Callback invoked when connection status changes
- `logger` (optional): Logger instance (defaults to `console`)
- `storageKeysPrefix` (optional): Prefix for storage keys (default: `'notifications'`)

**Note:** The client automatically generates and manages a user ID (UUID v4) for provider authentication. The user ID is stored in storage under the key `{prefix}:userId` and persists across sessions. If an invalid user ID is found in storage, the client will throw an error during initialization.

#### Methods

##### `subscribe(topicId: string): Promise<void>`

Subscribes to a topic to start receiving notifications.

```typescript
await client.subscribe('topic-id');
```

**Throws:**

- `Error` if the client is not operational
- `Error` if the topic is already subscribed
- `Error` if the topic is unknown

##### `unsubscribe(topicId: string): Promise<void>`

Unsubscribes from a topic to stop receiving notifications.

```typescript
await client.unsubscribe('topic-id');
```

**Throws:**

- `Error` if the client is not operational
- `Error` if the topic is already unsubscribed
- `Error` if the topic is unknown

##### `close(): Promise<void>`

Closes the connection and cleans up resources.

```typescript
await client.close();
```

## Types

### Notification

Represents a notification message received from a topic.

```typescript
type Notification = {
  id: string;
  message: string;
  timestamp: string;
  title: string;
  topicId: string;
} & Record<string, unknown>;
```

### Topic

Represents a topic that can be subscribed to.

```typescript
type Topic = {
  id: string;
  name: string;
  autoSubscribe: boolean;
  chain: string;
  isSubscribed: boolean;
} & Record<string, unknown>;
```

### NotificationsStorage

Interface for storage adapters. All methods are async to support both synchronous and asynchronous storage backends.

```typescript
interface NotificationsStorage {
  getItem<T>(key: string): Promise<T | undefined>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

### NotificationsLogger

Interface for loggers.

```typescript
interface NotificationsLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}
```

## Storage Adapters

The library requires a storage adapter to persist subscription state. Here are examples for common platforms:

### Browser LocalStorage

```typescript
const localStorageAdapter: NotificationsStorage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : undefined;
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  },
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
};
```

### Chrome Extension Storage

```typescript
const extensionStorage: NotificationsStorage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },
  async removeItem(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }
};
```

### React Native AsyncStorage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const asyncStorageAdapter: NotificationsStorage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    const item = await AsyncStorage.getItem(key);
    return item ? JSON.parse(item) : undefined;
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
};
```

## Advanced Usage

### Custom Logger

```typescript
const customLogger: NotificationsLogger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

const client = new NotificationsClient({
  // ... other options
  logger: customLogger
});
```

### Handling Connection Status

```typescript
const client = new NotificationsClient({
  // ... other options
  onConnectionStatusChange: (error) => {
    if (error) {
      // Handle connection error
      showErrorBanner('Connection lost. Retrying...');
    } else {
      // Connection restored
      hideErrorBanner();
    }
  }
});
```

### Auto-Subscribe Topics

Topics with `autoSubscribe: true` are automatically subscribed when discovered. The client handles this internally and will retry if the initial subscription fails.

### Topic Updates

The `onTopics` callback is invoked whenever:

- The client initializes and discovers topics
- Topics are added, removed, or updated via the control channel
- Subscription status changes

```typescript
const client = new NotificationsClient({
  // ... other options
  onTopics: (topics) => {
    // Update your UI with the latest topics
    updateTopicsList(topics);

    // Check which topics are subscribed
    const subscribed = topics.filter((t) => t.isSubscribed);
    console.log('Subscribed topics:', subscribed);
  }
});
```

## Error Handling

The client throws errors in the following scenarios:

- **Invalid configuration**: Type errors for missing or invalid options
- **Subscription errors**: When trying to subscribe to an unknown or already subscribed topic
- **Unsubscription errors**: When trying to unsubscribe from an unknown or already unsubscribed topic
- **Network errors**: Handled internally with automatic retry on reconnection

Always wrap async operations in try-catch blocks:

```typescript
try {
  await client.subscribe('topic-id');
} catch (error) {
  console.error('Failed to subscribe:', error);
}
```

## Lifecycle

1. **Construction**: Client is created with configuration and automatically starts initializing
2. **Initialization**: Client fetches topics from the provider and restores subscription state from storage
3. **Ready**: Client is ready to subscribe/unsubscribe (topics are available via `onTopics` callback)
4. **Active**: Client receives notifications and handles topic updates
5. **Cleanup**: Call `close()` to clean up resources

**Note**: The client initializes asynchronously during construction. Wait for the `onTopics` callback to receive the initial topics list before attempting to subscribe.

## Provider Configuration

### PubNub

The PubNub provider supports the following configuration options:

- `subscribeKey` (optional): PubNub subscribe key for the application. If not provided, a default placeholder is used.
- `heartbeatInterval` (optional): Heartbeat interval in seconds (default: 15)
- `skipAuthentication` (optional): Test only! Whether to skip authentication. If true, no auth token will be requested.
- `tokenEndpoint` (optional): Custom PubNub auth endpoint for token requests. Defaults to the standard PubNub Function endpoint.

Authentication is handled automatically via PubNub Functions. The client requests tokens from the default endpoint (or custom `tokenEndpoint` if provided) and manages token refresh internally.

## Storage Keys

The client stores the following keys in your storage adapter:

- `{prefix}:userId` - User ID (UUID v4) for provider authentication, automatically generated on first use
- `{prefix}:subscribedTopics` - Array of subscribed topic IDs
- `{prefix}:unsubscribedTopics` - Array of unsubscribed topic IDs

Where `{prefix}` defaults to `'notifications'` but can be customized via `storageKeysPrefix`.

## License

Apache-2.0

## Support

For issues and questions, please visit the [GitHub repository](https://github.com/input-output-hk/lace).
