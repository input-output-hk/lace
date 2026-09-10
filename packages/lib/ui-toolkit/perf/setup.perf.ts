/**
 * Shared setup for the Reassure perf tests (jest.perf.config.js).
 * Mirrors test/setup (Vitest) with Jest idioms: useTranslation backed by the
 * real English copy so t(key) renders production strings. ui-toolkit reads
 * useTranslation from @lace-contract/i18n, which re-exports react-i18next, so
 * mocking react-i18next covers it transitively.
 */
import { configure } from 'reassure';

// Namespace import (not default): the island's babel JSON interop exposes the
// keys on the namespace object. The `mock` prefix lets jest.mock's hoisted
// factory reference it.
// eslint-disable-next-line @nx/enforce-module-boundaries
import * as mockEnJson from '../../../contract/i18n/src/translations/en.json';

jest.mock('react-i18next', () => {
  const enMessages = mockEnJson as unknown as Record<string, string>;
  return {
    useTranslation: () => ({
      t: (key: string, options?: Record<string, number | string>): string => {
        const base = enMessages[key] ?? key;
        if (!options) return base;
        return Object.entries(options).reduce(
          (accumulator, [k, v]) => accumulator.replace(`{{${k}}}`, String(v)),
          base,
        );
      },
    }),
  };
});

configure({ testingLibrary: 'react-native' });
