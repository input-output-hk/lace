import { getBackgroundMessenger } from '@cardano-sdk/web-extension';
import { logger } from '@lace/common';
import { runtime } from 'webextension-polyfill';

// Register runtime.onConnect listener synchronously so the SW can
// accept connections immediately when woken up by a content script.
// The dynamic import below loads all exposeApi calls asynchronously
// (required for WASM loading), but they reuse this same singleton.
getBackgroundMessenger({ logger, runtime });

import('./index');
