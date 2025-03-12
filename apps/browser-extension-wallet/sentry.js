import * as Sentry from '@sentry/react';
import { v4 as uuidv4 } from 'uuid';
import { storage } from 'webextension-polyfill';
Sentry.init({
  environment: process.env.SENTRY_ENVIRONMENT,
  dsn: process.env.SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration(), Sentry.browserProfilingIntegration(), Sentry.replayIntegration()],
  // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
  tracePropagationTargets: ['localhost', 'chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk'],
  // .5%
  tracesSampleRate: 0.05,
  profilesSampleRate: 0.05,
  // Since profilesSampleRate is relative to tracesSampleRate,
  // the final profiling rate can be computed as tracesSampleRate * profilesSampleRate
  // A tracesSampleRate of 0.05 and profilesSampleRate of 0.05 results in 2.5% of
  // transactions being profiled (0.05*0.05=0.0025)

  // Capture Replay for 0.05% of all sessions,
  replaysSessionSampleRate: 0.005,
  // ...plus for 100% of sessions with an error
  replaysOnErrorSampleRate: 1.0
});

storage.local.get('SENTRY-UUID').then((storageVar) => {
  let sentryUuid = storageVar?.['SENTRY-UUID'] ?? uuidv4();
  if (!storageVar?.['SENTRY-UUID']) {
    storage.local.set({ 'SENTRY-UUID': sentryUuid });
  }
  Sentry.setUser({ id: sentryUuid });
});
