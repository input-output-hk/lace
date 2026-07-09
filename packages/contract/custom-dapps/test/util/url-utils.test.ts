import { describe, expect, it } from 'vitest';

import {
  deriveDappNameFromUrl,
  getFaviconUrl,
  isExplicitHttpUrl,
  normalizeUrlForId,
  tryParseExternalUrl,
} from '../../src/util/url-utils';

describe('isExplicitHttpUrl', () => {
  it.each([
    ['http://example.com', true],
    ['HTTP://example.com', true],
    ['  http://example.com  ', true],
    ['https://example.com', false],
    ['example.com', false],
    ['', false],
    ['not a url', false],
  ])('%j → %s', (input, expected) => {
    expect(isExplicitHttpUrl(input)).toBe(expected);
  });
});

describe('tryParseExternalUrl', () => {
  it('rejects explicit http URLs', () => {
    expect(tryParseExternalUrl('http://example.com')).toBeUndefined();
  });

  it('rejects empty / whitespace input', () => {
    expect(tryParseExternalUrl('')).toBeUndefined();
    expect(tryParseExternalUrl('   ')).toBeUndefined();
  });

  it('rejects inputs containing whitespace', () => {
    expect(tryParseExternalUrl('example.com /path')).toBeUndefined();
    expect(tryParseExternalUrl('https://example .com')).toBeUndefined();
  });

  it('accepts bare hostnames and upgrades to https', () => {
    expect(tryParseExternalUrl('example.com')).toBe('https://example.com/');
  });

  it('accepts explicit https URLs as-is (normalized by URL)', () => {
    expect(tryParseExternalUrl('https://example.com')).toBe(
      'https://example.com/',
    );
  });

  it('rejects hostnames without a dot', () => {
    expect(tryParseExternalUrl('localhost')).toBeUndefined();
    expect(tryParseExternalUrl('https://localhost')).toBeUndefined();
  });

  it('rejects malformed URLs', () => {
    expect(tryParseExternalUrl('https://')).toBeUndefined();
    expect(tryParseExternalUrl('://broken')).toBeUndefined();
  });

  it('preserves paths and query strings', () => {
    expect(tryParseExternalUrl('example.com/path?q=1')).toBe(
      'https://example.com/path?q=1',
    );
  });
});

describe('normalizeUrlForId', () => {
  it('strips the trailing slash', () => {
    expect(normalizeUrlForId('https://example.com/')).toBe(
      'https://example.com',
    );
  });

  it('drops the hash fragment', () => {
    expect(normalizeUrlForId('https://example.com/path#section')).toBe(
      'https://example.com/path',
    );
  });

  it('keeps the query string', () => {
    expect(normalizeUrlForId('https://example.com/?q=1')).toBe(
      'https://example.com/?q=1',
    );
  });

  it('returns the input unchanged for invalid URLs', () => {
    expect(normalizeUrlForId('not a url')).toBe('not a url');
  });
});

describe('deriveDappNameFromUrl', () => {
  it('returns the hostname without the leading www.', () => {
    expect(deriveDappNameFromUrl('https://www.example.com/foo')).toBe(
      'example.com',
    );
  });

  it('returns the hostname unchanged when no www. prefix', () => {
    expect(deriveDappNameFromUrl('https://example.com')).toBe('example.com');
  });

  it('returns the input unchanged for invalid URLs', () => {
    expect(deriveDappNameFromUrl('not a url')).toBe('not a url');
  });
});

describe('getFaviconUrl', () => {
  it('returns origin + /favicon.ico for valid URLs', () => {
    expect(getFaviconUrl('https://example.com/path?q=1')).toBe(
      'https://example.com/favicon.ico',
    );
  });

  it('returns undefined for invalid URLs', () => {
    expect(getFaviconUrl('not a url')).toBeUndefined();
  });
});
