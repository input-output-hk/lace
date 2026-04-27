# @lace-lib/util-redacted

A TypeScript utility for wrapping sensitive data to prevent accidental exposure in logs, console output, JSON serialization, and error messages.

## Purpose

In wallet applications, sensitive data like passwords, mnemonics, private keys, and API secrets must never appear in logs, error messages, or debugging output. This package provides a type-safe wrapper that automatically redacts sensitive values while preserving type information and allowing controlled access to the underlying data.

## Features

- **Automatic Redaction**: Wrapped values display as `[REDACTED]` in:
  - JSON serialization (`JSON.stringify`)
  - String conversion (`toString()`)
  - Node.js console inspection (`util.inspect`)
- **Type Safety**: Preserves TypeScript types of wrapped values
- **Memory Security**: Securely wipes `Uint8Array` and `Buffer` contents
- **Deep Filtering**: Recursively filters redacted values from nested objects/arrays
- **Clone Resilient**: Maintains redaction after shallow object clones

## API

### `Redacted.make<A>(value: A): Redacted<A>`

Wraps a value to prevent accidental exposure.

```typescript
import { Redacted } from '@lace-lib/util-redacted';

const password = Redacted.make('my-secret-password');
const mnemonic = Redacted.make(new Uint8Array([1, 2, 3, 4]));
const apiKey = Redacted.make({ key: 'abc123', secret: 'xyz789' });

console.log(password); // [REDACTED]
JSON.stringify({ password }); // {"password":"[REDACTED]"}
```

### `Redacted.value<A>(redacted: Redacted<A>): A`

Extracts the original value from a redacted wrapper. Use this only when you need to access the sensitive data.

```typescript
const password = Redacted.make('my-secret-password');
const actual = Redacted.value(password); // 'my-secret-password'
```

### `Redacted.unsafeWipe<A>(redacted: Redacted<A>): void`

Securely wipes the contents of `Uint8Array` or `Buffer` by filling with zeros, then removes internal references. Use this when disposing of cryptographic material.

```typescript
const secret = Redacted.make(new Uint8Array([5, 6, 7]));
Redacted.unsafeWipe(secret);
console.log(Array.from(Redacted.value(secret))); // [0, 0, 0]
```

**Warning**: This mutates the underlying typed array. Only use when you're certain no other code holds references to the data.

### `Redacted.isRedacted(value: unknown): value is Redacted<unknown>`

Type guard to check if a value is redacted.

```typescript
const password = Redacted.make('secret');
const normal = 'not-secret';

Redacted.isRedacted(password); // true
Redacted.isRedacted(normal); // false
```

### `Redacted.filterRedacted(value: unknown): unknown`

Recursively filters redacted values from objects and arrays, replacing them with `[REDACTED]` strings.

```typescript
const secret = Redacted.make('password');
const payload = {
  username: 'alice',
  password: secret,
  nested: {
    apiKey: secret,
    public: 'data',
  },
};

const filtered = Redacted.filterRedacted(payload);
// {
//   username: 'alice',
//   password: '[REDACTED]',
//   nested: {
//     apiKey: '[REDACTED]',
//     public: 'data'
//   }
// }
```

## Usage Patterns

### Protecting Wallet Secrets

```typescript
import { Redacted } from '@lace-lib/util-redacted';

interface WalletCredentials {
  mnemonic: Redacted<string[]>;
  password: Redacted<string>;
}

const credentials: WalletCredentials = {
  mnemonic: Redacted.make(['word1', 'word2' /* ... */]),
  password: Redacted.make('user-password'),
};

// Safe to log - no secrets exposed
console.log('Credentials:', credentials);
// Credentials: { mnemonic: [REDACTED], password: [REDACTED] }
```

### Secure Error Handling

```typescript
const authSecret = Redacted.make(new Uint8Array(32));

try {
  const signature = signData(data, Redacted.value(authSecret));
} catch (error) {
  // If error contains authSecret, it will be redacted
  console.error('Signing failed:', Redacted.filterRedacted(error));
}
```

### Memory Cleanup

```typescript
const encryptionKey = Redacted.make(new Uint8Array(32));

// Use the key
const encrypted = encrypt(data, Redacted.value(encryptionKey));

// Wipe when done
Redacted.unsafeWipe(encryptionKey);
```

### Analytics/Logging

```typescript
function logEvent(event: unknown) {
  // Automatically strip all redacted values before sending
  const sanitized = Redacted.filterRedacted(event);
  analytics.track(sanitized);
}

logEvent({
  action: 'login',
  user: 'alice',
  password: Redacted.make('secret'), // Won't be sent to analytics
});
```

## Implementation Details

### How Redaction Works

The package uses JavaScript Symbols and property descriptors to intercept serialization:

1. **For Objects**: Decorates the original object with non-enumerable properties that override `toString()`, `toJSON()`, and Node.js inspect behavior
2. **For Primitives**: Wraps in an object with the same overrides
3. **Symbol Storage**: Stores the actual value using `Symbol.for('@lace/Redacted')` to avoid property name collisions

### Clone Behavior

Redacted values maintain their protection after shallow clones:

```typescript
const secret = Redacted.make({ apiKey: 'secret' });
const clone = Object.assign({}, secret);

console.log(clone); // Still shows [REDACTED]
Redacted.filterRedacted(clone); // '[REDACTED]'
```

## Security Considerations

### What This Package Does

- ✅ Prevents accidental exposure in logs, console, JSON
- ✅ Provides controlled access to sensitive data
- ✅ Wipes typed array contents from memory

### What This Package Does NOT Do

- ❌ Does not prevent intentional access via `Redacted.value()`
- ❌ Does not encrypt data (data is stored in plain form in memory)
- ❌ Does not prevent memory dumps or debugger inspection
- ❌ Does not wipe strings (JavaScript strings are immutable)

### Best Practices

1. **Minimize Lifetime**: Extract sensitive values only when needed, minimize scope
2. **Wipe Typed Arrays**: Use `unsafeWipe()` for cryptographic material stored in `Uint8Array`/`Buffer`
3. **Filter Logs**: Use `filterRedacted()` before sending data to analytics/logging
4. **Type Boundaries**: Mark function parameters/return types as `Redacted<T>` to enforce redaction at API boundaries

## Related ADRs

- ADR 13: Use Value Objects with Hierarchical Typing Pattern
- Security: Authentication Prompt (`@docs/authentication-prompt.md`)

## License

MIT
