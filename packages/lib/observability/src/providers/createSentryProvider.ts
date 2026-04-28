import { filterRedacted } from '@lace-lib/util-redacted';

import { LogLevel } from '../types';

import type {
  ObservabilityProvider,
  BreadcrumbData,
  ErrorContext,
  UserContext,
  AppContext,
} from '../types';

interface SentryScopeLike {
  setTag(key: string, value: string): void;
  setExtra(key: string, value: unknown): void;
  setUser(user: UserContext | null): void;
}

interface SentryLike<TConfig> {
  init(config: TConfig): void;
  captureMessage(message: string, level?: LogLevel): void;
  captureException(error: unknown): void;
  withScope(callback: (scope: SentryScopeLike) => void): void;
  addBreadcrumb(breadcrumb: Record<string, unknown>): void;
  setUser(user: UserContext | null): void;
  setTag(key: string, value: string): void;
  setContext(key: string, context: Record<string, unknown> | null): void;
}

export const createSentryProvider = <TConfig>(
  sentry: SentryLike<TConfig>,
): ObservabilityProvider => ({
  captureMessage: (message: string, level: LogLevel = LogLevel.INFO): void => {
    const filtered = filterRedacted(message);
    sentry.captureMessage(
      typeof filtered === 'string' ? filtered : String(filtered),
      level,
    );
  },

  captureException: (error: Error, context?: ErrorContext): void => {
    if (context) {
      sentry.withScope(scope => {
        if (context.tags) {
          Object.entries(context.tags).forEach(([key, value]) => {
            scope.setTag(key, value);
          });
        }
        if (context.extra) {
          Object.entries(context.extra).forEach(([key, value]) => {
            scope.setExtra(key, filterRedacted(value));
          });
        }
        if (context.user) {
          scope.setUser(context.user);
        }
        sentry.captureException(error);
      });
    } else {
      sentry.captureException(error);
    }
  },

  addBreadcrumb: (breadcrumb: BreadcrumbData): void => {
    const filteredData = breadcrumb.data
      ? filterRedacted(breadcrumb.data)
      : undefined;

    const breadcrumbData =
      filteredData &&
      typeof filteredData === 'object' &&
      !Array.isArray(filteredData)
        ? (filteredData as Record<string, unknown>)
        : undefined;

    sentry.addBreadcrumb({
      message: breadcrumb.message,
      level: breadcrumb.level || LogLevel.INFO,
      category: breadcrumb.category,
      data: breadcrumbData,
      timestamp: Date.now() / 1000,
    });
  },

  setUser: (user: UserContext): void => {
    sentry.setUser(user);
  },

  setTag: (key: string, value: string): void => {
    sentry.setTag(key, value);
  },

  setContext: (key: string, context: AppContext): void => {
    sentry.setContext(key, context);
  },

  withScope: <T>(callback: (scope: unknown) => T): T => {
    let result: T;
    let hasCallbackExecuted = false;

    sentry.withScope(scope => {
      result = callback(scope);
      hasCallbackExecuted = true;
    });

    if (!hasCallbackExecuted) {
      throw new Error('Sentry.withScope failed to execute callback');
    }

    return result!;
  },

  initialize: (config: unknown): void => {
    sentry.init(config as TConfig);
  },
});
