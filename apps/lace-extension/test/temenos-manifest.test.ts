import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { URL } from 'node:url';

import { expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { transformManifest } = require('../webpack/webpack-utils.js');

it('allows mainnet and preview evidence and AKX requests in the production extension CSP', () => {
  const manifest = JSON.parse(
    transformManifest(
      readFileSync(new URL('../assets/manifest.json', import.meta.url)),
      'production',
    ),
  );
  const csp = manifest.content_security_policy.extension_pages as string;
  const connectSources = csp
    .split(';')
    .find(part => part.trim().startsWith('connect-src'))!
    .trim()
    .split(/\s+/);
  for (const origin of [
    'https://api.proofserver.mainnet.wastedp.io',
    'https://attestation.proofserver.mainnet.wastedp.io',
    'https://api.proofserver.preview.wastedp.io',
    'https://attestation.proofserver.preview.wastedp.io',
  ])
    expect(connectSources).toContain(origin);
});
