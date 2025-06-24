Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

if (!chrome.runtime) chrome.runtime = {};
if (!chrome.runtime.id) chrome.runtime.id = 'history-delete';

// globally mock, unmock in the specific file test
jest.mock('@src/utils/pgp', () => {});

// required for @pdfme compatability
const { TextDecoder, TextEncoder } = require('util');
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Add WebCrypto API polyfill, required for openpgp.js
const { webcrypto } = require('node:crypto');
if (typeof global.crypto === 'undefined') {
  global.crypto = webcrypto;
}

// Add Uint8Array to prototype chain of Buffer, so that it behaves the same in jsdom as in nodejs and polyfilled browser env
let Type = Buffer;
while (Type.prototype) Type = Type.prototype;
Object.setPrototypeOf(Type, Uint8Array.prototype);
