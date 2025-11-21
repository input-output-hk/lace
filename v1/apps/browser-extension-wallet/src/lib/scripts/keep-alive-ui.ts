import { runtime } from 'webextension-polyfill';
import { logger } from '@lace/common';

const TIMEOUT_DURATION = 5000;

const setupKeepAliveConnection = () => {
  const port = runtime.connect({ name: 'keepAlive' });
  port.onDisconnect.addListener(setupKeepAliveConnection);
};

const setupFirefoxWakeInterval = () => {
  if (process.env.BROWSER === 'firefox') {
    setInterval(() => {
      runtime
        .sendMessage('ping')
        .then((response) => {
          logger.debug('Response received:', response);
        })
        .catch((error) => {
          logger.error('Connection error:', error);
        });
    }, TIMEOUT_DURATION);
  }
};

setupKeepAliveConnection();
setupFirefoxWakeInterval();
