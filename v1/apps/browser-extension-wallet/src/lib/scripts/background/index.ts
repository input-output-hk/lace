// Prevent webpack from tree-shaking __wbindgen_* exports from cardano_message_signing_bg.js.
// The WASM binary needs these at instantiation time (via webassembly-loader-sw importObjectProps),
// but the dependency is invisible to webpack's static analysis. Using require() forces webpack
// to retain all exports, since it can't determine which properties are accessed at runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import './cip30';
import './onUpdate';
import './services';
import './services/expose';
import './services/lmpService';
import './expose-background-service';
import './keep-alive-sw';
import './onUninstall';
import './nami-migration';
import './onStorageChange';

require('@emurgo/cardano-message-signing-browser/cardano_message_signing_bg.js');
