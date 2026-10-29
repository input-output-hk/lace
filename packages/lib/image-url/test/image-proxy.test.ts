import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { isProxiedImageUrl, proxyImageUrl } from '../src';

// imgproxy's own documentation example key/salt; the expected signatures below
// were computed independently with node's crypto HMAC-SHA256.
//
// ADR 42 SHARED VECTORS — pinned IDENTICALLY in
// apps/lace-extension-shell/test/image-proxy.test.ts. The host cannot import
// this package (its closure admits only its vendored libs, ADR 37), so the
// equality of those two literal sets is the only thing holding the duplicated
// rules in step: change the escaping or the signing in either copy and exactly
// one of the two suites goes red.
const CONFIG = {
  url: 'https://proxy.example',
  key: '943b421c9eb07c830af81030552c86009268de4e532ba2ee2eab8247c6da0881',
  salt: '520f986b998545b4785e0defbc4f3c1203f22de2374a3d53cb7a7fe9fea309c5',
};

const referenceSignature = (path: string): string =>
  createHmac('sha256', Buffer.from(CONFIG.key, 'hex'))
    .update(Buffer.concat([Buffer.from(CONFIG.salt, 'hex'), Buffer.from(path)]))
    .digest('base64url');

describe('proxyImageUrl', () => {
  it('signs the plain path with HMAC-SHA256(salt + path)', () => {
    expect(proxyImageUrl('https://example.com/a.png', CONFIG)).toBe(
      'https://proxy.example/pyUdTEB8e8f8WfMRnS5PINcfvrHrBlA1lh4CEcyx07Q/rs:fit:1024:1024/plain/https%3A%2F%2Fexample.com%2Fa.png@webp',
    );
  });

  it('strips a trailing slash from the configured origin', () => {
    expect(
      proxyImageUrl('https://example.com/a.png', {
        ...CONFIG,
        url: 'https://proxy.example/',
      }),
    ).toBe(
      'https://proxy.example/pyUdTEB8e8f8WfMRnS5PINcfvrHrBlA1lh4CEcyx07Q/rs:fit:1024:1024/plain/https%3A%2F%2Fexample.com%2Fa.png@webp',
    );
  });

  it('escapes the chars that break plain-path parsing (% ? @), signing what it emits', () => {
    expect(
      proxyImageUrl('https://cdn.example/a.png?token=x@y&pct=100%done', CONFIG),
    ).toBe(
      'https://proxy.example/Bz0tniMwiEGI30esi7bPKsn1jsB3Dggv9orsMOReS5k/rs:fit:1024:1024/plain/https%3A%2F%2Fcdn.example%2Fa.png%3Ftoken%3Dx%40y%26pct%3D100%25done@webp',
    );
  });

  it('escapes a fragment, which the browser would otherwise drop before the request', () => {
    expect(proxyImageUrl('https://cdn.example/a.png#hero', CONFIG)).toContain(
      '/plain/https%3A%2F%2Fcdn.example%2Fa.png%23hero@webp',
    );
  });

  // The signature covers the path we emit, so a url the browser re-encodes on
  // the way out would arrive at the proxy as a different path and 403.
  it.each([
    ['a space', 'https://cdn.example/my art.png', 'my%20art.png'],
    ['non-ascii', 'https://cdn.example/caf\u00e9.png', 'caf%C3%A9.png'],
    ['a quote', 'https://cdn.example/a"b.png', 'a%22b.png'],
    ['angle brackets', 'https://cdn.example/a<b>.png', 'a%3Cb%3E.png'],
    ['a backslash', 'https://cdn.example/a\\b.png', 'a%5Cb.png'],
  ])(
    'percent-encodes %s the way the browser would',
    (_name, source, encoded) => {
      expect(proxyImageUrl(source, CONFIG)).toContain(
        `/plain/https%3A%2F%2Fcdn.example%2F${encoded}@webp`,
      );
    },
  );

  it("keeps an already-encoded source intact through the proxy's one decode", () => {
    const proxied = proxyImageUrl('https://cdn.example/a%20b.png', CONFIG);
    expect(proxied).toContain(
      '/plain/https%3A%2F%2Fcdn.example%2Fa%2520b.png@webp',
    );
    // What imgproxy decodes the plain path to is the url we were given.
    expect(decodeURIComponent(proxied.split('/plain/')[1].slice(0, -5))).toBe(
      'https://cdn.example/a%20b.png',
    );
  });

  // encodeURIComponent throws on a lone surrogate, which mint metadata can carry. There
  // is no path to sign for such a url, so it must not become a proxy url.
  it('bypasses a url that cannot be encoded', () => {
    const lone = 'https://cdn.example/\uD800.png';
    expect(proxyImageUrl(lone, CONFIG)).toBe(lone);
  });

  it('leaves an already-proxied url alone', () => {
    const proxied = proxyImageUrl('https://example.com/a.png', CONFIG);
    expect(proxyImageUrl(proxied, CONFIG)).toBe(proxied);
  });

  it.each(['svg', 'jpg', 'gif'])(
    'requests bounded WebP output for %s sources',
    extension => {
      const proxied = new URL(
        proxyImageUrl(`https://example.com/logo.${extension}`, CONFIG),
      );
      expect(proxied.pathname.split('/').slice(2)).toEqual([
        'rs:fit:1024:1024',
        'plain',
        `https%3A%2F%2Fexample.com%2Flogo.${extension}@webp`,
      ]);
    },
  );

  it.each([
    '/raw:1/plain/https://evil.test/logo.svg',
    '/raw:1/plain/https%3A%2F%2Fevil.test%2Flogo.svg@png',
    '/f:svg/plain/https%3A%2F%2Fevil.test%2Flogo.svg',
    '/plain/https%3A%2F%2Fevil.test%2Flogo.svg@svg',
    '/plain/https%3A%2F%2Fevil.test%2Flogo.svg',
    '/plain/https://evil.test/logo.svg@png',
    '/plain/https%3A%2F%2Fevil.test%2Flogo.svg@png',
    '/plain/https%3A%2F%2Fevil.test%2Flogo.svg@webp',
    '/rs:fit:2048:2048/plain/https%3A%2F%2Fevil.test%2Flogo.svg@webp',
    '/rs:fit:1024:1024/raw:1/plain/https%3A%2F%2Fevil.test%2Flogo.svg@webp',
    '/rs:fit:1024:1024/dpr:2/plain/https%3A%2F%2Fevil.test%2Flogo.svg@webp',
  ])('normalizes a validly signed unsafe proxy path: %s', path => {
    const unsafe = `${CONFIG.url}/${referenceSignature(path)}${path}`;
    expect(isProxiedImageUrl(unsafe, CONFIG)).toBe(false);
    const normalized = proxyImageUrl(unsafe, CONFIG);
    expect(normalized).not.toBe(unsafe);
    expect(isProxiedImageUrl(normalized, CONFIG)).toBe(true);
    expect(
      decodeURIComponent(normalized.split('/plain/')[1].slice(0, -5)),
    ).toBe(unsafe);
    expect(proxyImageUrl(normalized, CONFIG)).toBe(normalized);
  });

  it.each([
    'https://example.com/art/../logo.png',
    'https://example.com/./logo.png',
    'https://example.com/art/%2e%2e/logo.png',
    'https://example.com/../../logo.png',
    'https://example.com/art/..',
  ])('keeps the signature valid after browser parsing: %s', source => {
    const emitted = proxyImageUrl(source, CONFIG);
    const parsed = new URL(emitted);
    expect(parsed.href).toBe(emitted);
    const [, signature, ...segments] = parsed.pathname.split('/');
    expect(signature).toBe(referenceSignature(`/${segments.join('/')}`));
    expect(decodeURIComponent(segments[2].slice(0, -5))).toBe(source);
  });

  // A credential is build-time config, and signing runs inside render — so a
  // malformed one must bypass, not throw a cosmetic image into an error
  // boundary. A secret that picked up a trailing newline is the realistic case.
  it.each([
    ['a non-hex key', { ...CONFIG, key: 'not-hex!!' }],
    ['an odd-length key', { ...CONFIG, key: 'abc' }],
    ['a whitespace-only salt', { ...CONFIG, salt: '   ' }],
  ])('bypasses the proxy given %s', (_name, config) => {
    expect(proxyImageUrl('https://example.com/a.png', config)).toBe(
      'https://example.com/a.png',
    );
  });

  // ...but whitespace AROUND a good credential is a configured proxy.
  it('trims the credentials, so a trailing newline still signs', () => {
    expect(
      proxyImageUrl('https://example.com/a.png', {
        url: `${CONFIG.url}\n`,
        key: `${CONFIG.key}\n`,
        salt: ` ${CONFIG.salt} `,
      }),
    ).toBe(proxyImageUrl('https://example.com/a.png', CONFIG));
  });

  // The deployed proxy answers unsigned requests with 403, so a partially
  // configured build must load images directly instead of emitting dead urls.
  it.each([
    ['no config at all', {}],
    ['no origin', { key: CONFIG.key, salt: CONFIG.salt }],
    ['no key', { url: CONFIG.url, salt: CONFIG.salt }],
    ['no salt', { url: CONFIG.url, key: CONFIG.key }],
    ['an empty origin', { ...CONFIG, url: '' }],
  ])('bypasses the proxy with %s', (_name, config) => {
    expect(proxyImageUrl('https://example.com/a.png', config)).toBe(
      'https://example.com/a.png',
    );
  });
});

describe('isProxiedImageUrl', () => {
  it('recognizes a url on the configured origin', () => {
    expect(
      isProxiedImageUrl(
        proxyImageUrl('https://example.com/a.png', CONFIG),
        CONFIG,
      ),
    ).toBe(true);
  });

  it.each([
    ['a remote source url', 'https://example.com/a.png'],
    [
      'a look-alike origin',
      'https://proxy.example.evil/sig/plain/https://x/a.png',
    ],
    ['a data uri', 'data:image/png;base64,iVBORw0KGgo'],
  ])('does not recognize %s', (_name, url) => {
    expect(isProxiedImageUrl(url, CONFIG)).toBe(false);
  });

  it('recognizes nothing when no origin is configured', () => {
    expect(isProxiedImageUrl('https://example.com/a.png', {})).toBe(false);
  });

  it('rejects query strings, alternate formats and origin lookalikes', () => {
    const proxied = proxyImageUrl('https://example.com/a.svg', CONFIG);
    for (const unsafe of [
      `${proxied}?raw=1`,
      `${proxied}@svg`,
      proxied.replace('@webp', '@svg'),
      proxied.replace('proxy.example/', 'proxy.example.evil/'),
      proxied.replace('proxy.example/', 'proxy.example@evil.test/'),
    ]) {
      expect(isProxiedImageUrl(unsafe, CONFIG)).toBe(false);
    }
  });
});
