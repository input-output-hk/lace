import * as Sentry from '@sentry/react-native';

// One shared instance: Sentry.init (App.tsx) must receive the same integration
// that the NavigationContainer registers into (Router.tsx), or screen-load
// transactions are never created.
export const sentryNavigationIntegration: ReturnType<
  typeof Sentry.reactNavigationIntegration
> = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
  // Lace bootstraps modules asynchronously before the NavigationContainer
  // mounts, so the default 1s window discards the initial transaction (and
  // the app start attached to it) before the container can register.
  routeChangeTimeoutMs: 15_000,
});
