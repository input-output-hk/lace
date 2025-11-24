Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Add Uint8Array to prototype chain of Buffer, so that it behaves the same in jsdom as in nodejs and polyfilled browser env
let Type = Buffer;
while (Type.prototype) Type = Type.prototype;
Object.setPrototypeOf(Type, Uint8Array.prototype);
