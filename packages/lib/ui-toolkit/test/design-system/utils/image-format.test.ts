import { describe, expect, it, vi } from 'vitest';

const loadImageFormatModule = async (isWeb: boolean) => {
  vi.resetModules();
  vi.doMock('../../../src/design-system/util/commons', () => ({ isWeb }));

  return await import('../../../src/design-system/util/image-format');
};

describe('getWebIpfsFallbackUri', () => {
  it('returns undefined for undefined input', async () => {
    const { getWebIpfsFallbackUri } = await loadImageFormatModule(true);
    expect(getWebIpfsFallbackUri(undefined)).toBeUndefined();
  });

  it('returns the original uri when not running on web', async () => {
    const { getWebIpfsFallbackUri } = await loadImageFormatModule(false);
    const uri = 'https://some.gateway/ipfs/bafybeigdyrzt';
    expect(getWebIpfsFallbackUri(uri)).toBe(uri);
  });

  it('returns the original uri when it already uses the blockfrost gateway', async () => {
    const { getWebIpfsFallbackUri } = await loadImageFormatModule(true);
    const uri = 'https://ipfs.blockfrost.dev/ipfs/bafybeigdyrzt';
    expect(getWebIpfsFallbackUri(uri)).toBe(uri);
  });

  it('returns the original uri when it does not contain an /ipfs/<cid> segment', async () => {
    const { getWebIpfsFallbackUri } = await loadImageFormatModule(true);
    const uri = 'https://example.com/not-ipfs/bafybeigdyrzt';
    expect(getWebIpfsFallbackUri(uri)).toBe(uri);
  });

  it('rewrites /ipfs/<cid> urls to the blockfrost gateway on web', async () => {
    const { getWebIpfsFallbackUri } = await loadImageFormatModule(true);
    const uri = 'https://some.gateway/ipfs/bafybeigdyrzt';
    expect(getWebIpfsFallbackUri(uri)).toBe(
      'https://ipfs.blockfrost.dev/ipfs/bafybeigdyrzt',
    );
  });

  it('rewrites to the blockfrost gateway and keeps only the CID (drops additional path/query)', async () => {
    const { getWebIpfsFallbackUri } = await loadImageFormatModule(true);
    const uri =
      'https://some.gateway/ipfs/bafybeigdyrzt/metadata.json?foo=bar#baz';
    expect(getWebIpfsFallbackUri(uri)).toBe(
      'https://ipfs.blockfrost.dev/ipfs/bafybeigdyrzt',
    );
  });
});

describe('getWebIpfsFallbackSource', () => {
  it('returns null when not running on web', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(false);
    expect(
      getWebIpfsFallbackSource('https://some.gateway/ipfs/bafybeigdyrzt'),
    ).toBeNull();
  });

  it('returns null for undefined input', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(true);
    expect(getWebIpfsFallbackSource(undefined)).toBeNull();
  });

  it('returns null when it already uses the blockfrost gateway', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(true);
    const uri = 'https://ipfs.blockfrost.dev/ipfs/bafybeigdyrzt';
    expect(getWebIpfsFallbackSource(uri)).toBeNull();
  });

  it('returns null when it does not contain an /ipfs/<cid> segment', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(true);
    const uri = 'https://example.com/not-ipfs/bafybeigdyrzt';
    expect(getWebIpfsFallbackSource(uri)).toBeNull();
  });

  it('returns a blockfrost ImageSource on web for /ipfs/<cid> urls', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(true);
    const uri = 'https://some.gateway/ipfs/bafybeigdyrzt';
    expect(getWebIpfsFallbackSource(uri)).toEqual({
      uri: 'https://ipfs.blockfrost.dev/ipfs/bafybeigdyrzt',
    });
  });

  it('returns a blockfrost ImageSource and keeps only the CID (drops additional path/query)', async () => {
    const { getWebIpfsFallbackSource } = await loadImageFormatModule(true);
    const uri =
      'https://some.gateway/ipfs/bafybeigdyrzt/metadata.json?foo=bar#baz';
    expect(getWebIpfsFallbackSource(uri)).toEqual({
      uri: 'https://ipfs.blockfrost.dev/ipfs/bafybeigdyrzt',
    });
  });
});

describe('getAssetImageUrl', () => {
  it('returns undefined for undefined input', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(true);
    expect(getAssetImageUrl(undefined)).toBeUndefined();
  });

  it('returns http(s) urls as-is', async () => {
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
    expect(getAssetImageUrl('ipfs://bafybeigdyrzt')).toBe(
      'https://ipfs.blockfrost.dev/ipfs/bafybeigdyrzt',
    );
  });

  it('falls back to the blockfrost gateway when no gateway was configured', async () => {
    const { getAssetImageUrl } = await loadImageFormatModule(false);
    expect(getAssetImageUrl('ipfs://bafybeigdyrzt')).toBe(
      'https://ipfs.blockfrost.dev/ipfs/bafybeigdyrzt',
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
});
