# Observability System

This abstracts our monitoring/error tracking so we're not locked into Sentry.

## Basic Usage

Initialize once in your app:

```typescript
import { ENV } from '../util/config';
import { initializeObservability } from './util/observability';

// Initialize once at app startup (no return value - call for side effects)
initializeObservability(ENV, {
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: true,
  environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
});
```

Then use it anywhere:

```typescript
import { getObservability, LogLevel } from './observability';

const obs = getObservability();
obs.captureMessage('Something happened', LogLevel.INFO);
obs.captureException(error, { tags: { userId: user.id } });
```

## Why This Abstraction

Switching from Sentry to another provider later is trivial. Development uses a no-op provider (no network calls). Consistent API across the app. Type-safe LogLevel enum instead of magic strings.

The provider factory picks NoOp for development (when DSN is missing) and Sentry otherwise. In production, missing DSN causes a configuration error that prevents app startup.

## Comparison

Before (scattered Sentry calls):

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.captureMessage('test');
Sentry.withScope(scope => {
  scope.setTag('userId', '123');
  Sentry.captureException(error);
});
```

After (clean abstraction):

```typescript
const obs = getObservability();
obs.captureMessage('test', LogLevel.INFO);
obs.captureException(error, { tags: { userId: '123' } });
```

## File Structure

```
observability/
├── index.ts                    # Main exports and initialization
├── types.ts                    # LogLevel enum and interfaces
├── ObservableLogger.ts         # Enhanced logger wrapper
└── providers/
    ├── index.ts               # Provider factory
    ├── SentryProvider.ts      # Sentry implementation
    └── NoOpProvider.ts        # No-op implementation
```

## Enhanced Logger

Wrap your existing logger to get automatic observability:

```typescript
import { ObservableLogger, getObservability } from './observability';

// After app initialization, get the global observability instance
const observability = getObservability();
const enhancedLogger = new ObservableLogger(logger, observability);

// Now logger.error() also sends to monitoring dashboard
enhancedLogger.error(new Error('Database connection failed'));
```

## Common Patterns

User tracking:

```typescript
obs.setUser({ id: userId, email: userEmail });
obs.setTag('walletType', 'hardware');
```

Breadcrumb trail:

```typescript
obs.addBreadcrumb({
  message: 'User opened send flow',
  category: 'navigation',
  level: LogLevel.DEBUG,
});
```

Error context:

```typescript
obs.captureException(error, {
  tags: { screen: 'send-transaction' },
  extra: { amount: 100, address: 'addr123' },
});
```

## Testing

Use the NoOp provider or mock the interface:

```typescript
const mockObs = {
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  // ...
};
```

## Adding New Providers

Implement `ObservabilityProvider` and update the factory in `providers/index.ts`. Current logic: NoOp for development without DSN, Sentry otherwise. Missing DSN in production is validated at startup and shows configuration error screen.

## Best Practices

- Initialize once at app startup
- Use LogLevel enum, not strings
- Add context before capturing errors
- Tag everything for dashboard filtering
- Import specific types, not wildcards
- Test with NoOpProvider in development
