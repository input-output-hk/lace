import {
  initializeObservability,
  createSentryProvider,
} from '@lace-lib/observability';
import * as Sentry from '@sentry/react';
import { v4 as uuidv4 } from 'uuid';
import { storage, runtime } from 'webextension-polyfill';

import {
  registerProxyNetworkDiagnostics,
  preserveProxyDiagnosticDedupe,
  sanitizeProxyNetworkDiagnosticEvent,
} from './proxy-network-diagnostics';

// Initialize Sentry for the service worker context via the shared observability layer.
// No DOM integrations (browserTracing, browserProfiling, replay) — this is a web worker.
// Keep default integrations, except that already rate-limited provider diagnostics
// bypass Sentry's duplicate filter before their fingerprint is set in beforeSend.
const obs = initializeObservability(createSentryProvider(Sentry), {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  release: runtime.getManifest().version,
  sendDefaultPii: false,
  tracePropagationTargets: ['localhost', `chrome-extension://${runtime.id}`],
  tracesSampleRate: 0.05,
  integrations: preserveProxyDiagnosticDedupe,
  beforeSend: (event, hint) => {
    const safeEvent = sanitizeProxyNetworkDiagnosticEvent(event);
    if (safeEvent !== event) {
      // Attachments are carried on the hint rather than the event itself.
      hint.attachments = [];
      return safeEvent;
    }

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

// Register synchronously so Chrome can wake the MV3 service worker for request errors.
registerProxyNetworkDiagnostics(chrome.webRequest, obs, {
  extensionOrigin: `chrome-extension://${runtime.id}`,
  maestroMainnetUrl: process.env.MAESTRO_URL_MAINNET,
  maestroTestnetUrl: process.env.MAESTRO_URL_TESTNET,
  mempoolMainnetUrl: process.env.MEMPOOLSPACE_URL_MAINNET,
  mempoolTestnetUrl: process.env.MEMPOOLSPACE_URL_TESTNET,
  coinGeckoUrl: process.env.COINGECKO_API_BASE_URL,
  steelSwapUrl: process.env.STEELSWAP_API_BASE_URL,
  nftCdnUrl: process.env.NFT_CDN_URL,
  cardanoCubeUrl: process.env.CARDANO_CUBE_BASE_URL,
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
