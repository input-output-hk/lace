import { describe, expect, it, vi } from 'vitest';

const loadImageFormatModule = async (isWeb: boolean) => {
  vi.resetModules();
  vi.doMock('../../../src/design-system/util/commons', () => ({ isWeb }));

  return await import('../../../src/design-system/util/image-format');
};

describe('getWebIpfsFallbackSource', () => {
  it('returns null when not running on web', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(false);
    expect(
      getWebIpfsFallbackSource(
        'https://some.gateway/ipfs/bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu',
      ),
    ).toBeNull();
  });

  it('returns null for undefined input', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(true);
    expect(getWebIpfsFallbackSource(undefined)).toBeNull();
  });

  it('returns null when it already uses the built-in gateway', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(true);
    const uri =
      'https://ipfs.blockfrost.dev/ipfs/bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu';
    expect(getWebIpfsFallbackSource(uri)).toBeNull();
  });

  it('returns null when it does not contain an /ipfs/<cid> segment', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(true);
    const uri =
      'https://example.com/not-ipfs/bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu';
    expect(getWebIpfsFallbackSource(uri)).toBeNull();
  });

  it('returns a built-in-gateway ImageSource on web for /ipfs/<cid> urls', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(true);
    const uri =
      'https://some.gateway/ipfs/bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu';
    expect(getWebIpfsFallbackSource(uri)).toEqual({
      uri: 'https://ipfs.blockfrost.dev/ipfs/bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu',
    });
  });

  it('keeps only the CID in the retry ImageSource', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(true);
    const uri =
      'https://some.gateway/ipfs/bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu/metadata.json?foo=bar#baz';
    expect(getWebIpfsFallbackSource(uri)).toEqual({
      uri: 'https://ipfs.blockfrost.dev/ipfs/bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu',
    });
  });
});

describe('getAssetImageUrl', () => {
  it('returns undefined for undefined input', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    expect(getAssetImageUrl(undefined)).toBeUndefined();
  });

  it('returns http(s) urls as-is when no proxy is configured', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    expect(getAssetImageUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png',
    );
  });

  it('returns data:image/* urls as-is', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    const uri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
    expect(getAssetImageUrl(uri)).toBe(uri);
  });

  it('rewrites ipfs:// URIs using the gateway on web', async () => {
    const { configureImageFormat, getAssetImageUrl } =
      await loadImageFormatModule(true);
    configureImageFormat({ webIpfsGatewayUrl: 'https://ipfs.blockfrost.dev' });
    expect(
      getAssetImageUrl(
        'ipfs://bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu',
      ),
    ).toBe(
      'https://ipfs.blockfrost.dev/ipfs/bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu',
    );
  });

  it('falls back to the built-in gateway when no gateway was configured', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(false);
    expect(
      getAssetImageUrl(
        'ipfs://bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu',
      ),
    ).toBe(
      'https://ipfs.blockfrost.dev/ipfs/bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu',
    );
  });

  it('returns uri-scheme paths as-is (e.g. file:, chrome-extension:)', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    expect(getAssetImageUrl('file:///var/mobile/Containers/a.png')).toBe(
      'file:///var/mobile/Containers/a.png',
    );
    expect(
      getAssetImageUrl('chrome-extension://abc123/expo/assets/logo.png'),
    ).toBe('chrome-extension://abc123/expo/assets/logo.png');
  });

  it('returns Expo web asset paths as-is (prevents invalid data:image/*;base64,/expo/assets/... urls)', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    expect(
      getAssetImageUrl(
        '/expo/assets/__packages/module/dapp-explorer/src/static/assets/toolheads.48616338.png',
      ),
    ).toBe(
      '/expo/assets/__packages/module/dapp-explorer/src/static/assets/toolheads.48616338.png',
    );
  });

  it('wraps raw base64 payloads into data URIs', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    expect(getAssetImageUrl('iVBORw0KGgoAAAANSUhEUgAAAAUA', 'png')).toBe(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
    );
    // common jpeg base64 prefix starts with "/9j/"
    expect(getAssetImageUrl('/9j/4AAQSkZJRgABAQAAAQABAAD', 'jpeg')).toBe(
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD',
    );
  });

  describe('SVG rejection (NWL R1 audit M-301)', () => {
    it('rejects base64 SVG data URIs, falling through to the icon fallback', async () => {
      const { getAssetImageUrl } = await loadImageFormatModule(true);
      expect(
        getAssetImageUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='),
      ).toBeUndefined();
    });

    it('rejects utf8 SVG data URIs carrying markup', async () => {
      const { getAssetImageUrl } = await loadImageFormatModule(true);
      expect(
        getAssetImageUrl('data:image/svg+xml,<svg onload="alert(1)"></svg>'),
      ).toBeUndefined();
    });

    it('still returns raster data URIs (png/jpeg) verbatim', async () => {
      const { getAssetImageUrl } = await loadImageFormatModule(true);
      const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
      expect(getAssetImageUrl(png)).toBe(png);
    });

    it('refuses to wrap raw base64 bytes as an SVG media type', async () => {
      const { getAssetImageUrl } = await loadImageFormatModule(true);
      expect(getAssetImageUrl('PHN2Zz48L3N2Zz4=', 'svg+xml')).toBeUndefined();
    });

    it('rejects mixed-case data: SVG URIs (the scheme is case-insensitive)', async () => {
      const { getAssetImageUrl } = await loadImageFormatModule(true);
      expect(
        getAssetImageUrl('Data:image/svg+xml,<svg onload="alert(1)"></svg>'),
      ).toBeUndefined();
      expect(
        getAssetImageUrl('DATA:image/SVG+XML;base64,PHN2Zz48L3N2Zz4='),
      ).toBeUndefined();
    });

    it('rejects percent-encoded and alternate SVG MIME spellings', async () => {
      const { getAssetImageUrl } = await loadImageFormatModule(true);
      expect(
        getAssetImageUrl('data:image/svg%2bxml,<svg></svg>'),
      ).toBeUndefined();
      expect(
        getAssetImageUrl('data:image/svg;base64,PHN2Zz4='),
      ).toBeUndefined();
    });

    it('rejects non-image data: URIs (only raster image types are allowlisted)', async () => {
      const { getAssetImageUrl } = await loadImageFormatModule(true);
      expect(
        getAssetImageUrl('data:text/html,<script>alert(1)</script>'),
      ).toBeUndefined();
    });

    it('allows raster data URIs regardless of scheme casing', async () => {
      const { getAssetImageUrl } = await loadImageFormatModule(true);
      const gif = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
      expect(getAssetImageUrl(gif)).toBe(gif);
      const webp = 'Data:image/webp;base64,UklGRh4AAABXRUJQ';
      expect(getAssetImageUrl(webp)).toBe(webp);
    });
  });
});

describe('getAssetImageUrl IPFS resolution', () => {
  // A real CIDv1, from the LW-15013 proxy example.
  const CID = 'bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu';

  it.each([
    ['the ipfs:// scheme', `ipfs://${CID}`, CID],
    ['a bare CID', CID, CID],
    [
      'a bare CID path',
      `${CID}/no-time-to-explain.jpeg`,
      `${CID}/no-time-to-explain.jpeg`,
    ],
  ])('resolves %s onto the built-in gateway', async (_name, image, cidPath) => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    expect(getAssetImageUrl(image)).toBe(
      `https://ipfs.blockfrost.dev/ipfs/${cidPath}`,
    );
  });

  it('resolves onto the configured gateway when an app sets one', async () => {
    const { configureImageFormat, getAssetImageUrl } =
      await loadImageFormatModule(true);
    configureImageFormat({ webIpfsGatewayUrl: 'https://my.gateway/ipfs/' });
    expect(getAssetImageUrl(`ipfs://${CID}`)).toBe(
      `https://my.gateway/ipfs/${CID}`,
    );
  });

  // A url that already names a gateway is an ordinary http url. Rewriting it
  // onto ours would break an image that loads today, so it is left as it is
  // (and proxied like any other remote url when a proxy is configured).
  it.each([
    ['a third-party gateway url', `https://ipfs.io/ipfs/${CID}`],
    [
      "blockfrost's nested gateway path",
      `https://ipfs.blockfrost.io/api/v0/ipfs/gateway/${CID}`,
    ],
  ])('leaves %s untouched', async (_name, image) => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    expect(getAssetImageUrl(image)).toBe(image);
  });

  it('leaves a protocol-less non-CID string untouched (not treated as IPFS)', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    expect(getAssetImageUrl('not-a-cid', 'png')).toBe(
      'data:image/png;base64,not-a-cid',
    );
  });

  it('does not read a raw base64 payload as a bare CID', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    const payload = 'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQ';
    expect(getAssetImageUrl(payload, 'png')).toBe(
      `data:image/png;base64,${payload}`,
    );
  });
});

describe('image proxy', () => {
  // A configured proxy needs all three values; the url-building rules
  // themselves are covered in @lace-lib/image-url.
  const PROXY = {
    imageProxyUrl: 'https://proxy.example',
    imageProxyKey:
      '943b421c9eb07c830af81030552c86009268de4e532ba2ee2eab8247c6da0881',
    imageProxySalt:
      '520f986b998545b4785e0defbc4f3c1203f22de2374a3d53cb7a7fe9fea309c5',
  };
  const SIGNED_A_PNG =
    'https://proxy.example/pyUdTEB8e8f8WfMRnS5PINcfvrHrBlA1lh4CEcyx07Q/rs:fit:1024:1024/plain/https%3A%2F%2Fexample.com%2Fa.png@webp';

  it('proxies remote http(s) urls', async () => {
    const { configureImageFormat, getAssetImageUrl } =
      await loadImageFormatModule(true);
    configureImageFormat(PROXY);
    expect(getAssetImageUrl('https://example.com/a.png')).toBe(SIGNED_A_PNG);
  });

  it.each([
    ['HTTPS://example.com/logo.svg', 'HTTPS://example.com/logo.svg'],
    ['HtTp://example.com/logo.svg', 'HtTp://example.com/logo.svg'],
    ['//example.com/logo.svg', 'https://example.com/logo.svg'],
  ])(
    'proxies remote URL spelling %s on web and native',
    async (image, source) => {
      for (const isWeb of [true, false]) {
        const { configureImageFormat, getAssetImageUrl } =
          await loadImageFormatModule(isWeb);
        configureImageFormat(PROXY);
        const resolved = getAssetImageUrl(image);
        expect(resolved).toMatch(
          /^https:\/\/proxy\.example\/[\w-]{43}\/rs:fit:1024:1024\/plain\//,
        );
        expect(resolved).toContain(`${encodeURIComponent(source)}@webp`);
      }
    },
  );

  it('normalizes a proxy-origin raw URL instead of passing it to the image', async () => {
    const { configureImageFormat, getAssetImageUrl } =
      await loadImageFormatModule(true);
    configureImageFormat(PROXY);
    const unsafe = `https://proxy.example/${'a'.repeat(
      43,
    )}/raw:1/plain/https://evil.test/logo.svg`;
    const normalized = getAssetImageUrl(unsafe);
    expect(normalized).not.toBe(unsafe);
    expect(normalized).toContain(`/plain/${encodeURIComponent(unsafe)}@webp`);
    expect(getAssetImageUrl(normalized)).toBe(normalized);
  });

  it('proxies the gateway url an IPFS source normalizes to', async () => {
    const { configureImageFormat, getAssetImageUrl } =
      await loadImageFormatModule(true);
    configureImageFormat(PROXY);
    expect(
      getAssetImageUrl(
        'ipfs://bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu',
      ),
    ).toBe(
      'https://proxy.example/2P5T-RbyAy818s2lTjTRInIHZpUflDUyzmBzSz5qZjA/rs:fit:1024:1024/plain/https%3A%2F%2Fipfs.blockfrost.dev%2Fipfs%2Fbafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu@webp',
    );
  });

  it('uses the url directly when no proxy is configured', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    expect(getAssetImageUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png',
    );
  });

  // The deployed proxy answers unsigned requests with 403, so a build carrying
  // an origin but no credentials must load images directly.
  it('uses the url directly when the proxy origin has no key/salt', async () => {
    const { configureImageFormat, getAssetImageUrl } =
      await loadImageFormatModule(true);
    configureImageFormat({ imageProxyUrl: 'https://proxy.example' });
    expect(getAssetImageUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png',
    );
  });

  // A molecule resolves the uri and Avatar resolves it again.
  it('is idempotent over an IPFS url whose query the proxy escaped', async () => {
    const { configureImageFormat, getAssetImageUrl } =
      await loadImageFormatModule(true);
    configureImageFormat(PROXY);
    const once = getAssetImageUrl(
      'ipfs://bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu/art.png?w=64',
    );
    expect(once).toContain('%3Fw%3D64');
    expect(getAssetImageUrl(once)).toBe(once);
  });

  it('does not proxy data: urls', async () => {
    const { configureImageFormat, getAssetImageUrl } =
      await loadImageFormatModule(true);
    configureImageFormat(PROXY);
    const uri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
    expect(getAssetImageUrl(uri)).toBe(uri);
  });

  it('does not proxy local asset paths', async () => {
    const { configureImageFormat, getAssetImageUrl } =
      await loadImageFormatModule(true);
    configureImageFormat(PROXY);
    expect(getAssetImageUrl('/expo/assets/logo.png')).toBe(
      '/expo/assets/logo.png',
    );
  });

  it('ignores a malformed encoded source during an IPFS retry', async () => {
    const { configureImageFormat, getWebIpfsFallbackSource } =
      await loadImageFormatModule(true);
    configureImageFormat(PROXY);
    expect(
      getWebIpfsFallbackSource(
        `https://proxy.example/${'a'.repeat(
          43,
        )}/rs:fit:1024:1024/plain/%FF@webp`,
      ),
    ).toBeNull();
  });
});
