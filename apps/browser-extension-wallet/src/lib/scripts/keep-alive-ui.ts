import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { backgroundServiceProperties } from './background/config';
import { BackgroundService, BaseChannels } from './types';
import { runtime } from 'webextension-polyfill';
import { logger } from '@lace/common';

const PING_INTERVAL = 5000; // 5 seconds - same as original

const backgroundService = consumeRemoteApi<BackgroundService>(
  {
    baseChannel: BaseChannels.BACKGROUND_ACTIONS,
    properties: backgroundServiceProperties
  },
  { runtime, logger }
);

const keepServiceWorkerAlive = () => {
  setInterval(async () => {
    try {
      const response = await backgroundService.ping();
      logger.debug('Keep-alive ping response:', response);
    } catch (error) {
      logger.error('Keep-alive ping failed:', error);
    }
  }, PING_INTERVAL);
};

// Start the keep-alive mechanism
keepServiceWorkerAlive();
