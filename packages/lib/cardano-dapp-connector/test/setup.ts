// The upstream tests ran under jest-webextension-mock. webextension-polyfill
// refuses to load outside an extension, so the tests get an in-memory
// storage.local and a runtime id instead.
import { vi } from 'vitest';

const local = new Map<string, unknown>();
const storageLocal = {
  clear: vi.fn(async () => {
    local.clear();
  }),
  get: vi.fn(async (keys?: string[] | string | null) => {
    const wanted =
      keys === undefined || keys === null
        ? [...local.keys()]
        : Array.isArray(keys)
        ? keys
        : [keys];
    return Object.fromEntries(
      wanted.filter(key => local.has(key)).map(key => [key, local.get(key)]),
    );
  }),
  set: vi.fn(async (items: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(items)) local.set(key, value);
  }),
  remove: vi.fn(async (keys: string[] | string) => {
    for (const key of Array.isArray(keys) ? keys : [keys]) local.delete(key);
  }),
};

vi.mock('webextension-polyfill', () => ({
  default: {
    runtime: { id: 'test-extension-id' },
    storage: { local: storageLocal },
  },
  runtime: { id: 'test-extension-id' },
  storage: { local: storageLocal },
}));
