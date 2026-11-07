const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');

// Blockfrost closes the SDK's deflate-first subscription before the ack.
// Standard-first also permits compression when the server prefers it. Remove
// or requalify this extension-only workaround when adopting another SDK build.
module.exports = function midnightIndexerTransport(source) {
  const manifest = path.resolve(this.resourcePath, '../../../package.json');
  this.addDependency(manifest);
  const { version } = JSON.parse(readFileSync(manifest, 'utf8'));
  const hash = createHash('sha256').update(source).digest('hex');
  if (
    version !== '2.0.0-rc.2' ||
    hash !== '00ea9d9235cfc36ed01f72cf67befbdf6b0df0b952fac0463312c8fa6253c54d'
  ) {
    throw new Error(
      'Requalify the LW-15105 indexer transport workaround: SDK version or source changed',
    );
  }

  return source.replace(
    '[GRAPHQL_TRANSPORT_WS_DEFLATE, GRAPHQL_TRANSPORT_WS_PROTOCOL]',
    '[GRAPHQL_TRANSPORT_WS_PROTOCOL, GRAPHQL_TRANSPORT_WS_DEFLATE]',
  );
};
