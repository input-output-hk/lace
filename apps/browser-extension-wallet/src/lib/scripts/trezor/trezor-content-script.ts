import { runtime } from 'webextension-polyfill';
import { AllowedOrigins } from './types';

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
  if (event.origin !== AllowedOrigins.TREZOR_CONNECT) throw new Error('Origin not allowed');
  if (port && event.source === window && event.data) {
    port.postMessage({ data: event.data });
  }
});
