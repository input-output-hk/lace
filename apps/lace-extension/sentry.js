import {
  initializeObservability,
  createSentryProvider,
} from '@lace-lib/observability';
import * as Sentry from '@sentry/react';
import { v4 as uuidv4 } from 'uuid';
import { storage, runtime } from 'webextension-polyfill';

// Initialize Sentry for the service worker context via the shared observability layer.
// No DOM integrations (browserTracing, browserProfiling, replay) — this is a web worker.
// Default integrations (breadcrumbs, dedup, linked errors, etc.) are preserved.
const obs = initializeObservability(createSentryProvider(Sentry), {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  release: runtime.getManifest().version,
  sendDefaultPii: false,
  tracePropagationTargets: ['localhost', `chrome-extension://${runtime.id}`],
  tracesSampleRate: 0.05,
  beforeSend: event => {
    // Drop ScheduleActionTimeoutError from @trezor/connect-webextension:
    // content script injection into Trezor popup uses 100ms timeout (3 attempts),
    // too short for the large injected bundle. Unhandled rejection is benign —
    // popup communication works via ServiceWorkerWindowChannel independently.
    if (
      event.exception?.values?.some(
        error => error.type === 'ScheduleActionTimeoutError',
      )
    ) {
      return null;
    }
    return event;
  },
});

obs.setContext('app', {
  name: 'Lace Extension',
  version: runtime.getManifest().version,
});

// Share anonymous UUID with UI context for event correlation
storage.local
  .get('SENTRY-UUID')
  .then(storageVariable => {
    const sentryUuid = storageVariable?.['SENTRY-UUID'] ?? uuidv4();
    if (!storageVariable?.['SENTRY-UUID']) {
      void storage.local.set({ 'SENTRY-UUID': sentryUuid });
    }
    obs.setUser({ id: sentryUuid });
  })
  .catch(() => {
    // Silent: anonymous user correlation is best-effort
  });
