import { describe, expect, it } from 'vitest';

import { isDataUri, isSafeRasterDataUri } from '../src';

// The rule whose failure mode is code execution (audit M-301), so it is tested
// here rather than only through each surface that consumes it.
describe('isSafeRasterDataUri', () => {
  it.each([
    ['png', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'],
    ['jpeg', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ'],
    ['jpg', 'data:image/jpg;base64,/9j/4AAQSkZJRgABAQ'],
    ['gif', 'data:image/gif;base64,R0lGODlhAQABAAAAACw='],
    ['webp', 'data:image/webp;base64,UklGRh4AAABXRUJQ'],
    ['avif', 'data:image/avif;base64,AAAAIGZ0eXBhdmlm'],
    ['bmp', 'data:image/bmp;base64,Qk1GAAAA'],
    ['a comma separator', 'data:image/png,rawbytes'],
    ['upper-case scheme and type', 'DATA:IMAGE/PNG;base64,iVBORw0KGgo'],
  ])('allows %s', (_name, uri) => {
    expect(isSafeRasterDataUri(uri)).toBe(true);
  });

  it.each([
    ['svg+xml', 'data:image/svg+xml,<svg onload="alert(1)"></svg>'],
    ['base64 svg+xml', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
    ['mixed-case svg', 'Data:image/SVG+XML;base64,PHN2Zz48L3N2Zz4='],
    ['percent-encoded svg+xml', 'data:image/svg%2bxml,<svg></svg>'],
    ['bare svg', 'data:image/svg;base64,PHN2Zz4='],
    ['html', 'data:text/html,<script>alert(1)</script>'],
    [
      'a media type that only starts with an allowed one',
      'data:image/pngx,AAA',
    ],
    ['no media type at all', 'data:,hello'],
  ])('refuses %s', (_name, uri) => {
    expect(isSafeRasterDataUri(uri)).toBe(false);
  });
});

describe('isDataUri', () => {
  it.each([
    ['a raster data uri', 'data:image/png;base64,AAA'],
    ['an svg data uri', 'data:image/svg+xml,<svg/>'],
    ['a non-image data uri', 'data:text/html,x'],
    ['an upper-case scheme', 'DATA:image/png;base64,AAA'],
  ])(
    'recognizes %s, so it cannot reach a generic-scheme passthrough',
    (_name, uri) => {
      expect(isDataUri(uri)).toBe(true);
    },
  );

  it.each([
    ['an https url', 'https://example.com/a.png'],
    ['a bundled asset path', '/expo/assets/logo.png'],
    ['bare base64 bytes', 'iVBORw0KGgoAAAANSUhEUgAAAAUA'],
    ['a scheme that merely contains data', 'metadata:image/png'],
  ])('does not recognize %s', (_name, uri) => {
    expect(isDataUri(uri)).toBe(false);
  });
});
