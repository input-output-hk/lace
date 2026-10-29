import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import nodePolyfills from '@rolldown/plugin-node-polyfills';
import { defineConfig } from 'tsdown';

import type { Plugin } from 'rolldown';

import {
  CANARY_ONLY_ENTRIES,
  channelEntryNames,
  channelPublishedPeers,
  entrySource,
} from './scripts/entries.mjs';
import {
  findStaticMidnightImports,
  undeclaredPackageRequires,
} from './src/scan-static-midnight-imports.ts';
import { useLaceioCardano } from './scripts/laceio-cardano.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nm = (...segments: string[]) =>
  path.resolve(__dirname, '../../node_modules', ...segments);

const resolveAlias = {
  // rolldown can't resolve @scure/bip39 subpath exports from monorepo context.
  '@scure/bip39/wordlists/english.js': nm('@scure/bip39/wordlists/english.js'),
  // uuid v11's exports map lists the `node` condition before `browser`, so the
  // build's active node condition wins and pulls dist/esm/* which does
  // `import { randomFillSync } from 'crypto'` — a named export the crypto
  // polyfill doesn't provide. The browser build uses the global Web Crypto API
  // (crypto.getRandomValues/randomUUID) and needs no polyfill.
  uuid: nm('uuid/dist/esm-browser/index.js'),
};

// The nodePolyfills plugin wraps `inherits` as an ESM default export, which
// breaks CJS code that does `var inherits = require("inherits"); inherits(A, B)`.
// Override with the actual CJS package that uses `module.exports = function`.
// The nodePolyfills plugin wraps several CJS packages as ESM modules, which
// breaks code that does `var X = require("x"); X(...)` or `inherits(A, X)`.
// Override with the actual CJS packages that use `module.exports = ...`.
const cjsOverrides: Record<string, string> = {
  inherits: nm('inherits/inherits_browser.js'),
  'inherits/inherits_browser.js': nm('inherits/inherits_browser.js'),
  stream: nm('stream-browserify/index.js'),
  'node:stream': nm('stream-browserify/index.js'),
};
const fixCjsInterop: Plugin = {
  name: 'fix-cjs-interop',
  resolveId(source) {
    const override = cjsOverrides[source];
    return override ? { id: override } : null;
  },
};

// The nodePolyfills built-in Buffer (`\0polyfill-node.buffer`) doesn't handle
// Uint8Array in Buffer.concat — it uses `internalIsBuffer` which rejects plain
// Uint8Array values, which bundled code passes it.
// Replace with the npm `buffer` package (v6) which converts Uint8Array properly.
const BUFFER_PATCH_ID = '\0polyfill-buffer-patch';
const fixBufferPolyfill: Plugin = {
  name: 'fix-buffer-polyfill',
  resolveId(source) {
    if (
      source === 'buffer' ||
      source === 'node:buffer' ||
      source === '\0polyfill-node.buffer'
    ) {
      return { id: BUFFER_PATCH_ID };
    }
    return null;
  },
  load(id) {
    if (id === BUFFER_PATCH_ID) {
      return `export { Buffer, SlowBuffer, INSPECT_MAX_BYTES, kMaxLength } from '${nm(
        'buffer/index.js',
      )}';
import { Buffer as _B } from '${nm('buffer/index.js')}';
// nodePolyfills' inline shims (assert, to-arraybuffer) import a top-level
// isBuffer from 'buffer', which the npm package doesn't export.
export const isBuffer = (b) => _B.isBuffer(b);
export default { Buffer: _B };`;
    }
    return null;
  },
};

// The nodePolyfills `util` shim doesn't export TextDecoder/TextEncoder, but
// Node code (e.g. `buffer`) destructures them from require("util").
// Patch the polyfill to re-export the native browser globals.
const UTIL_PATCH_ID = '\0polyfill-util-patch';
const fixUtilTextCodecs: Plugin = {
  name: 'fix-util-text-codecs',
  resolveId(source) {
    if (source === 'util' || source === 'node:util') {
      return { id: UTIL_PATCH_ID };
    }
    return null;
  },
  load(id) {
    if (id === UTIL_PATCH_ID) {
      // Re-export everything from the real polyfill, plus browser globals
      return `export * from '\0polyfill-node.util';
export { default } from '\0polyfill-node.util';
export const TextDecoder = globalThis.TextDecoder;
export const TextEncoder = globalThis.TextEncoder;`;
    }
    return null;
  },
};

// The nodePolyfills `crypto` shim is an empty module. Bundled libsodium takes
// its random source from `window` or `self` and otherwise falls back to
// `require('crypto').randomBytes`, so in plain Node, where neither global
// exists, it fails with "No secure random number generator found". Supply a
// `randomBytes` backed by the Web Crypto API, which browsers and Node 20+
// both provide. Browser code still finds `window.crypto` or `self.crypto`
// first and does not reach it. The CommonJS output uses nodeCryptoBuiltin
// instead.
const WEB_CRYPTO_RANDOM_BYTES_ID = '\0web-crypto-random-bytes';
const webCryptoRandomBytes: Plugin = {
  name: 'web-crypto-random-bytes',
  resolveId(source) {
    return source === 'crypto' ? { id: WEB_CRYPTO_RANDOM_BYTES_ID } : null;
  },
  load(id) {
    if (id !== WEB_CRYPTO_RANDOM_BYTES_ID) return null;
    return `import { Buffer } from 'buffer';
// getRandomValues fills at most 65536 bytes per call.
const MAX_BYTES_PER_CALL = 65536;
const fill = size => {
  const bytes = Buffer.alloc(size);
  for (let offset = 0; offset < size; offset += MAX_BYTES_PER_CALL) {
    globalThis.crypto.getRandomValues(
      bytes.subarray(offset, offset + MAX_BYTES_PER_CALL),
    );
  }
  return bytes;
};
export const randomBytes = (size, callback) => {
  if (typeof callback !== 'function') return fill(size);
  let result;
  try {
    result = [null, fill(size)];
  } catch (error) {
    result = [error];
  }
  queueMicrotask(() => callback(...result));
};
export default { randomBytes };`;
  },
};

// tsdown builds the CommonJS output for the `node` platform, so it bundles the
// Node variants of packages such as create-hash, create-hmac and pbkdf2. They
// need the real `crypto` module, with createHash, createHmac and pbkdf2Sync,
// which no browser shim provides. That output serves only `require()`, so
// `crypto` stays the Node built-in there.
const NODE_CRYPTO_ID = 'node:crypto';
const nodeCryptoBuiltin: Plugin = {
  name: 'node-crypto-builtin',
  resolveId(source) {
    return source === 'crypto' ? { id: NODE_CRYPTO_ID, external: true } : null;
  },
};

// The nodePolyfills `global` shim reads `global`, `self` or `window`. Its own
// `global` is injected as the shim itself, so in plain Node, which defines
// neither `self` nor `window`, it is an empty object. Bundled pbkdf2 then
// finds no `process.nextTick`, `queueMicrotask` or `setTimeout` on it, and
// deriving a key from mnemonic words fails. `globalThis` is the same object
// as `self` or `window` wherever those exist.
const GLOBAL_THIS_ID = '\0polyfill-global-this';
const globalThisPolyfill: Plugin = {
  name: 'global-this-polyfill',
  resolveId(source) {
    return source === '\0polyfill-node.global'
      ? { id: GLOBAL_THIS_ID, moduleSideEffects: false }
      : null;
  },
  load(id) {
    return id === GLOBAL_THIS_ID ? 'export default globalThis;' : null;
  },
};

// lodash has no `exports` map, so Node's ESM loader finds its modules only by
// file name: `lodash/isEqual` fails to load where `lodash/isEqual.js` works.
// Bundlers accept both, so every emitted lodash import names the file.
const LODASH_MODULE = /^lodash\/[^./]+$/;
// Bitcoin is canary (ADR 66), and neither the Cardano entry nor anything it
// imports may hold Bitcoin code (test/check-cardano-bundle.mjs). The codecs
// both chains use therefore form a chunk of their own: otherwise the bundler
// can merge one, such as bech32, into a chunk that also holds the Bitcoin
// library, and the Cardano entry would import Bitcoin code to reach it. A
// group also takes its modules' dependencies, and these depend on no Bitcoin
// code.
// The workspace's own copies only, with what they install under their own
// node_modules (bs58's base-x): a package can install another copy under its
// own node_modules (passport-account does, for @noble/hashes; the Bitcoin
// libraries do, for bs58), which belongs to that package's code, not to the
// shared chunk.
const CODEC = String.raw`(?:bech32|base-x|bs58|@noble[/\\]hashes)`;
const SHARED_CODEC_PATH = new RegExp(
  String.raw`^(?:${CODEC}[/\\]node_modules[/\\])?${CODEC}[/\\]`,
);
const SHARED_CODEC_MODULE = (id: string) =>
  id.startsWith(nm() + path.sep) &&
  SHARED_CODEC_PATH.test(id.slice(nm().length + 1));
const outputOptions = {
  paths: (id: string) => (LODASH_MODULE.test(id) ? `${id}.js` : id),
  codeSplitting: {
    groups: [{ name: 'codecs', test: SHARED_CODEC_MODULE }],
  },
};

// The node polyfills plugin gives each module that reads __dirname or
// __filename a randomly named module holding its absolute directory, which
// writes the build machine's paths into the bundle and makes no two builds
// alike. Both resolve here to one fixed module instead: the bundle runs in
// browsers, and the code that reads them (libsodium's Node branch) embeds its
// WebAssembly and never uses the value.
const NODE_PATH_ID = '\0lace-sdk:node-path';
const deterministicNodePaths: Plugin = {
  name: 'deterministic-node-paths',
  resolveId: source => (source === NODE_PATH_ID ? source : null),
  load: id => (id === NODE_PATH_ID ? "export default '/';" : null),
};
// The build channel (ADR 66). Stable bundles index.ts, cardano.ts and
// bitcoin.ts; canary bundles their twins, which add the canary exports, and
// the canary-only entries (scripts/entries.mjs).
const CHANNEL = process.env.SDK_CHANNEL ?? 'stable';
if (CHANNEL !== 'stable' && CHANNEL !== 'canary') {
  throw new Error(`SDK_CHANNEL must be stable or canary, not ${CHANNEL}`);
}

// The stable build resolves a workspace file's `.stable` variant first
// (scripts/reach.mjs, moduleSuffixes), as its declaration build does.
const RESOLVE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.json'];
const SIDE_EFFECT_FREE_EXTERNAL =
  /^(?:@laceio\/cardano|@midnightntwrk\/wallet-sdk-hd)(?:\/|$)/;
const inputOptions = {
  resolve: {
    alias: resolveAlias,
    extensions:
      CHANNEL === 'stable'
        ? [
            ...RESOLVE_EXTENSIONS.filter(extension =>
              /^\.tsx?$/.test(extension),
            ).map(extension => `.stable${extension}`),
            ...RESOLVE_EXTENSIONS,
          ]
        : RESOLVE_EXTENSIONS,
  },
  transform: { inject: { __dirname: NODE_PATH_ID, __filename: NODE_PATH_ID } },
  // An external import nothing uses is dropped only when the package is
  // known to have no side effects on import. These have none, so a chunk
  // that uses only the Cardano names of @lace-lib/vendor's Cardano seam
  // imports neither the Midnight HD wallet, which must stay behind a dynamic
  // import(), nor a Cardano subpath it does not use.
  treeshake: {
    moduleSideEffects: [
      { test: SIDE_EFFECT_FREE_EXTERNAL, external: true, sideEffects: false },
    ],
  },
};
// fixCjsInterop, fixBufferPolyfill, fixUtilTextCodecs, webCryptoRandomBytes
// and globalThisPolyfill must come before nodePolyfills to take priority
// Canary features live in directories of their own under src/, which only the
// canary sources export from: the `.canary` twins of the entries, the
// canary-only entries and canary.ts. Stable output must contain no module from
// them, so an app on stable carries no canary code rather than merely calling
// none.
const CANARY_SOURCES = [
  ...new Set([
    ...fs
      .readdirSync(path.resolve(__dirname, 'src'))
      .filter(file => /^(?:.+\.)?canary\.ts$/.test(file)),
    ...CANARY_ONLY_ENTRIES.map(({ name }) =>
      path.relative('src', entrySource(name, 'canary')),
    ),
  ]),
];
const CANARY_DIRECTORIES = [
  ...new Set(
    CANARY_SOURCES.flatMap(source => [
      ...fs
        .readFileSync(path.resolve(__dirname, 'src', source), 'utf8')
        .matchAll(/from '\.\/([^/']+)\//g),
    ]).map(([, directory]) => directory),
  ),
].map(directory => path.resolve(__dirname, 'src', directory) + path.sep);
const assertStableExcludesCanary: Plugin = {
  name: 'assert-stable-excludes-canary',
  generateBundle(_options, bundle) {
    if (CHANNEL !== 'stable') return;
    const leaked = Object.values(bundle)
      .flatMap(output => ('moduleIds' in output ? output.moduleIds : []))
      .filter(id => CANARY_DIRECTORIES.some(dir => id.startsWith(dir)));
    if (leaked.length > 0) {
      throw new Error(
        `The stable build bundles canary modules:\n  ${[
          ...new Set(leaked),
        ].join('\n  ')}`,
      );
    }
  },
};

// The contract packages whose contract the build bundles: the contracts its
// modules implement or depend on. The declaration build flattens the
// augmentations of these contract packages only (rollup.dts.config.mjs), so
// the published types describe the state, dependencies and addons of the
// contracts the SDK loads, not of every contract its code names a type from.
const CONTRACT_MODULE =
  /[/\\]packages[/\\]contract[/\\]([^/\\]+)[/\\]src[/\\]contract\.tsx?$/;
const recordBundledContracts: Plugin = {
  name: 'record-bundled-contracts',
  generateBundle(_options, bundle) {
    const packages = [
      ...new Set(
        Object.values(bundle)
          .flatMap(output => ('moduleIds' in output ? output.moduleIds : []))
          .flatMap(id => {
            const match = CONTRACT_MODULE.exec(id);
            return match ? [`packages/contract/${match[1]}`] : [];
          }),
      ),
    ].sort();
    fs.mkdirSync(path.join(__dirname, 'dist/.dts-work'), { recursive: true });
    fs.writeFileSync(
      path.join(__dirname, 'dist/.dts-work/bundled-contracts.json'),
      JSON.stringify(packages, undefined, 2) + '\n',
    );
  },
};

const manifest = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'),
) as { dependencies?: object; peerDependencies?: object };
const declaredPackages = {
  ...manifest.dependencies,
  ...manifest.peerDependencies,
  ...channelPublishedPeers(CHANNEL),
};

const plugins = [
  useLaceioCardano,
  assertStableExcludesCanary,
  recordBundledContracts,
  deterministicNodePaths,
  fixCjsInterop,
  fixBufferPolyfill,
  fixUtilTextCodecs,
  webCryptoRandomBytes,
  globalThisPolyfill,
  nodePolyfills(),
];

// Fail the build if any output file references React, React Native, or Expo.
// The SDK is headless — these must never appear in the bundle.
// `external` ensures React imports stay as bare references (not inlined),
// and this hook detects those references after writing.
// Patterns without anchors — for embedding in larger regexes (assertion hook).
const FORBIDDEN_PACKAGE_PATTERNS = [
  /react([/\-].+)?/,
  /expo([/\-].+)?/,
  /webextension-polyfill/,
  /@react-navigation\/.+/,
  /@react-native-[^/]+(\/.+)?/,
  /@lodev09\/.+/,
  /@gorhom\/.+/,
  /@lace-lib\/navigation/,
  /@lace-lib\/ui-toolkit/,
];
// With anchors — for rolldown's `external` which tests against full specifiers
// (e.g. "react/jsx-runtime", "react-dom/client", "expo/config").
const FORBIDDEN_EXTERNAL = FORBIDDEN_PACKAGE_PATTERNS.map(
  p => new RegExp(`^${p.source}$`),
);

// The Midnight WASM packages and the relay's Node-conditioned Polkadot
// transport stay external in both outputs: a bundle cannot carry WASM
// binaries, Polkadot's Node build needs the real platform (no browser
// shims), and both load under require(). The canary CommonJS output requires
// them directly, so package.json declares them as optional peers; Cardano
// never reaches them.
const MIDNIGHT_WASM_EXTERNAL = [
  /^@midnight-ntwrk\//,
  /^@midnightntwrk\/(?:ledger|onchain-runtime)-v\d+/,
  /^@polkadot\//,
];
// The Midnight wallet SDK packages publish import-only export maps, so
// require() cannot resolve them. Engine code imports them statically (ADR 25:
// no import() in service-worker code), the ESM output imports them from the
// consumer's install, and the canary CommonJS output bundles them. None of
// them uses top-level await, which a CommonJS bundle could not express. The
// stable build reaches none of them and keeps them external.
const MIDNIGHT_IMPORT_ONLY = [
  /^@midnightntwrk\/wallet-sdk(?:-[\w-]+)?(?:\/|$)/,
];
// A bundle may inline only permissively licensed code (the package is
// Apache-2.0 and carries no third-party licence texts; see
// test/check-bundled-licences.mjs). `wallet-sdk-address-format` depends on
// the GPL-3.0-or-later `@subsquid/*` packages, plain CommonJS that loads under
// require(), so they stay external and `@subsquid/scale-codec` is a declared
// optional peer; the ESM output never reaches them.
const NON_PERMISSIVE_EXTERNAL = [/^@subsquid\//];
const BUNDLES_IMPORT_ONLY = (format: 'esm' | 'cjs') =>
  format === 'cjs' && CHANNEL === 'canary';
// The bundled wallet SDK reaches Node builtins (its prover client's worker
// and msgpack code) that the browser shims below cannot serve: readFileSync,
// pathToFileURL, createRequire. The CommonJS output runs in Node only, so
// those stay the real modules for the modules of that graph, as `crypto`
// does for every module; the Cardano and Bitcoin code keeps the shims it has
// on stable.
const CJS_NODE_BUILTINS = new Set([
  'fs',
  'module',
  'os',
  'path',
  'url',
  'util',
  'vm',
  'worker_threads',
]);
const BUNDLED_WALLET_SDK_IMPORTER =
  /[/\\]node_modules[/\\](?:@midnightntwrk[/\\]wallet-sdk|web-worker|msgpackr|@effect[/\\]platform)/;
const nodeBuiltinsForCjs: Plugin = {
  name: 'node-builtins-for-cjs',
  resolveId(source, importer) {
    if (!importer || !BUNDLED_WALLET_SDK_IMPORTER.test(importer)) return null;
    const name = source.replace(/^node:/, '');
    return CJS_NODE_BUILTINS.has(name)
      ? { id: `node:${name}`, external: true }
      : null;
  },
};

// The declared dependencies the output imports, so that a consumer shares one
// copy of each with the SDK. package.json also declares packages only so that
// the types the published declarations import from them resolve, at the
// versions the bundle inlines. tsdown would externalize those as well and
// bypass the stubs and polyfills above, so every other package stays in the
// bundle.
const EXTERNAL_DEPENDENCIES =
  /^(?:@laceio\/cardano|@reduxjs\/toolkit|lodash|redux-observable|redux-persist|rxjs|ts-custom-error|ts-log)(?:\/|$)/;
const deps = (format: 'esm' | 'cjs') => ({
  neverBundle: [
    ...FORBIDDEN_EXTERNAL,
    ...MIDNIGHT_WASM_EXTERNAL,
    ...NON_PERMISSIVE_EXTERNAL,
    ...(BUNDLES_IMPORT_ONLY(format) ? [] : MIDNIGHT_IMPORT_ONLY),
  ],
  alwaysBundle: (id: string) => !EXTERNAL_DEPENDENCIES.test(id),
  skipNodeModulesBundle: false,
});

// A bundle cannot load a native .node addon, and an optional one that is
// installed on one machine and not on another makes the output depend on
// where it was built.
const NATIVE_ADDON_CODE =
  /chacha-native|bindings\.node|\.node["']\)|node-gyp-build/;

const assertNoForbiddenPackages = {
  'build:done': async () => {
    const distDir = path.resolve(__dirname, 'dist');
    const files = fs.readdirSync(distDir).filter(f => /\.[cm]?js$/.test(f));
    const violations: string[] = [];
    for (const file of files) {
      const code = fs.readFileSync(path.join(distDir, file), 'utf8');
      // The canary CommonJS output bundles the import-only Midnight packages;
      // a require() of one cannot resolve for a consumer. Checking every
      // chunk also covers account startup paths the empty-wallet probe skips.
      if (
        BUNDLES_IMPORT_ONLY('cjs') &&
        /require\(\s*['"]@midnightntwrk\/wallet-sdk/.test(code)
      ) {
        violations.push(
          `${file}: require() of an import-only Midnight package`,
        );
      }
      for (const pkg of FORBIDDEN_PACKAGE_PATTERNS) {
        const patterns = [
          new RegExp(`from\\s+['"](${pkg.source})(?:/[^'"]*)?['"]`, 'm'),
          new RegExp(
            `require\\(\\s*['"](${pkg.source})(?:/[^'"]*)?['"]\\s*\\)`,
            'm',
          ),
        ];
        for (const pattern of patterns) {
          const match = pattern.exec(code);
          if (match) {
            violations.push(`${file}: import of "${match[1]}"`);
          }
        }
      }
    }
    const nativeAddonFiles = files.flatMap(file => {
      const match = NATIVE_ADDON_CODE.exec(
        fs.readFileSync(path.join(distDir, file), 'utf8'),
      );
      return match ? [`${file}: ${match[0]}`] : [];
    });
    if (nativeAddonFiles.length > 0) {
      throw new Error(
        `Native addon code in SDK bundle (a bundle cannot load a .node addon):\n  ${nativeAddonFiles.join(
          '\n  ',
        )}`,
      );
    }
    if (violations.length > 0) {
      throw new Error(
        `Forbidden packages detected in SDK bundle (headless SDK must not depend on React/React Native/Expo):\n  ${violations.join(
          '\n  ',
        )}`,
      );
    }
    // The stable Bitcoin entry is empty.
    const midnightViolations = channelEntryNames(CHANNEL)
      .filter(entry => CHANNEL === 'canary' || entry !== 'bitcoin')
      .filter(
        entry =>
          !CANARY_ONLY_ENTRIES.some(
            ({ name, importsMidnight }) => name === entry && importsMidnight,
          ),
      )
      .flatMap(entry => [`${entry}.js`, `${entry}.cjs`])
      .flatMap(entry => findStaticMidnightImports(distDir, entry));
    if (midnightViolations.length > 0) {
      throw new Error(
        `Midnight packages statically reachable from the SDK entry (they are external and must only be reached through dynamic import()):\n  ${midnightViolations.join(
          '\n  ',
        )}`,
      );
    }
    if (BUNDLES_IMPORT_ONLY('cjs')) {
      // The ESM Midnight entry imports the wallet SDK packages from the
      // consumer's install, wherever the engine sits in its chunk graph; the
      // CommonJS entry carries them.
      const importOnly = (entry: string) =>
        findStaticMidnightImports(distDir, entry, { lazyChunks: true }).filter(
          violation =>
            MIDNIGHT_IMPORT_ONLY.some(pattern =>
              pattern.test(violation.replace(/^.*static import of "/, '')),
            ),
        );
      if (importOnly('midnight.js').length === 0) {
        throw new Error(
          'The ESM Midnight entry bundles the Midnight wallet SDK packages instead of importing them',
        );
      }
      const bundledInCjs = importOnly('midnight.cjs');
      if (bundledInCjs.length > 0) {
        throw new Error(
          `The CommonJS Midnight entry requires import-only Midnight packages:\n  ${bundledInCjs.join(
            '\n  ',
          )}`,
        );
      }
    }
    // Every package an entry requires or lazily imports, including through a
    // bundled dependency, must be declared, so that a consumer's install
    // holds it: a bundle moves its dependencies' import sites into this
    // package.
    const undeclared = channelEntryNames(CHANNEL)
      .flatMap(entry => [`${entry}.js`, `${entry}.cjs`])
      .flatMap(file =>
        undeclaredPackageRequires(distDir, file, declaredPackages).map(
          violation => `${file}: ${violation}`,
        ),
      );
    if (undeclared.length > 0) {
      throw new Error(
        `SDK entries import packages that package.json does not declare:\n  ${undeclared.join(
          '\n  ',
        )}`,
      );
    }
  },
};

export default defineConfig({
  entry: Object.fromEntries(
    channelEntryNames(CHANNEL).map(entry => [
      entry,
      entrySource(entry, CHANNEL),
    ]),
  ),
  // nodeCryptoBuiltin comes before webCryptoRandomBytes to take priority
  format: {
    esm: { plugins, deps: deps('esm') },
    cjs: {
      plugins: [
        nodeCryptoBuiltin,
        ...(BUNDLES_IMPORT_ONLY('cjs') ? [nodeBuiltinsForCjs] : []),
        ...plugins,
      ],
      deps: deps('cjs'),
    },
  },
  dts: false,
  platform: 'browser',
  target: 'es2022',
  clean: true,
  inputOptions,
  outputOptions,
  hooks: assertNoForbiddenPackages,
});
