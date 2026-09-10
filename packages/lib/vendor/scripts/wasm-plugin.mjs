// esbuild plugin that carries wasm-bindgen "bundler"-target output into the
// `@lace-lib/vendor` /midnight entry (ADR 37 vendor-entrypoint
// admission). It runs in the VENDOR build (this package),
// alongside the other browser shims/aliases baked here — so the built /midnight
// bundle the host vendors already carries the engine's WASM + glue and the host
// build needs no wasm machinery of its own.
//
// THE SHAPE (verified against @midnight-ntwrk/ledger-v8@8.0.3):
//   - The package's browser entry `midnight_<x>_wasm.js` does:
//       import * as wasm from "./midnight_<x>_wasm_bg.wasm";
//       export * from "./midnight_<x>_wasm_bg.js";       // the JS glue
//       import { __wbg_set_wasm } from "./..._bg.js";
//       __wbg_set_wasm(wasm); wasm.__wbindgen_start();
//     i.e. the glue receives the instantiated wasm exports via a SETTER — the
//     `__wbg_set_wasm` indirection exists precisely so the glue↔wasm cycle
//     resolves lazily. The wasm module in turn IMPORTS the glue plus a set of
//     `./snippets/**/inlineN.js` helpers (each of which imports `#self` — the
//     package's own browser entry — to read wasm exports lazily).
//   - The sibling NODE entry `midnight_<x>_wasm_fs.js` already spells out the
//     COMPLETE import object (glue + every snippet, keyed by the exact
//     specifier strings the wasm declares) and reads the `.wasm` off disk. It
//     is the canonical import map — we transform IT into a browser loader so
//     the snippet/glue key set can never drift from what the wasm expects.
//
// STRATEGY — alias the browser entry (Approach B in the C4 plan): intercept
// `midnight_<x>_wasm.js`, and emit a replacement that keeps the import object
// verbatim (parsed out of the fs entry) but resolves the `.wasm` as a bundled
// ASSET (esbuild `file` loader → copied into dist/, hashed) and instantiates it
// at module top-level (`await`) against that import object. `import * as wasm`
// semantics never surface — we hand `instance.exports` straight to
// `__wbg_set_wasm`, so there is no need to statically re-declare every wasm
// export. Requires the consuming entry to be built `format: 'esm'` (TLA); the
// host statically imports the built /midnight entry from its offscreen ESM
// bundle (loaded via <script type="module">, offscreen.html). The wasm URL is
// resolved via `new URL(<hashed-name>, import.meta.url)` — a VARIABLE first
// argument, so esbuild does not re-resolve it when the host re-bundles /midnight;
// the host copies the committed `.wasm` blobs beside its offscreen output so the
// runtime URL resolves.
//
// The circular-import hazard the C4 plan flags is handled by wasm-bindgen's own
// design: the glue's exported functions reference the module-level `wasm`
// binding only inside their bodies (lazily), so they exist as importable
// namespace members before instantiation; the snippet `#self` cycle likewise
// reads `wasm.X` only when the wasm calls back into them (post-start).

import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

// A wasm-bindgen browser entry: `midnight_<x>_wasm.js` (NOT `_bg.js`/`_fs.js`).
const BROWSER_ENTRY_RE = /midnight_[a-z0-9_]+_wasm\.js$/;

/**
 * Parse the sibling node entry (`..._wasm_fs.js`) for the authoritative import
 * object: the ordered `imports['<specifier>'] = <ns>` assignments and their
 * `import * as <ns> from '<specifier>'` bindings. Returns the glue specifier
 * (the `..._bg.js` key) and every (specifier, localName) pair.
 */
const parseImportMap = fsSource => {
  const bindings = new Map(); // localName -> specifier
  for (const match of fsSource.matchAll(
    /import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/g,
  )) {
    bindings.set(match[1], match[2]);
  }
  const entries = []; // { specifier, local }
  for (const match of fsSource.matchAll(
    /imports\[['"]([^'"]+)['"]\]\s*=\s*([A-Za-z0-9_$]+)/g,
  )) {
    const [, specifier, local] = match;
    entries.push({ specifier, local });
    // The glue is bound to a local (`exports`) rather than an `import * as`
    // in some emitters — keep the specifier if we have it.
    if (!bindings.has(local)) bindings.set(local, specifier);
  }
  const glue = entries.find(entry => /_bg\.js$/.test(entry.specifier));
  if (!glue) {
    throw new Error(
      'wasm-plugin: could not find the `..._bg.js` glue specifier in the ' +
        'node entry import map',
    );
  }
  return {
    entries,
    bindings,
    glueSpecifier: glue.specifier,
    glueLocal: glue.local,
  };
};

/**
 * Build the browser-loader replacement source for one wasm-bindgen package.
 * Mirrors the node entry's import object exactly; instantiates the `.wasm`
 * (bundled via the `file` loader) at top level.
 */
const buildBrowserLoader = ({ entries, glueSpecifier, glueLocal }) => {
  const wasmSpecifier = glueSpecifier.replace(/_bg\.js$/, '_bg.wasm');
  const importLines = entries.map(
    ({ specifier, local }) =>
      `import * as ${local} from ${JSON.stringify(specifier)};`,
  );
  const importObjectEntries = entries.map(
    ({ specifier, local }) => `  ${JSON.stringify(specifier)}: ${local},`,
  );
  return `
// GENERATED by scripts/wasm-plugin.mjs — browser loader for a wasm-bindgen
// bundler-target package (replaces its node fs loader for the extension page).
export * from ${JSON.stringify(glueSpecifier)};
import __laceWasmUrl from ${JSON.stringify(wasmSpecifier)};
${importLines.join('\n')}

const imports = {
${importObjectEntries.join('\n')}
};

const __laceWasmHref = new URL(__laceWasmUrl, import.meta.url);
let __laceWasmInstance;
try {
  __laceWasmInstance = (
    await WebAssembly.instantiateStreaming(fetch(__laceWasmHref), imports)
  ).instance;
} catch {
  // Fallback when the response lacks the application/wasm MIME type
  // (streaming compile refuses it) — compile from the buffer instead.
  const bytes = await (await fetch(__laceWasmHref)).arrayBuffer();
  __laceWasmInstance = (await WebAssembly.instantiate(bytes, imports)).instance;
}

const wasm = __laceWasmInstance.exports;
${glueLocal}.__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
`;
};

/**
 * The plugin. Loads the `.wasm` via esbuild's `file` loader (asset copy +
 * hashed name), and rewrites each wasm-bindgen browser entry into the
 * top-level-await browser loader above.
 */
export const wasmBindgenPlugin = () => ({
  name: 'wasm-bindgen',
  setup(build) {
    // The `.wasm` files ride as copied assets (hashed, so distinct nested
    // copies never collide); the loader default-exports the output URL.
    build.initialOptions.loader = {
      ...build.initialOptions.loader,
      '.wasm': 'file',
    };

    build.onLoad({ filter: BROWSER_ENTRY_RE }, args => {
      const source = readFileSync(args.path, 'utf8');
      // Only rewrite genuine wasm-bindgen loaders (they set the wasm via the
      // setter and start it). Anything else with a matching name is left alone.
      if (!source.includes('__wbg_set_wasm') || !source.includes('_bg.wasm')) {
        return undefined;
      }
      const dir = dirname(args.path);
      const stem = basename(args.path).replace(/\.js$/, '');
      const fsEntry = join(dir, `${stem}_fs.js`);
      const fsSource = readFileSync(fsEntry, 'utf8');
      const parsed = parseImportMap(fsSource);
      return {
        contents: buildBrowserLoader(parsed),
        loader: 'js',
        resolveDir: dir,
      };
    });
  },
});
