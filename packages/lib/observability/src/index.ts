import type { Observability, ObservabilityProvider } from './types';

export type {
  ObservabilityProvider,
  Observability,
  BreadcrumbData,
  UserContext,
  AppContext,
  ErrorContext,
} from './types';
export { LogLevel } from './types';
export { NoOpProvider, createSentryProvider } from './providers';
export { ObservableLogger } from './ObservableLogger';

// Global state container to avoid linting issues with let/const
const observabilityState = {
  provider: null as ObservabilityProvider | null,
};

// Helper to get provider with proper validation
const getProvider = (): ObservabilityProvider => {
  if (!observabilityState.provider) {
    throw new Error(
      'Observability not initialized. Call initializeObservability first.',
    );
  }
  return observabilityState.provider;
};

export const initializeObservability = (
  provider: ObservabilityProvider,
  config?: Record<string, unknown>,
): Observability => {
  observabilityState.provider = provider;

  if (config) {
    provider.initialize(config);
  }

  // Return clean API with proper validation
  return getObservability();
};

export const getObservability = (): Observability => {
  return {
    captureMessage: (message, level) => {
      getProvider().captureMessage(message, level);
    },
    captureException: (error, context) => {
      getProvider().captureException(error, context);
    },
    addBreadcrumb: breadcrumb => {
      getProvider().addBreadcrumb(breadcrumb);
    },
    setUser: user => {
      getProvider().setUser(user);
    },
    setTag: (key, value) => {
      getProvider().setTag(key, value);
    },
    setContext: (key, context) => {
      getProvider().setContext(key, context);
    },
    withScope: callback => getProvider().withScope(callback),
  };
};
