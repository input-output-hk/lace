import { pinDefaultNumberLocale } from '@lace-lib/util-dev';
import { vi } from 'vitest';

// These suites assert formatted separators, so the default locale is pinned.
pinDefaultNumberLocale();

// Provide navigator if missing (ex: in node env)
if (typeof navigator === 'undefined') {
  // @ts-expect-error allow creating navigator in node env
  globalThis.navigator = {};
}

Object.defineProperty(navigator, 'permissions', {
  value: {
    query: vi.fn(),
  },
  configurable: true,
  writable: true,
});

Object.defineProperty(navigator, 'clipboard', {
  value: {
    readText: vi.fn().mockResolvedValue('mock clipboard text'),
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  configurable: true,
  writable: true,
});
