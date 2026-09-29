import { getBackgroundMessenger } from '@lace-lib/extension-messaging';
import { runtime } from 'webextension-polyfill';

import { logger } from '../util/logger';

import { createIsConnectionAuthorized } from './authorize-connection';

// initialize background messenger so that it starts listening for connections as soon as SW starts.
// MUST remain the first messenger initialization in the SW: getBackgroundMessenger is a singleton,
// so the connection gate passed here is the one that takes effect for the whole worker.
getBackgroundMessenger({
  logger,
  runtime,
  isConnectionAuthorized: createIsConnectionAuthorized(runtime.getURL('')),
});

// https://developer.chrome.com/blog/tweeks-to-addAll-importScripts/#disallowing_asynchronous_importscripts
// Service worker limitation: have to load all scripts in top level.
// Scripts loaded during `install` phase are whitelisted.
self.addEventListener('install', event => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (event as any).waitUntil(
    (async () => {
      const { preloadScripts } = await import('../util/all-modules');
      await preloadScripts();
    })(),
  );
});

await import('./load');
