/**
 * Metro resolution rewrites the RealFi partner-SDK dependency graph needs,
 * shared by the lace-mobile and lace-extension metro configs (previously
 * duplicated in both).
 *
 * 1. @sinclair/typebox (via @realfi-co/realfi-partner-sdk →
 *    @blaze-cardano/data): ESM build → CJS build. The ESM build exports
 *    bindings literally named `Object` (`export var Object = _Object`) and
 *    imports them across its own modules, shadowing the global inside those
 *    module scopes. Babel-generated code compiled into the same scope — the
 *    ESM→CJS interop preamble (`Object.defineProperty(exports, …)`) and
 *    downleveled object spreads (`Object.assign`) — then binds to the shadow
 *    and crashes at boot. The CJS build has no import bindings, so generated
 *    `Object.*` references always hit the global. Rewriting the resolved path
 *    (rather than aliasing the package) covers subpath imports.
 *
 *    Scope: ONLY the workspace-root typebox copy — the one the RealFi graph
 *    resolves. A package's own nested copy (e.g. @trezor/schema-utils pins
 *    typebox 0.31, CJS-only today) must keep resolving untouched: a future
 *    nested copy that ships `build/esm` would otherwise be silently rewritten
 *    under its owner package's feet.
 *
 * 2. @blaze-cardano/data must follow typebox to CJS: its ESM entry does
 *    `export * from "@sinclair/typebox"`, and Metro expands star re-exports
 *    statically from the dependency's `export` statements — a CJS dependency
 *    has none, so the re-export would be silently dropped and consumers of
 *    `Data.Type` would crash. The CJS entry copies typebox's exports at
 *    runtime instead, which Metro preserves.
 *
 * Returns a replacement resolution, or `undefined` when the input resolution
 * should stand.
 */
const fs = require('fs');

const rewriteRealfiEsmToCjs = resolution => {
  if (resolution?.type !== 'sourceFile') return undefined;
  const typeboxEsm = resolution.filePath.match(
    /(.*\/@sinclair\/typebox\/build\/)esm(\/.*)\.mjs$/,
  );
  const isWorkspaceRootCopy =
    (resolution.filePath.match(/node_modules/g) ?? []).length === 1;
  if (typeboxEsm && isWorkspaceRootCopy) {
    const cjsPath = `${typeboxEsm[1]}cjs${typeboxEsm[2]}.js`;
    if (fs.existsSync(cjsPath)) {
      return { type: 'sourceFile', filePath: cjsPath };
    }
  }
  if (resolution.filePath.endsWith('/@blaze-cardano/data/dist/index.mjs')) {
    return {
      type: 'sourceFile',
      filePath: resolution.filePath.replace(/\.mjs$/, '.js'),
    };
  }
  return undefined;
};

module.exports = { rewriteRealfiEsmToCjs };
