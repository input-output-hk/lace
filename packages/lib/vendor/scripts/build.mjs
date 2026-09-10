#!/usr/bin/env node
// Builds @lace-lib/vendor into self-contained, NO-MINIFY browser bundles —
// the ADR-37 audit artifact and the host's SINGLE admission mechanism. Every
// trusted external tree admitted into the privileged host (@cardano-sdk, the
// HW SDK trees, the Midnight engine derivation, the QR codecs) enters ONLY as
// a dedicated entrypoint of this lib, committed as reviewable built output — so
// an upstream bump surfaces as a real code diff, not a version-string change.
// This is what makes "audit the actual production code" true rather than "pin
// and trust the registry".
//
// ENTRYPOINT MODEL. One package, many entrypoints, `splitting: true`. The
// grouping axis is CO-LOAD, not tree-shaking hope: an entry is a set of symbols
// a single privileged document loads together (e.g. /ledger-cardano-app for
// pairing/verify-address vs /ledger-cardano-key-agent for the signing tree), so
// a layer split is STRUCTURAL — a light surface never pulls a heavy tree it does
// not use, and a CI metafile assertion (LIGHT_ENTRY_EXCLUSIONS) pins that. With
// splitting on, code shared across entries lands in ONE hashed chunk, so there
// is exactly ONE @cardano-sdk copy per document rather than a copy re-inlined
// into every entry (the second-copy hazard the Ledger tree would otherwise
// create). Chunk names carry a [hash] (esbuild errors on colliding non-hashed
// chunk names), and dist/chunks.map.json distills the metafile into the review
// index (output file → the top-level input packages inside it) so a diff over
// no-minify output + `git diff -M` reads as real code.
//
// The build runs in the WORKSPACE (the root resolves @cardano-sdk), and the
// browser shims (Buffer/process/stream + node-built-in stubs) are baked in
// HERE — so the host consumes browser-ready bundles and @cardano-sdk NEVER
// enters the host's own dependency closure (only the inlined dist does).
// esbuild is the host's TCB bundler (ADR 37 "one engine").
//
// Size is dominated by load-bearing audited crypto: the libsodium Ed25519/
// BIP32 derivation (via Crypto.SodiumBip32Ed25519) and the @cardano-sdk/core
// CBOR decoder (the canonical tx summary). The one material trim is shipping
// bip39 English-only — the only wordlist Lace uses. Slimming further means
// swapping SodiumBip32Ed25519 for a pure-JS derivation, a separate
// behaviour-sensitive change in @lace-lib/core (ADR 37's slimming lever).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

import { wasmBindgenPlugin } from './wasm-plugin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
// Wipe first: chunk/asset names carry a content [hash], so a rebuild after any
// upstream change leaves the PREVIOUS hashed files behind. sync-shared-lib.mjs
// copies whatever is here into the committed audit dir, so an orphan would ride
// into it and break the byte-identity rebuild (.github/workflows/vendor-check.yml).
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// The admitted entrypoints. Each key is one CO-LOAD group; the value is its
// entry module. Later admission commits APPEND their tree's entry here IN PLACE
// (the commit that admits the tree owns its entry). Planned full set (ADR 37 /
// ADR 37): index · midnight · ledger-cardano-app · ledger-cardano-key-agent ·
// ledger-bitcoin · trezor-connect · trezor-cardano · webhid · qr. The Trezor
// content-script bridge is a standalone IIFE asset built in a SEPARATE pass (it
// cannot participate in ESM splitting).
//   - midnight: the offscreen document's Midnight engine surface (the SDK
//     WalletFacade tree + the wasm-bindgen ledger engine). HEAVY — kept off
//     /index by the LIGHT_ENTRY_EXCLUSIONS row below. wasmBindgenPlugin admits
//     each reached wasm-bindgen engine as a committed hashed `.wasm` asset (this
//     surface reaches ledger-v8's; a heavier flow could reach onchain/zkir too).
//   - ledger-cardano-app / webhid: the LIGHT Ledger co-load groups (pairing +
//     verify-address probe the device through the ledgerjs Ada app over WebHID),
//     kept off the key-agent signing tree by the LIGHT_ENTRY_EXCLUSIONS rows
//     below.
//   - ledger-cardano-key-agent: the HEAVY Ledger signing tree
//     (@cardano-sdk/hardware-ledger + the crypto/key-management interop the
//     signer surface constructs the agent from). Shares one @cardano-sdk copy
//     with /index via the split chunks.
//   - trezor-connect: the chain-agnostic @trezor/connect-webextension runtime
//     (pairing + signing, both chains) — a LIGHT group kept off the Cardano
//     signing tree by the LIGHT_ENTRY_EXCLUSIONS row below (ADR 37). The
//     content-script bridge it uses is the SEPARATE trezor-bridge IIFE pass.
//   - trezor-cardano: the HEAVY Trezor Cardano signing tree
//     (@cardano-sdk/hardware-trezor + the crypto/key-management interop). Shares
//     one @cardano-sdk copy with /index + /ledger-cardano-key-agent via the
//     split chunks; its internal @trezor/connect-web import is aliased to the
//     same webextension copy /trezor-connect resolves (trezorConnectWebAlias).
const entryPoints = {
  index: 'src/index.ts',
  midnight: 'src/midnight.ts',
  'ledger-cardano-app': 'src/ledger-cardano-app.ts',
  webhid: 'src/webhid.ts',
  'ledger-cardano-key-agent': 'src/ledger-cardano-key-agent.ts',
  'ledger-bitcoin': 'src/ledger-bitcoin.ts',
  'trezor-connect': 'src/trezor-connect.ts',
  'trezor-cardano': 'src/trezor-cardano.ts',
  qr: 'src/qr.ts',
  zxcvbn: 'src/zxcvbn.ts',
};

// Load-bearing separation the metafile must enforce (ADR 37): a LIGHT entry
// must not drag a HEAVY tree into its bundle. Row = entry name → forbidden
// top-level package names anywhere in that entry's transitive output closure.
// Each admission commit pins ITS light entries here (e.g. ledger-cardano-app /
// webhid / qr must exclude @cardano-sdk/hardware-ledger and the midnight engine).
//   - index: must never grow the Midnight engine — the SW + ceremony surfaces
//     consume /index, and the engine belongs to the offscreen /midnight layer
//     alone. wallet-sdk-hd (the pure-JS HD derivation leaf) stays in /index and
//     is a DISTINCT top-level package from the excluded wallet-sdk umbrella.
//   - ledger-cardano-app / webhid: the LIGHT pairing/verify surfaces must never
//     pull the Ledger signing tree (@cardano-sdk/hardware-ledger) — that is the
//     structural split ADR 37 pins (pairing uses the ledgerjs app directly, not
//     LedgerKeyAgent) — nor the Midnight engine.
//   - trezor-connect: the chain-agnostic Connect runtime must never pull the
//     Cardano Trezor signing tree (@cardano-sdk/hardware-trezor) — the entry is
//     chain-agnostic by definition, so the split is structural (ADR 37) — nor
//     the Midnight engine.
//   - qr: the render/scan surface (qrcode + jsqr) is pure JS — the air-gapped
//     exchange loads it in its own light document, so it must never pull the
//     @cardano-sdk surface, the Ledger signing tree, or the Midnight engine
//     (ADR 37).
//   - zxcvbn: the password-strength estimator is pure JS — the create/import
//     ceremony surfaces load it to gate the wallet password, so like qr it must
//     never pull the @cardano-sdk surface, the Ledger signing tree, or the
//     Midnight engine (ADR 37).
const LIGHT_ENTRY_EXCLUSIONS = {
  index: ['@midnight-ntwrk/ledger-v8', '@midnightntwrk/wallet-sdk'],
  'ledger-cardano-app': [
    '@cardano-sdk/hardware-ledger',
    '@midnight-ntwrk/ledger-v8',
    '@midnightntwrk/wallet-sdk',
  ],
  webhid: [
    '@cardano-sdk/hardware-ledger',
    '@midnight-ntwrk/ledger-v8',
    '@midnightntwrk/wallet-sdk',
  ],
  'trezor-connect': [
    '@cardano-sdk/hardware-trezor',
    '@midnight-ntwrk/ledger-v8',
    '@midnightntwrk/wallet-sdk',
  ],
  qr: [
    '@cardano-sdk/core',
    '@cardano-sdk/hardware-ledger',
    '@midnight-ntwrk/ledger-v8',
    '@midnightntwrk/wallet-sdk',
  ],
  zxcvbn: [
    '@cardano-sdk/core',
    '@cardano-sdk/hardware-ledger',
    '@midnight-ntwrk/ledger-v8',
    '@midnightntwrk/wallet-sdk',
  ],
};

// Drop bip39's non-English wordlists (~0.25 MB). English is the only list Lace
// uses; a non-English lookup would hit an empty list and fail loud. esbuild's
// filter is Go RE2 (no look-ahead), so match every wordlist and branch in the
// loader on the English one.
const bip39EnglishOnly = {
  name: 'bip39-english-only',
  setup(build) {
    build.onLoad({ filter: /wordlists[\\/][a-z_]+\.json$/ }, async ({ path }) =>
      path.endsWith('english.json')
        ? { contents: await readFile(path, 'utf8'), loader: 'json' }
        : { contents: '[]', loader: 'json' },
    );
  },
};

// libsodium-sumo's emscripten loader fetch()es its OWN inlined data-URI wasm
// before falling back to the sync base64 decode — the guard checks isFileURI
// but not isDataURI (fixed in later emscripten; ledger-bitcoin's tree already
// carries the fixed guard). Under the host's extension-page CSP (connect-src
// without data:) that fetch is blocked and logs a CSP violation on every SW
// boot / ceremony-surface mount. The data-URI escape must sit on the OUTER
// async-block condition, not just the fetch guard: skipping only the fetch
// drops a data-URI file into the sibling readAsync branch, which is
// XMLHttpRequest-backed — undefined in an MV3 service worker, so the loader
// aborts instead of recovering. With the outer guard, a data-URI file bypasses
// both async branches and lands on the trailing sync-decode return. Count is
// asserted so a libsodium bump that reshapes the loader fails the build
// instead of silently reintroducing the CSP noise or the SW abort.
const libsodiumSkipDataUriFetch = {
  name: 'libsodium-skip-data-uri-fetch',
  setup(build) {
    build.onLoad({ filter: /libsodium-sumo[\\/].*\.js$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8');
      let patched = 0;
      const contents = source.replace(
        /if\((!\w+&&\(\w+\|\|\w+\))\)\{if\("function"==typeof fetch&&!(\w+)\((\w+)\)\)return fetch\(\3,/g,
        (_, outerCondition, isFileUri, file) => {
          patched += 1;
          return (
            `if(${outerCondition}&&!${file}.startsWith("data:"))` +
            `{if("function"==typeof fetch&&!${isFileUri}(${file}))` +
            `return fetch(${file},`
          );
        },
      );
      // Two emscripten modules live in libsodium-sumo.js (wasm + asm.js
      // fallback), each with one async wasm-load block.
      if (patched !== 2) {
        throw new Error(
          `[vendor] libsodium-skip-data-uri-fetch patched ${patched} loader ` +
            `guard(s) in ${path}, expected 2 — the libsodium loader shape ` +
            'changed; re-verify its data-URI load path against the CSP and ' +
            'the service worker (no XMLHttpRequest there).',
        );
      }
      return { contents, loader: 'js' };
    });
  },
};

// Import-safe, use-fatal stub for the node-only / unused Ledger transports.
// @cardano-sdk/hardware-ledger statically requires node-hid +
// @ledgerhq/hw-transport-node-hid-noevents + @ledgerhq/hw-transport-webusb, and
// its LedgerKeyAgent READS them at MODULE SCOPE to seed capability references
// (`TransportWebUSB = import_hw_transport_webusb.default.default`) before any
// device work. WebHID is the ONE transport the closure admits (ADR 37 "a single
// transport variant"), and the host constructs LedgerKeyAgent directly with an
// already-open WebHID deviceConnection (ledger-signer.ts — no createWithDevice),
// so it never reaches the SDK's auto-connect transport methods that USE these.
// The stub must therefore BIND under import (property reads / esbuild __toESM
// prototype walks resolve to the proxy) yet stay UNUSABLE (apply/construct
// throw), so no node/WebUSB transport can ever be listed, opened, or
// instantiated — WebHID remains the one USABLE transport. A throw-on-GET proxy
// was a bug: the module-scope `.default` read above threw during the dynamic
// import of the signing tree — long before any transport was used — breaking
// every Ledger signature. This is the seam-side replacement for the host's
// retired file:vendor/empty-stub override. The stub source is CJS
// (module.exports = new Proxy(...)); esbuild handles it under the ESM output.
const ledgerNodeTransportFailLoud = {
  name: 'ledger-node-transport-fail-loud',
  setup(build) {
    const nodeTransports =
      /^(node-hid|@ledgerhq\/hw-transport-node-hid-noevents|@ledgerhq\/hw-transport-webusb)(\/.*)?$/;
    build.onResolve({ filter: nodeTransports }, ({ path }) => ({
      path,
      namespace: 'ledger-node-transport-fail-loud',
    }));
    build.onLoad(
      { filter: /.*/, namespace: 'ledger-node-transport-fail-loud' },
      ({ path }) => ({
        contents: `const fail = () => {
  throw new Error(
    ${JSON.stringify(path)} +
      ' is not admitted into @lace-lib/vendor (ADR 37 trim: WebHID is the one' +
      ' Ledger transport) — a node/WebUSB transport was reached',
  );
};
// Import-safe, use-fatal (ADR 37): get/getPrototypeOf resolve to the proxy so
// the key-agent's module-scope capability binds evaluate (LedgerKeyAgent reads
// import_hw_transport_webusb.default.default; esbuild __toESM walks the proto),
// while apply/construct THROW so a node/WebUSB transport can never be opened or
// instantiated — WebHID stays the one USABLE transport.
const proxy = new Proxy(fail, {
  get: () => proxy,
  getPrototypeOf: () => proxy,
  apply: fail,
  construct: fail,
});
module.exports = proxy;
`,
        loader: 'js',
      }),
    );
  },
};

// @emurgo/cardano-message-signing-nodejs — an EVAL-SAFE recursive-proxy stub.
// @cardano-sdk/hardware-ledger's LedgerKeyAgent eagerly evaluates
// key-management's cip8 module, whose util.js CALLS @emurgo at module scope (the
// CoseLabel table: `MessageSigning.Label.new_text('address')` etc.), so cip8
// must now load REAL — the earlier fail-loud cip8 stub would starve
// LedgerKeyAgent of the cip8 symbols it imports. Only @emurgo is stubbed, and —
// unlike the empty alias it replaces — it must NOT throw at module load. The
// recursive proxy answers every get/apply/construct WITH ITSELF, so arbitrarily
// deep namespace chains (`.Label.new_text(...)`) resolve to a callable value and
// the CoseLabel table builds with inert values.
//   The getPrototypeOf trap is load-bearing, not decoration: esbuild imports
//   @emurgo as an ESM namespace via `__toESM(require(...))`, which builds a fresh
//   object `Object.create(getPrototypeOf(mod))` and copies only the module's OWN
//   keys. Namespace member access (`ns.Label`) therefore misses the proxy unless
//   the interop object INHERITS from it — so getPrototypeOf returns the proxy,
//   making `ns.Label → proxy.get → proxy`. Without it, `ns.Label` is undefined
//   and the CoseLabel table throws at import. Do not "simplify" this back to a
//   bare get/apply/construct proxy.
//   cip8's signCip8Data RUNTIME-uses pure-JS CborWriter cose helpers
// (createProtectedHeadersCbor/createCoseSign1Cbor/createCoseKeyCbor) +
// Cip30DataSignError, which work REAL. The one cip8 export whose RUNTIME rides
// @emurgo is cip30signData (InMemoryKeyAgent.signData) — the host never calls it
// (the sign-data surface reimplements CIP-8 via Serialization.CborWriter +
// signBlob), so its inert proxy return is never observed.
const emurgoMessageSigningStub = {
  name: 'emurgo-message-signing-stub',
  setup(build) {
    build.onResolve(
      { filter: /^@emurgo\/cardano-message-signing-nodejs$/ },
      ({ path }) => ({ path, namespace: 'emurgo-message-signing-stub' }),
    );
    build.onLoad(
      { filter: /.*/, namespace: 'emurgo-message-signing-stub' },
      () => ({
        contents: `const target = function () {};
const proxy = new Proxy(target, {
  get: () => proxy,
  apply: () => proxy,
  construct: () => proxy,
  getPrototypeOf: () => proxy,
});
module.exports = proxy;
`,
        loader: 'js',
      }),
    );
  },
};

// Exact-specifier `@trezor/connect-web` → `@trezor/connect-webextension` alias
// (/ ADR 37 — the seam-side move of the monolith's webpack `$`-alias,
// apps/lace-extension/webpack/base/common.webpack.config.js). The trezor-cardano
// entry's @cardano-sdk/hardware-trezor hard-codes `import '@trezor/connect-web'`
// (the DOM-required CoreInIframe target — SW-impossible, abandoned by the
// monolith); this redirects it to the DOM-free MV3 webextension variant's
// prebuilt, self-contained bundle (its `main`), so the aliased-away connect-web
// subtree never bundles AND the signer's internal Connect singleton is the same
// copy the /trezor-connect entry resolves. The exact-specifier filter (mirrors
// webpack's `$`) leaves subpaths like `@trezor/connect-web/popup` untouched.
// Resolved once from the workspace's node_modules (createRequire anchored at
// this script) — esbuild needs an absolute path back from onResolve.
const connectWebextensionMainPath = createRequire(import.meta.url).resolve(
  '@trezor/connect-webextension',
);
const trezorConnectWebAlias = {
  name: 'trezor-connect-web-alias',
  setup(build) {
    build.onResolve({ filter: /^@trezor\/connect-web$/ }, () => ({
      path: connectWebextensionMainPath,
    }));
  },
};

const result = await esbuild.build({
  absWorkingDir: root,
  entryPoints,
  outdir: 'dist',
  splitting: true,
  chunkNames: 'chunk-[hash]',
  // The wasm-bindgen plugin emits each engine `.wasm` as a `file`-loader asset;
  // hashing keeps the distinct nested engine copies from colliding on name.
  assetNames: '[name]-[hash]',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['chrome120'],
  minify: false,
  sourcemap: false,
  metafile: true,
  logLevel: 'info',
  inject: ['scripts/shims/node-globals.js'],
  // The Midnight engine tree hot-paths `process.env.NODE_ENV`; bake it here (the
  // host's former offscreen pass baked the same value) so the built /midnight
  // entry carries the production branch and the host build needs no NODE_ENV
  // define of its own.
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  alias: {
    // Node built-ins reached by the sdk's CJS deps (pbkdf2/chacha streams).
    stream: 'stream-browserify',
    events: 'events',
    // Empty stubs for node-only code paths never taken in the browser:
    // libsodium's emscripten ENVIRONMENT_IS_NODE branch (require('path'|'fs'|
    // 'crypto')). esbuild must resolve them statically even though the branches
    // are dead at runtime. (@emurgo/cardano-message-signing-nodejs is NOT an
    // empty alias — it is touched at module scope by cip8's util.js and must not
    // throw, so the emurgoMessageSigningStub plugin below handles it instead.)
    crypto: './scripts/shims/empty.cjs',
    path: './scripts/shims/empty.cjs',
    fs: './scripts/shims/empty.cjs',
  },
  plugins: [
    bip39EnglishOnly,
    libsodiumSkipDataUriFetch,
    ledgerNodeTransportFailLoud,
    emurgoMessageSigningStub,
    trezorConnectWebAlias,
    wasmBindgenPlugin(),
  ],
});

// The Trezor Connect content-script bridge (ADR 37) — a SEPARATE esbuild
// pass. The bridge relays the remote connect.trezor.io popup to the extension
// over chrome.runtime; a content script CANNOT participate in ESM `splitting`,
// so it is bundled STANDALONE as a no-minify IIFE asset from the package-shipped
// content script. It ships in the vendored dir alongside the split entries; the
// HOST later re-bundles it FROM that vendored copy as its own content-script
// entry, so it lands in the host metafile and check-closure polices it — never
// blind-copied (the monolith's CopyPlugin path would bypass the ADR-37 audit).
const trezorBridgeEntryPath = createRequire(import.meta.url).resolve(
  '@trezor/connect-webextension/build/content-script.js',
);
const bridge = await esbuild.build({
  absWorkingDir: root,
  entryPoints: [trezorBridgeEntryPath],
  outfile: 'dist/trezor-bridge.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  minify: false,
  sourcemap: false,
  metafile: true,
  logLevel: 'info',
});

const { outputs } = result.metafile;
// The review index + size log cover BOTH passes; the light-entry closure walk
// below stays on the split build's `outputs` (the bridge is not a split entry).
const allOutputs = { ...outputs, ...bridge.metafile.outputs };

// The top-level input package an input path belongs to: 'src' for this lib's
// own source, else the package name after the LAST `node_modules/` (@scope
// kept as two segments). Anything else (esbuild virtual namespaces, e.g. the
// emurgo / ledger-transport stubs) is reported verbatim — honest and
// deterministic.
const topLevelPackage = input => {
  const marker = 'node_modules/';
  const cut = input.lastIndexOf(marker);
  if (cut !== -1) {
    const rest = input.slice(cut + marker.length).split('/');
    return rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
  }
  if (input === 'src' || input.startsWith('src/')) return 'src';
  return input;
};

const packagesInOutput = output =>
  [...new Set(Object.keys(output.inputs ?? {}).map(topLevelPackage))].sort();

// The review index: every emitted JS output → the top-level packages it carries.
// Distilled from the metafile so a reviewer reads which trees landed where
// without parsing the bundle. Sorted keys for a deterministic diff.
const chunksMap = {};
for (const [file, output] of Object.entries(allOutputs)) {
  if (!file.endsWith('.js')) continue;
  chunksMap[basename(file)] = packagesInOutput(output);
}
const sortedChunksMap = Object.fromEntries(
  Object.keys(chunksMap)
    .sort()
    .map(key => [key, chunksMap[key]]),
);
writeFileSync(
  join(dist, 'chunks.map.json'),
  `${JSON.stringify(sortedChunksMap, null, 2)}\n`,
);

// Light-entry structural guard (ADR 37). For each pinned entry, walk its
// TRANSITIVE output closure (entry file + every chunk it imports, recursively)
// and fail loud if any forbidden top-level package leaked in. This is what
// makes "a light surface never pulls a heavy tree" a CI invariant, not a hope.
for (const [entry, forbidden] of Object.entries(LIGHT_ENTRY_EXCLUSIONS)) {
  const entryFile = `dist/${entry}.js`;
  if (!outputs[entryFile]) {
    throw new Error(
      `[vendor] LIGHT_ENTRY_EXCLUSIONS names entry "${entry}" but no output ` +
        `${entryFile} was emitted — the table is out of sync with entryPoints.`,
    );
  }
  const forbiddenSet = new Set(forbidden);
  const closure = new Set([entryFile]);
  const queue = [entryFile];
  while (queue.length > 0) {
    const file = queue.shift();
    for (const { path } of outputs[file]?.imports ?? []) {
      if (outputs[path] && !closure.has(path)) {
        closure.add(path);
        queue.push(path);
      }
    }
  }
  for (const file of closure) {
    for (const input of Object.keys(outputs[file]?.inputs ?? {})) {
      const pkg = topLevelPackage(input);
      if (forbiddenSet.has(pkg)) {
        throw new Error(
          `[vendor] light entry "${entry}" leaked forbidden package "${pkg}" ` +
            `— reached via ${input} bundled into ${file}. A light surface must ` +
            `not pull a heavy tree (ADR 37); route it through its own entry.`,
        );
      }
    }
  }
}

// Self-contained per-entry .d.ts for the privileged consumer's type-check.
// Workspace members resolve src/ directly; these declarations mirror the same
// surface for the file:-dir form the host vendors.
execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json'], {
  cwd: root,
  stdio: 'inherit',
});

for (const [file, output] of Object.entries(allOutputs)) {
  if (!file.endsWith('.js')) continue;
  console.log(
    `[vendor] ${file} ${(output.bytes / 1_048_576).toFixed(2)} MB (no-minify)`,
  );
}
console.log(
  `[vendor] ${Object.keys(entryPoints).length} entrypoint(s), ` +
    `${Object.keys(result.metafile.inputs).length} inputs`,
);
