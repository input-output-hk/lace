/**
 * Mock for expo-modules-core used in tests.
 * This avoids loading the actual native module which requires expo runtime.
 */

export class EventEmitter {
  public addListener() {
    return { remove: () => {} };
  }
  public removeAllListeners() {}
  public emit() {}
}

export const NativeModulesProxy = {};

export const requireNativeModule = () => ({});

export const requireOptionalNativeModule = () => null;

export const requireNativeViewManager = () => ({});

// For legacy compatibility
export default {
  EventEmitter,
  NativeModulesProxy,
  requireNativeModule,
  requireOptionalNativeModule,
  requireNativeViewManager,
};
