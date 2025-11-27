/* eslint-disable no-magic-numbers */
import { Runtime, runtime } from 'webextension-polyfill';

interface TimedPort extends Runtime.Port {
  _timer?: NodeJS.Timeout;
}

const deleteTimer = (port: TimedPort) => {
  if (port._timer) {
    clearTimeout(port._timer);
    delete port._timer;
  }
};
const forceReconnect = (port: TimedPort) => {
  deleteTimer(port);
  port.disconnect();
};
runtime.onConnect.addListener((port: TimedPort) => {
  if (port.name !== 'keepAlive') return;
  port.onDisconnect.addListener(deleteTimer);
  port._timer = setTimeout(forceReconnect, 250e3, port);
});

if (process.env.BROWSER === 'firefox') {
  runtime.onMessage.addListener(() => Promise.resolve('Pong'));
}
