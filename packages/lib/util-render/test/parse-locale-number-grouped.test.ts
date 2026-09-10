import { beforeAll, describe, expect, it, vi } from 'vitest';

import * as formatNumber from '../src/format-number';

const RealNumberFormat = Intl.NumberFormat;

// Its own file because the derived separators are cached module-globally under
// the 'default' key on first use, so the device locale cannot be re-pinned once
// anything in a file has formatted. Vitest gives each file a fresh registry.
describe('parseLocaleNumber in a locale that groups only from five digits', () => {
  beforeAll(() => {
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(
      ((_requested?: unknown, options?: Intl.NumberFormatOptions) =>
        new RealNumberFormat(
          'es-ES',
          options,
        )) as unknown as typeof Intl.NumberFormat,
    );
  });

  // This is the level users were affected at. The four-digit probe came back
  // ungrouped, so es-ES derived en-US separators, and parsing "1.234,5" then
  // stripped nothing and yielded "1.2345" instead of "1234.5".
  it('round trips a grouped amount', () => {
    const formatted = new RealNumberFormat('es-ES').format(1234.5);

    expect(Number(formatNumber.parseLocaleNumber(formatted))).toEqual(1234.5);
  });

  it('round trips an amount with two group separators', () => {
    const formatted = new RealNumberFormat('es-ES').format(1234567.5);

    expect(Number(formatNumber.parseLocaleNumber(formatted))).toEqual(
      1234567.5,
    );
  });
});
