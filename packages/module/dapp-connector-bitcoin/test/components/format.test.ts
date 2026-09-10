import { describe, expect, it } from 'vitest';

import {
  formatSats,
  formatSignedSatsAsBtc,
  truncateAddress,
} from '../../src/components/format';

/**
 * Strips every non-digit character so a toLocaleString()-formatted number
 * can be asserted on without depending on the runtime's default locale for
 * its thousands or decimal separator.
 */
const digitsOnly = (text: string): string => text.replace(/\D/g, '');

describe('truncateAddress', () => {
  it('returns the address unchanged when at the passthrough threshold', () => {
    const address = 'a'.repeat(19);

    expect(truncateAddress(address)).toBe(address);
  });

  it('truncates an address one character past the passthrough threshold', () => {
    const address = 'b'.repeat(20);

    expect(truncateAddress(address)).toBe(
      `${'b'.repeat(8)}...${'b'.repeat(8)}`,
    );
  });

  it('shows only the first and last characters for a long address', () => {
    const address =
      'bc1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

    expect(truncateAddress(address)).toBe('bc1qxxxx...xxxxxxxx');
  });

  it('honors custom prefix and suffix lengths', () => {
    const address = 'c'.repeat(30);

    expect(truncateAddress(address, 4, 6)).toBe(
      `${'c'.repeat(4)}...${'c'.repeat(6)}`,
    );
  });
});

describe('formatSats', () => {
  it('formats a small value with no grouping needed', () => {
    expect(formatSats(42)).toBe('42');
  });

  it('formats zero', () => {
    expect(formatSats(0)).toBe('0');
  });

  it('preserves the digits of a large value regardless of the grouping separator', () => {
    expect(digitsOnly(formatSats(1_234_567))).toBe('1234567');
  });
});

describe('formatSignedSatsAsBtc', () => {
  it('signs a positive amount and preserves its digits regardless of the decimal separator', () => {
    const formatted = formatSignedSatsAsBtc(150_000);

    expect(formatted.startsWith('+')).toBe(true);
    expect(digitsOnly(formatted)).toBe('00015');
  });

  it('signs a negative amount and preserves its digits regardless of the decimal separator', () => {
    const formatted = formatSignedSatsAsBtc(-150_000);

    expect(formatted.startsWith('-')).toBe(true);
    expect(digitsOnly(formatted)).toBe('00015');
  });

  it('signs zero as positive', () => {
    const formatted = formatSignedSatsAsBtc(0);

    expect(formatted.startsWith('+')).toBe(true);
    expect(digitsOnly(formatted)).toBe('00');
  });
});
