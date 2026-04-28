export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal',
}

// Abstract interfaces - provider agnostic
export interface BreadcrumbData {
  message: string;
  level?: LogLevel;
  category?: string;
  data?: Record<string, unknown>;
}

export interface UserContext {
  id?: string;
  email?: string;
  username?: string;
}

export interface AppContext {
  [key: string]: unknown;
}

export interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: UserContext;
}

export interface ObservabilityProvider {
  // Core logging (compatible with existing logger)
  captureMessage(message: string, level?: LogLevel): void;
  captureException(error: Error, context?: ErrorContext): void;

  // Breadcrumbs for debugging trail
  addBreadcrumb(breadcrumb: BreadcrumbData): void;

  // Context management
  setUser(user: UserContext): void;
  setTag(key: string, value: string): void;
  setContext(key: string, context: AppContext): void;

  // Scoped operations
  withScope<T>(callback: (scope: unknown) => T): T;

  // Initialization
  initialize(config: unknown): void;
}

// Convenience API interface
export interface Observability {
  captureMessage: ObservabilityProvider['captureMessage'];
  captureException: ObservabilityProvider['captureException'];
  addBreadcrumb: ObservabilityProvider['addBreadcrumb'];
  setUser: ObservabilityProvider['setUser'];
  setTag: ObservabilityProvider['setTag'];
  setContext: ObservabilityProvider['setContext'];
  withScope: ObservabilityProvider['withScope'];
}
