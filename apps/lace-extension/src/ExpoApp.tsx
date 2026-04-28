import '@expo/metro-runtime';
import { Buffer as WebBuffer } from 'buffer';

import {
  initLaceContext,
  loadedActionCreators,
  loadedSelectors,
  ViewId,
} from '@lace-contract/module';
import { SidePanelViewId } from '@lace-contract/views';
import {
  initializeObservability,
  NoOpProvider,
  createSentryProvider,
} from '@lace-lib/observability';
import { Loader, configureImageFormat } from '@lace-lib/ui-toolkit';
import * as Sentry from '@sentry/react';
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { tabs, runtime, storage, windows } from 'webextension-polyfill';

import { App } from './App';
import { connectStore, createExtensionModuleLoader } from './util';

import type { AsyncReturnType } from 'type-fest';

// Set up Buffer polyfill for web
globalThis.Buffer = WebBuffer;

configureImageFormat({
  webIpfsGatewayUrl: process.env.EXPO_PUBLIC_WEB_IPFS_GATEWAY_URL,
});

// Initialize Sentry for UI context (early, before any app code)
const sentryDsn = process.env.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;
const sentryEnvironment =
  process.env.SENTRY_ENVIRONMENT || process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT;
const isSentryEnabled = sentryDsn && sentryDsn !== '';

if (isSentryEnabled) {
  const obs = initializeObservability(createSentryProvider(Sentry), {
    dsn: sentryDsn,
    environment: sentryEnvironment,
    release: runtime.getManifest().version,
    sendDefaultPii: false,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.browserProfilingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracePropagationTargets: ['localhost', `chrome-extension://${runtime.id}`],
    tracesSampleRate: 0.05,
    profilesSampleRate: 0.05,
    replaysSessionSampleRate: 0.005,
    replaysOnErrorSampleRate: 1.0,
  });

  obs.setContext('app', {
    name: 'Lace Extension UI',
    version: runtime.getManifest().version,
  });

  // Share anonymous UUID with service worker for event correlation
  void storage.local
    .get('SENTRY-UUID')
    .then(storageVariable => {
      const sentryUuid =
        (storageVariable?.['SENTRY-UUID'] as string) ?? uuidv4();
      if (!storageVariable?.['SENTRY-UUID']) {
        void storage.local.set({ 'SENTRY-UUID': sentryUuid });
      }
      obs.setUser({ id: sentryUuid });
    })
    .catch(() => {
      // Silent: anonymous user correlation is best-effort
    });
} else {
  initializeObservability(new NoOpProvider());
}

const detectViewId = async (): Promise<ViewId> => {
  // popupWindow views have a tab ID — detect them first
  try {
    const selfTab = await tabs.getCurrent();
    if (selfTab?.id) {
      return ViewId(selfTab.id);
    }
  } catch {
    // No tab context — this is the side panel
  }

  // Side panel: deterministic ID derived from window ID
  const currentWindow = await windows.getCurrent();
  return SidePanelViewId(currentWindow.id!);
};

// same initialization for side-panel and popupWindow
const loadUiScript = async () => {
  const viewId = await detectViewId();

  const store = await connectStore({ runtime });
  const moduleInitProps = await createExtensionModuleLoader({
    view: {
      id: viewId,
      remoteStore: store,
    },
  });
  const initializers = await moduleInitProps.loadModules(
    'addons.loadInitializeExtensionView',
  );
  // PERF: this might delay rendering longer than necessary;
  // may want to render a loader while modules/i18n are loading
  await initLaceContext(moduleInitProps.loadModules);
  await Promise.all(
    initializers.map(async init =>
      init(store, {
        selectors: loadedSelectors,
        actions: loadedActionCreators,
      }),
    ),
  );
  return { viewId, store, moduleInitProps };
};

type Init = AsyncReturnType<typeof loadUiScript>;

const loadPromise = loadUiScript();

const ExpoApp = () => {
  const [init, setInit] = useState<Init>();
  useEffect(() => {
    void loadPromise.then(setInit);
  }, []);

  if (!init) return <Loader />;

  const appContent = (
    <Provider store={init.store}>
      <App viewId={init.viewId} moduleInitProps={init.moduleInitProps} />
    </Provider>
  );

  // Only wrap with Sentry ErrorBoundary if Sentry is initialized
  const wrappedContent = isSentryEnabled ? (
    <Sentry.ErrorBoundary fallback={<Loader />}>
      {appContent}
    </Sentry.ErrorBoundary>
  ) : (
    appContent
  );

  return wrappedContent;
};

export default ExpoApp;
