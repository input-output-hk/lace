import { runtime } from 'webextension-polyfill';

// Communicate from background script to popup
let port = runtime.connect({ name: 'trezor-connect' });
port.onMessage.addListener((message) => {
  window.postMessage(message, window.location.origin);
});
port.onDisconnect.addListener(() => {
  // eslint-disable-next-line unicorn/no-null
  port = null;
});

// communicate from popup to background script
window.addEventListener('message', (event) => {
  if (port && event.source === window && event.data) {
    port.postMessage({ data: event.data });
  }
});
