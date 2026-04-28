import type {
  AppContext,
  BreadcrumbData,
  ErrorContext,
  LogLevel,
  ObservabilityProvider,
  UserContext,
} from '../types';

export class NoOpProvider implements ObservabilityProvider {
  public captureMessage(_message: string, _level?: LogLevel): void {}
  public captureException(_error: Error, _context?: ErrorContext): void {}
  public addBreadcrumb(_breadcrumb: BreadcrumbData): void {}
  public setUser(_user: UserContext): void {}
  public setTag(_key: string, _value: string): void {}
  public setContext(_key: string, _context: AppContext): void {}
  public withScope<T>(callback: (scope: unknown) => T): T {
    return callback({});
  }
  public initialize(_config: unknown): void {}
}
