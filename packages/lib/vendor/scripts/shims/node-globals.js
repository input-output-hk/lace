// esbuild `inject` shim: provides the `Buffer` and `process` globals the
// @cardano-sdk browser bundles expect. esbuild only injects these into the
// bundle when it actually references the globals. Both come from the `buffer`
// and `process` npm packages (vendor's build devDependencies).
import { Buffer } from 'buffer';
import process from 'process';

export { Buffer, process };
