import type { Logger } from 'ts-log';

export const createStubLogger = (): Logger => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  trace: vi.fn(),
  warn: vi.fn(),
});
