// Content scripts reach this module only through a dynamic import, so the
// ledger WASM behind it loads on demand while the rest of this package imports
// `@lace-lib/vendor` statically.
export { createProvingProviderFromTransport } from '@lace-lib/vendor/proof-server-transport';
