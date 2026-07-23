// esbuild alias target for Node built-ins referenced only on never-taken
// Node-only code paths of bundled dependencies (libsodium's `require('crypto')`
// randomness fallback — the browser path uses WebCrypto; the CIP-8/COSE
// `@emurgo/cardano-message-signing-nodejs` wasm loader, tree-shaken from the
// admitted surface but resolved at bundle time). Resolving them here keeps the
// bundle browser-only without shipping a fake implementation.
module.exports = {};
