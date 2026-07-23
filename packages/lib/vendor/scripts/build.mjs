#!/usr/bin/env node
// Builds @lace-lib/vendor into a self-contained, NO-MINIFY browser bundle —
// the ADR-37 audit artifact. The trusted @cardano-sdk surface admitted into
// the privileged host is inlined into ONE reviewable file, so an SDK bump
// surfaces as a real code diff (not just a version-string change). This is
// what makes "audit the actual production code" true rather than "pin and
// trust the registry".
//
// The build runs in the WORKSPACE (the root resolves @cardano-sdk), and the
// browser shims (Buffer/process/stream + node-built-in stubs) are baked in
// HERE — so the host consumes a browser-ready bundle and @cardano-sdk NEVER
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
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

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

const result = await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['chrome120'],
  minify: false,
  sourcemap: false,
  metafile: true,
  logLevel: 'info',
  inject: ['scripts/shims/node-globals.js'],
  define: { global: 'globalThis' },
  alias: {
    // Node built-ins reached by the sdk's CJS deps (pbkdf2/chacha streams).
    stream: 'stream-browserify',
    events: 'events',
    // Empty stubs for node-only code paths never taken in the browser:
    // libsodium's emscripten ENVIRONMENT_IS_NODE branch (require('path'|'fs'|
    // 'crypto')) and the CIP-8/COSE wasm loader. esbuild must resolve them
    // statically even though the branches are dead at runtime.
    crypto: './scripts/shims/empty.cjs',
    path: './scripts/shims/empty.cjs',
    fs: './scripts/shims/empty.cjs',
    '@emurgo/cardano-message-signing-nodejs': './scripts/shims/empty.cjs',
  },
  plugins: [bip39EnglishOnly],
});

// Self-contained .d.ts for the privileged consumer's type-check. Workspace
// members resolve src/index.ts directly; this declaration mirrors the same
// surface for the file:-dir form the host vendors.
execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json'], {
  cwd: root,
  stdio: 'inherit',
});

const bytes = Object.values(result.metafile.outputs).reduce(
  (sum, output) => sum + output.bytes,
  0,
);
console.log(
  `[vendor] dist/index.js ${(bytes / 1_048_576).toFixed(2)} MB ` +
    `(no-minify, ${Object.keys(result.metafile.inputs).length} inputs)`,
);
