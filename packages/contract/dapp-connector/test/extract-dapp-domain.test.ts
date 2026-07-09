import { describe, expect, it } from 'vitest';

import { extractDappDomain } from '../src/extract-dapp-domain';

describe('extractDappDomain', () => {
  it('returns the hostname for a normal https origin', () => {
    expect(extractDappDomain('https://app.minswap.org')).toBe(
      'app.minswap.org',
    );
  });

  it('strips scheme, port, path, and query', () => {
    expect(
      extractDappDomain('https://app.minswap.org:8080/swap?ref=foo#bar'),
    ).toBe('app.minswap.org');
  });

  it('returns "unknown" when URL parsing fails', () => {
    expect(extractDappDomain('not-a-url')).toBe('unknown');
    expect(extractDappDomain('')).toBe('unknown');
  });
});
