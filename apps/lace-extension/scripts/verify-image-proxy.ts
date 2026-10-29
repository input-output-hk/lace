import assert from 'node:assert/strict';
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const directory = process.argv[2];
assert.ok(directory, 'Pass the built Expo directory to verify');
const bundles = readdirSync(directory, { recursive: true })
  .filter(
    (file): file is string => typeof file === 'string' && file.endsWith('.js'),
  )
  .map(file => readFileSync(path.join(directory, file), 'utf8'));
assert.ok(bundles.length > 0, 'No extension JavaScript bundles found');

const names = ['IMAGE_PROXY_URL', 'IMAGE_PROXY_KEY', 'IMAGE_PROXY_SALT'];
const configured = names.every(name => process.env[name]?.trim());

// A successful build can still carry runtime env lookups or cached unconfigured
// bytes. Check the downloadable artifact, without printing credential values.
for (const name of names) {
  assert.ok(
    !bundles.some(bundle => bundle.includes(`EXPO_PUBLIC_${name}`)),
    `${name} survived Metro as a runtime lookup`,
  );
  if (configured) {
    assert.ok(
      bundles.some(bundle =>
        bundle.includes(JSON.stringify(process.env[name]?.trim())),
      ),
      `${name} was supplied but is missing from the extension bundle`,
    );
  }
}

const status = configured ? 'enabled' : 'disabled';
console.log(
  `Extension image proxy: ${status}${
    configured
      ? ' (configuration verified in bundle)'
      : ' (missing or partial build configuration)'
  }`,
);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `image-proxy=${status}\n`);
}
