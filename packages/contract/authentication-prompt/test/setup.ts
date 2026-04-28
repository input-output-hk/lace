/**
 * Vitest setup file for authentication-prompt tests.
 * Sets up global mocks for native modules before any tests run.
 */

// Set up globalThis.expo to prevent expo-modules-core errors
// This must be done before any expo modules are imported
(globalThis as unknown as { expo: unknown }).expo = {
  EventEmitter: class EventEmitter {
    public addListener() {
      return { remove: () => {} };
    }
    public removeAllListeners() {}
    public emit() {}
  },
  modules: {},
};
