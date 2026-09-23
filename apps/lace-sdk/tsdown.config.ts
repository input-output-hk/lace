import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import nodePolyfills from '@rolldown/plugin-node-polyfills';
import { defineConfig } from 'tsdown';

import type { Plugin } from 'rolldown';

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

// @cardano-sdk/key-management depends on @emurgo/cardano-message-signing-nodejs
// which loads WASM via fs.readFileSync (Node-only). The CIP-8 signData bindings
// call WASM at module evaluation time (Label.new_text(...)), so we can't defer
// initialization. Stub with a recursive proxy that absorbs any property/call chain.
const STUB_MSG_SIGNING_ID = '\0stub-cardano-message-signing';
const stubCardanoMessageSigning: Plugin = {
  name: 'stub-cardano-message-signing',
  resolveId(source) {
    if (source === '@emurgo/cardano-message-signing-nodejs') {
      return { id: STUB_MSG_SIGNING_ID };
    }
    return null;
  },
  load(id) {
    if (id === STUB_MSG_SIGNING_ID) {
      return `function stub() { return new Proxy(stub, { get: () => stub }); }
export const AlgorithmId = stub();
export const CBORValue = stub();
export const COSEKey = stub();
export const COSESign1Builder = stub();
export const CurveType = stub();
export const HeaderMap = stub();
export const Headers = stub();
export const Int = stub();
export const KeyType = stub();
export const Label = stub();
export const ProtectedHeaderMap = stub();
export default stub();`;
    }
    return null;
  },
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
// Uint8Array values. This breaks @cardano-sdk/key-management's emip3encrypt
// (creates Uint8Array for salt/nonce then calls Buffer.concat).
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

const inputOptions = { resolve: { alias: resolveAlias } };
// fixCjsInterop, fixBufferPolyfill, fixUtilTextCodecs must come before nodePolyfills to take priority
const plugins = [
  fixCjsInterop,
  stubCardanoMessageSigning,
  fixBufferPolyfill,
  fixUtilTextCodecs,
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

// The Midnight packages ship WebAssembly a JS bundle cannot inline, so both
// @midnight scopes stay external. They are imported only from lazily loaded
// passport-account chunks; a consumer registering the Passport module
// installs them alongside the SDK. @polkadot backs the passport node relay
// submitter, ships Node-conditioned transport code the browser bundle cannot
// inline, and arrives transitively with the Midnight wallet stack, so it
// stays external under the same rule.
const MIDNIGHT_EXTERNAL = [
  /^@midnight-ntwrk\//,
  /^@midnightntwrk\//,
  /^@polkadot\//,
];

// Static import/require specifiers, one line each in tsdown's unminified
// output. Dynamic import(...) deliberately doesn't match: `import` must be
// followed by whitespace or a quoted specifier, never by `(`.
const STATIC_SPECIFIER_PATTERNS = [
  /^\s*import\s[^;]*?from\s*['"]([^'"]+)['"]/,
  /^\s*import\s*['"]([^'"]+)['"]/,
  /^\s*export\s[^;]*?from\s*['"]([^'"]+)['"]/,
];
// A require preceded by `=>` is rolldown's CJS lowering of dynamic
// import() -- `Promise.resolve().then(() => require(...))` -- which only
// resolves when called, so it is not a static edge.
const REQUIRE_PATTERN = /(?<!=>\s*)require\(\s*['"]([^'"]+)['"]\s*\)/g;

const staticSpecifiers = (code: string): string[] => {
  const specifiers: string[] = [];
  for (const line of code.split('\n')) {
    for (const pattern of STATIC_SPECIFIER_PATTERNS) {
      const match = pattern.exec(line);
      if (match) specifiers.push(match[1]);
    }
    for (const match of line.matchAll(REQUIRE_PATTERN)) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
};

// Midnight packages are external and absent from the SDK's dependency list,
// so a Midnight specifier statically reachable from the entry chunk breaks
// `import '@input-output-hk/lace-sdk'` for every consumer that doesn't have
// them installed. Walk the entry's static-import closure; chunks reached
// only via dynamic import() may reference Midnight freely.
const findStaticMidnightImports = (
  distDir: string,
  entry: string,
): string[] => {
  const violations: string[] = [];
  const visited = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (visited.has(file)) continue;
    visited.add(file);
    const code = fs.readFileSync(path.join(distDir, file), 'utf8');
    const specifiers = staticSpecifiers(code);
    if (file === entry && !specifiers.some(s => s.startsWith('.'))) {
      throw new Error(
        `Static import scan found no relative imports in ${entry}; the output shape no longer matches the line-based patterns and the Midnight check would pass vacuously`,
      );
    }
    for (const specifier of specifiers) {
      if (specifier.startsWith('.')) {
        queue.push(path.normalize(path.join(path.dirname(file), specifier)));
      } else if (MIDNIGHT_EXTERNAL.some(pattern => pattern.test(specifier))) {
        violations.push(`${file}: static import of "${specifier}"`);
      }
    }
  }
  return violations;
};

const assertNoForbiddenPackages = {
  'build:done': async () => {
    const distDir = path.resolve(__dirname, 'dist');
    const files = fs.readdirSync(distDir).filter(f => /\.[cm]?js$/.test(f));
    const violations: string[] = [];
    for (const file of files) {
      const code = fs.readFileSync(path.join(distDir, file), 'utf8');
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
    if (violations.length > 0) {
      throw new Error(
        `Forbidden packages detected in SDK bundle (headless SDK must not depend on React/React Native/Expo):\n  ${violations.join(
          '\n  ',
        )}`,
      );
    }
    const midnightViolations = ['index.js', 'index.cjs'].flatMap(entry =>
      findStaticMidnightImports(distDir, entry),
    );
    if (midnightViolations.length > 0) {
      throw new Error(
        `Midnight packages statically reachable from the SDK entry (they are external and must only be reached through dynamic import()):\n  ${midnightViolations.join(
          '\n  ',
        )}`,
      );
    }
  },
};

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false,
  platform: 'browser',
  target: 'es2022',
  clean: true,
  external: [...FORBIDDEN_EXTERNAL, ...MIDNIGHT_EXTERNAL],
  plugins,
  inputOptions,
  hooks: assertNoForbiddenPackages,
});
