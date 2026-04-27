# @lace-lib/observability

SDK-agnostic observability abstraction for error tracking across the Lace platform.

See [ADR 22](../../docs/adr/22-sentry-observability-library-approach.md) for the design rationale.

## Usage

### 1. Initialize at app entry point (before module loading)

```typescript
import * as Sentry from '@sentry/react'; // or @sentry/react-native
import {
  initializeObservability,
  NoOpProvider,
  createSentryProvider,
} from '@lace-lib/observability';

const provider = process.env.SENTRY_DSN
  ? createSentryProvider(Sentry)
  : new NoOpProvider();

initializeObservability(provider, {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  // ... platform-specific Sentry config
});
```

`createSentryProvider` accepts any Sentry-compatible SDK (`@sentry/react`, `@sentry/react-native`) as a runtime argument. All adapter logic (`filterRedacted`, scope management) lives in the factory. No `@sentry/*` dependency exists in this library.

### 2. Use the API in shared code

```typescript
import { getObservability } from '@lace-lib/observability';

const observability = getObservability();
observability.captureException(error, { tags: { component: 'SendFlow' } });
```

## API

| Export                                       | Description                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `createSentryProvider(Sentry)`               | Factory wrapping any Sentry SDK into an `ObservabilityProvider`                                        |
| `initializeObservability(provider, config?)` | Set the active provider and optionally call `provider.initialize(config)`                              |
| `getObservability()`                         | Get the API singleton (throws if not initialized)                                                      |
| `NoOpProvider`                               | Silent no-op provider (used when `SENTRY_DSN` is unset)                                                |
| `ObservableLogger`                           | Bridges `ts-log` Logger interface (forwards `error` level to observability, other levels console-only) |
| `ObservabilityProvider`                      | Interface that providers must implement                                                                |
