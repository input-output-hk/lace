import assert from 'node:assert/strict';

import { imageProxyConfigFromEnv as imageProxyConfigFromEnvironment } from '../apps/lace-extension-shell/scripts/manifest.mjs';
import { proxyImageUrl as shellProxyImageUrl } from '../apps/lace-extension-shell/src/sw/image-proxy.ts';
import { proxyImageUrl } from '../packages/lib/image-url/src/image-proxy.ts';

const config = imageProxyConfigFromEnvironment(process.env);

if (!config.url) {
  process.stderr.write(
    'Image proxy smoke check skipped: IMAGE_PROXY_URL, IMAGE_PROXY_KEY and IMAGE_PROXY_SALT are not all configured.\n',
  );
} else {
  // Versioned upstream fixtures keep this check independent of NFT gateways.
  // The query exercises escaping through the deployed reverse proxy too.
  for (const format of ['jpg', 'svg']) {
    const source = `https://raw.githubusercontent.com/imgproxy/imgproxy/v3.30.1/testdata/test1.${format}?lace-smoke=x%40y`;
    const url = proxyImageUrl(source, config);
    assert.notEqual(url, source, 'The configured client bypassed the proxy');
    assert.equal(
      await shellProxyImageUrl(source, config),
      url,
      'The workspace and shell image proxy clients disagree',
    );

    const response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    assert.equal(response.status, 200, `${format}: proxy HTTP status`);
    assert.equal(
      response.headers.get('content-type')?.split(';')[0],
      'image/webp',
      `${format}: proxy content type`,
    );
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.ok(bytes.length > 12, `${format}: empty WebP response`);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    process.stdout.write(
      `Image proxy ${format}: HTTP 200 image/webp (${bytes.length} bytes)\n`,
    );
  }
}
