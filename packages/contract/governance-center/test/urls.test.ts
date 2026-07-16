import { describe, expect, it } from 'vitest';

import { toExternalUrl, toHttpImageUrl } from '../src/urls';

describe('toExternalUrl', () => {
  it('upgrades a scheme-less uri to https', () => {
    expect(toExternalUrl('www.example.com')).toBe('https://www.example.com');
    expect(toExternalUrl('example.com/path?q=1')).toBe(
      'https://example.com/path?q=1',
    );
  });

  it('passes http, https and mailto uris through unchanged', () => {
    expect(toExternalUrl('http://example.com')).toBe('http://example.com');
    expect(toExternalUrl('https://example.com')).toBe('https://example.com');
    expect(toExternalUrl('HTTPS://example.com')).toBe('HTTPS://example.com');
    expect(toExternalUrl('mailto:drep@example.com')).toBe(
      'mailto:drep@example.com',
    );
  });

  it('rejects dangerous schemes from attacker-controlled metadata', () => {
    expect(toExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(toExternalUrl('JavaScript:alert(1)')).toBeUndefined();
    expect(toExternalUrl('file:///etc/passwd')).toBeUndefined();
    expect(toExternalUrl('intent://scan')).toBeUndefined();
    expect(toExternalUrl('data:text/html,<script>')).toBeUndefined();
  });
});

describe('toHttpImageUrl', () => {
  it('passes http and https image urls through unchanged', () => {
    expect(toHttpImageUrl('http://cdn.example.com/a.png')).toBe(
      'http://cdn.example.com/a.png',
    );
    expect(toHttpImageUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
    expect(toHttpImageUrl('HTTPS://cdn.example.com/a.png')).toBe(
      'HTTPS://cdn.example.com/a.png',
    );
  });

  it('returns undefined for undefined input', () => {
    expect(toHttpImageUrl(undefined)).toBeUndefined();
  });

  it('rejects non-http(s) schemes and scheme-less values', () => {
    expect(toHttpImageUrl('data:image/png;base64,AAAA')).toBeUndefined();
    expect(toHttpImageUrl('file:///etc/passwd')).toBeUndefined();
    expect(toHttpImageUrl('javascript:alert(1)')).toBeUndefined();
    expect(toHttpImageUrl('cdn.example.com/a.png')).toBeUndefined();
    expect(toHttpImageUrl('//cdn.example.com/a.png')).toBeUndefined();
  });
});
