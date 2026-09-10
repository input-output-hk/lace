import { vi } from 'vitest';

const RealNumberFormat = Intl.NumberFormat;
const realNumberToLocaleString = Number.prototype.toLocaleString;

/**
 * Pins the locale used when a caller requests none, so assertions on formatted
 * numbers do not follow the machine's `LC_ALL`. An explicitly requested locale
 * is still honoured.
 *
 * Covers both routes a formatter can take, `Intl.NumberFormat` and
 * `Number.prototype.toLocaleString`, because pinning only the former leaves
 * every direct `toLocaleString` caller locale-dependent.
 *
 * Call from a vitest `setupFiles` entry: separators are commonly derived once
 * and cached for the lifetime of a module, so this has to run before any test
 * file formats anything.
 */
export const pinDefaultNumberLocale = (locale = 'en-US'): void => {
  vi.spyOn(Intl, 'NumberFormat').mockImplementation(
    ((requested?: string[] | string, options?: Intl.NumberFormatOptions) =>
      new RealNumberFormat(
        requested ?? locale,
        options,
      )) as unknown as typeof Intl.NumberFormat,
  );

  vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (
    this: number,
    requested?: Intl.LocalesArgument,
    options?: Intl.NumberFormatOptions,
  ) {
    return realNumberToLocaleString.call(this, requested ?? locale, options);
  });
};
