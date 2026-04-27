/**
 * Mock for expo-modules-core used in tests.
 */
import { vi } from 'vitest';

export const requireNativeModule = vi.fn(() => ({}));

export class UnavailabilityError extends Error {
  public constructor(moduleName: string, propertyName: string) {
    super(`${moduleName}.${propertyName} is not available`);
    this.name = 'UnavailabilityError';
  }
}

export const Platform = { OS: 'web' };

export const EventEmitter = vi.fn().mockImplementation(() => ({
  addListener: vi.fn(),
  removeListeners: vi.fn(),
  emit: vi.fn(),
}));

export const EventSubscription = {};

export default {
  EventEmitter,
  EventSubscription,
  requireNativeModule,
  UnavailabilityError,
  Platform,
};
