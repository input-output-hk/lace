import { runtime } from 'webextension-polyfill';

(function connect() {
  const port = runtime.connect({ name: 'keepAlive' });
  port.onDisconnect.addListener(connect);
})();
