import type { NotificationsStorage } from '../src/types';

/**
 * In-memory storage implementation for testing.
 * Provides simple Map-based storage that mimics async storage operations.
 */
export class MockStorage implements NotificationsStorage {
  private readonly store = new Map<string, unknown>();

  constructor(userId?: string) {
    if (userId) this.store.set('notifications:userId', userId);
  }

  getItem<T>(key: string): Promise<T | undefined> {
    return Promise.resolve(this.store.get(key) as T | undefined);
  }

  setItem<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);

    return Promise.resolve();
  }

  removeItem(key: string): Promise<void> {
    this.store.delete(key);

    return Promise.resolve();
  }

  /**
   * Test helper: Clear all stored data
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Test helper: Get all stored keys
   */
  keys(): string[] {
    return [...this.store.keys()];
  }

  /**
   * Test helper: Get raw store for inspection
   */
  getStore(): Map<string, unknown> {
    return new Map(this.store);
  }
}
