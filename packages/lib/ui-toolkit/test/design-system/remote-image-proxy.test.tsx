// Thumbnail, SwapInput and DappInfoCard hand a uri straight to an Image, so
// they are the toolkit components where attacker-controlled metadata — token
// metadata, or a dApp's own favicon — could reach the network without the ADR
// 42 image proxy. All three render through the REAL
// getAssetImageUrl — only `./commons` is stubbed, because the util index pulls
// Platform-dependent code that cannot load under vitest's node environment.
// The proxy's signing/escaping rules themselves are covered in
// @lace-lib/image-url.
import type { ElementType } from 'react';

import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Thumbnail } from '../../src/design-system/atoms/thumbnail/thumbnail';
import { DappInfoCard } from '../../src/design-system/molecules/dappInfoCard/dappInfoCard';
import { SwapInput } from '../../src/design-system/molecules/swapInput/swapInput';
import {
  configureImageFormat,
  getAssetImageUrl,
} from '../../src/design-system/util/image-format';

import type { ReactTestRenderer } from 'react-test-renderer';

// Mutable so the web-only error-retry below can run with isWeb on; the
// mocks expose it through a getter so each read sees the current value.
const platform = vi.hoisted(() => ({ isWeb: false }));

vi.mock('expo-image', () => ({ Image: 'Image' }));

vi.mock('react-native', () => ({
  Image: 'Image',
  Pressable: 'Pressable',
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    hairlineWidth: 1,
  },
  TextInput: 'TextInput',
  View: 'View',
}));

// Same module ids as the components' own imports: the util index and the
// design tokens both reach Platform-dependent code, so stub them and splice
// the real image-format exports back into the index.
vi.mock('../../src/design-system/util/commons', () => ({
  get isWeb() {
    return platform.isWeb;
  },
}));
vi.mock('../../src/design-system/util', async () => ({
  ...(await import('../../src/design-system/util/image-format')),
  get isWeb() {
    return platform.isWeb;
  },
}));
vi.mock('../../src/design-tokens', () => ({
  radius: { M: 8, S: 4, XS: 2, rounded: 999 },
  spacing: { L: 16, M: 8, S: 4, XS: 2 },
  useTheme: () => ({
    theme: {
      background: {
        negative: '#f00',
        primary: '#000',
        secondary: '#111',
        tertiary: '#222',
      },
      border: { middle: '#333' },
      text: { primary: '#fff', secondary: '#ccc' },
    },
  }),
}));
vi.mock('../../src/design-system/atoms', () => ({
  Icon: 'Icon',
  Row: 'Row',
  Text: { S: 'TextS', XS: 'TextXS' },
}));
vi.mock('../../src/design-system/atoms/icons/Icon', () => ({ Icon: 'Icon' }));
vi.mock('../../src/design-system/atoms/text/text', () => ({
  Text: { XS: 'TextXS' },
}));

const PROXY_ORIGIN = 'https://image-proxy.test';

// react-test-renderer accepts arbitrary host tags at runtime, but React's
// ElementType only admits intrinsic DOM tags — recast the mocked hosts.
const asHost = (type: string): ElementType => type as unknown as ElementType;

const render = (element: React.ReactElement): ReactTestRenderer => {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(element);
  });
  if (!renderer) throw new Error('component did not render');
  return renderer;
};

const imageSources = (
  renderer: ReactTestRenderer,
): { uri?: string; cacheKey?: string }[] =>
  renderer.root
    .findAllByType(asHost('Image'))
    .map(node => (node.props as { source: { uri?: string } }).source);

describe('remote images reach an Image only through the image proxy', () => {
  beforeEach(() => {
    configureImageFormat({
      imageProxyKey: 'ab'.repeat(16),
      imageProxySalt: 'cd'.repeat(16),
      imageProxyUrl: PROXY_ORIGIN,
    });
  });

  it('Thumbnail normalizes ipfs:// onto one gateway behind the proxy', () => {
    const [source] = imageSources(
      render(<Thumbnail source={{ uri: 'ipfs://QmA' }} />),
    );

    expect(source.uri).toMatch(new RegExp(`^${PROXY_ORIGIN}/`));
    expect(source.uri).toContain(
      '/rs:fit:1024:1024/plain/https%3A%2F%2Fipfs.blockfrost.dev%2Fipfs%2FQmA@webp',
    );
  });

  it('Thumbnail proxies a remote http url and keeps the rest of the source', () => {
    const [source] = imageSources(
      render(
        <Thumbnail
          source={{ cacheKey: 'k', uri: 'https://evil.test/a.png' }}
        />,
      ),
    );

    expect(source.uri).toContain(
      '/rs:fit:1024:1024/plain/https%3A%2F%2Fevil.test%2Fa.png@webp',
    );
    expect(source.cacheKey).toBe('k');
  });

  it('Thumbnail renders the fallback instead of an svg data: URI (M-301)', () => {
    const renderer = render(
      <Thumbnail
        source={{ uri: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }}
      />,
    );

    expect(imageSources(renderer)).toEqual([]);
    expect(renderer.root.findAllByType(asHost('Icon'))).toHaveLength(1);
  });

  it('SwapInput proxies the token icon', () => {
    const [source] = imageSources(
      render(
        <SwapInput
          amount="1"
          placeholder="Select token"
          token={{ icon: { uri: 'https://cdn.test/x.png' }, name: 'TST' }}
        />,
      ),
    );

    expect(source.uri).toMatch(new RegExp(`^${PROXY_ORIGIN}/`));
    expect(source.uri).toContain(
      '/rs:fit:1024:1024/plain/https%3A%2F%2Fcdn.test%2Fx.png@webp',
    );
  });

  it('SwapInput leaves a bundled raster data: URI unproxied', () => {
    const icon = 'data:image/png;base64,AAAA';
    const [source] = imageSources(
      render(
        <SwapInput
          amount="1"
          placeholder="Select token"
          token={{ icon: { uri: icon }, name: 'ADA' }}
        />,
      ),
    );

    expect(source.uri).toBe(icon);
  });

  it('DappInfoCard proxies a dApp favicon', () => {
    const [source] = imageSources(
      render(
        <DappInfoCard
          imageUrl="https://dapp.test/favicon.png"
          name="Acme"
          url="https://dapp.test"
        />,
      ),
    );

    expect(source.uri).toMatch(new RegExp(`^${PROXY_ORIGIN}/`));
    expect(source.uri).toContain(
      '/rs:fit:1024:1024/plain/https%3A%2F%2Fdapp.test%2Ffavicon.png@webp',
    );
  });

  it('DappInfoCard renders initials instead of an svg data: favicon (M-301)', () => {
    const renderer = render(
      <DappInfoCard
        imageUrl="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="
        name="Acme"
        url="https://dapp.test"
      />,
    );

    expect(imageSources(renderer)).toEqual([]);
    expect(
      renderer.root.findByProps({ testID: 'dapp-info-logo-fallback' }),
    ).toBeTruthy();
  });
});

// The one deliberate bypass of the proxy (ADR 42 §4): after a proxied load
// fails, the CID is re-pointed at the built-in gateway directly. It has to read
// the url that FAILED — a caller's raw ipfs:// carries no /ipfs/<cid>.
describe('web error-retry re-points a failed proxied load at the plain gateway', () => {
  const CID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
  const PLAIN_GATEWAY_URL = `https://ipfs.blockfrost.dev/ipfs/${CID}`;
  const proxyCredentials = {
    imageProxyKey: 'ab'.repeat(16),
    imageProxySalt: 'cd'.repeat(16),
    imageProxyUrl: PROXY_ORIGIN,
  };

  const failLoad = (renderer: ReactTestRenderer): void => {
    const [image] = renderer.root.findAllByType(asHost('Image'));
    act(() => {
      (image.props as { onError: () => void }).onError();
    });
  };

  beforeEach(() => {
    platform.isWeb = true;
    configureImageFormat(proxyCredentials);
  });

  afterEach(() => {
    platform.isWeb = false;
  });

  it.each<[string, string]>([
    ['a raw ipfs:// uri', `ipfs://${CID}`],
    ['a bare CID', CID],
    ['a third-party gateway url', `https://gateway.pinata.cloud/ipfs/${CID}`],
    ['the built-in gateway url', PLAIN_GATEWAY_URL],
  ])('retries %s on the plain built-in gateway', (_label, uri) => {
    const renderer = render(<Thumbnail source={{ uri }} />);
    expect(imageSources(renderer)[0].uri).toMatch(
      new RegExp(`^${PROXY_ORIGIN}/`),
    );

    failLoad(renderer);

    expect(imageSources(renderer)).toEqual([{ uri: PLAIN_GATEWAY_URL }]);
  });

  it('retries a uri the caller already resolved through the proxy the same way', () => {
    const renderer = render(
      <Thumbnail source={{ uri: getAssetImageUrl(`ipfs://${CID}`) }} />,
    );

    failLoad(renderer);

    expect(imageSources(renderer)).toEqual([{ uri: PLAIN_GATEWAY_URL }]);
  });

  it('gives up after the retry fails too', () => {
    const renderer = render(<Thumbnail source={{ uri: `ipfs://${CID}` }} />);

    failLoad(renderer);
    failLoad(renderer);

    expect(imageSources(renderer)).toEqual([]);
    expect(renderer.root.findAllByType(asHost('Icon'))).toHaveLength(1);
  });

  it('does not retry when the failed load was already the plain gateway (no proxy configured)', () => {
    configureImageFormat({
      imageProxyKey: undefined,
      imageProxySalt: undefined,
      imageProxyUrl: undefined,
    });
    const renderer = render(<Thumbnail source={{ uri: `ipfs://${CID}` }} />);
    expect(imageSources(renderer)).toEqual([{ uri: PLAIN_GATEWAY_URL }]);

    failLoad(renderer);

    expect(imageSources(renderer)).toEqual([]);
    expect(renderer.root.findAllByType(asHost('Icon'))).toHaveLength(1);
  });

  it('does not retry a plain http url — there is no CID to re-point', () => {
    const renderer = render(
      <Thumbnail source={{ uri: 'https://cdn.test/a.png' }} />,
    );

    failLoad(renderer);

    expect(imageSources(renderer)).toEqual([]);
  });
});
