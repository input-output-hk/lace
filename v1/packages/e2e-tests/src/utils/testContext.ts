import { Logger } from '../support/logger';

export class TestContext {
  private context;

  constructor() {
    this.context = new Map();
  }

  has(key: string): boolean {
    return this.context.has(key);
  }

  save<T>(key: string, value: T): void {
    if (this.context.has(key)) {
      throw new Error(`You tried to override "${key}" property. This is not allowed`);
    }
    this.context.set(key, value);
  }

  saveWithOverride<T>(key: string, value: T): void {
    if (this.context.has(key)) {
      this.delete(key);
    }
    this.context.set(key, value);
  }

  load<T>(key: string): T {
    if (this.context.has(key)) {
      return this.context.get(key);
    }
    throw new Error(`You tried to access ${key} property, but it does not exist.`);
  }

  delete(key: string): void {
    if (!this.context.has(key)) {
      Logger.log(`You tried to delete "${key}" property but it does not exist.`);
    }
    this.context.delete(key);
  }

  clearContext(): void {
    this.context.clear();
  }
}

export default new TestContext();
