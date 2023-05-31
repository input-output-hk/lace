// This is needed for 'syncWebAssembly' to work. There might be a better split point,
// e.g. when app has loaded and rendered something,
// but before anything from '@lace/cardano' is imported.
// Basically, we need to `await import('@dcspark/cardano-multiplatform-lib-asmjs": "^3.1.0",')`
// before static imports from '@lace/cardano' can work.
// --
// 'asyncWebAssembly' is not suitable as seems to expect all wasm imports
// to be done dynamically, which is not the case in cardano-js-sdk.
import('./popup');
