# Contributing to lace-sdk

## Build System

This package uses [tsdown](https://tsdown.dev) (Rolldown-based bundler) to produce two distribution targets from TypeScript source:

| Target | File             | Purpose                                               | Dependencies |
| ------ | ---------------- | ----------------------------------------------------- | ------------ |
| ESM    | `dist/index.mjs` | npm consumers using bundlers (Vite, Webpack, Next.js) | Externalized |
| CJS    | `dist/index.cjs` | Node.js backward compatibility                        | Externalized |

Declarations (`dist/index.d.ts`) are generated separately via `tsc` using `tsconfig.build.json`.

Build command: `npx nx build lace-sdk`

## How Dependency Externalization Works

tsdown reads this package's `package.json` and applies one rule:

- Listed in `dependencies` or `peerDependencies` → **externalized** (preserved as `import` statements in ESM/CJS)
- Everything else → **bundled** (inlined into the output)

Consequences:

- Internal `@lace-*` packages are always bundled (not in package.json).
- Third-party packages in `dependencies` are externalized for ESM/CJS, letting the consumer's bundler deduplicate and tree-shake.

tsdown does **not** traverse transitive dependency trees — it reads only this package's package.json.

### The Phantom Dependency Trap

If bundled internal code imports a third-party that is NOT in this package's `package.json`, tsdown **silently bundles it** into the ESM output.

This causes the "double-bundle penalty": ESM consumers get a hidden, opaque copy inside your bundle. If they also use the same package, their bundler cannot deduplicate — two copies ship to production. For stateful libraries, two instances cause runtime crashes (singleton violation).

**tsdown will not warn you.** Catch it by:

1. Reviewing `dist/index.mjs` after adding new exports
2. Watching for unexpected bundle size jumps
3. Grepping for package identifiers that should be externalized

### The Rule

> Every third-party npm package imported (directly or transitively) by any bundled internal code **must** be listed in this package's `package.json` as `dependencies` or `peerDependencies`.

## Adding New Exports

When exposing new internal code through `src/index.ts`:

### 1. Trace third-party imports

Follow imports from the internal package you're bundling. Every third-party npm package that gets pulled in must be accounted for.

### 2. Classify each dependency

| Classification   | Criteria                                   | package.json field             |
| ---------------- | ------------------------------------------ | ------------------------------ |
| Standard dep     | Small, consumer unlikely to have it        | `dependencies`                 |
| Peer dep         | Large, stateful, or consumer likely has it | `peerDependencies`             |
| Types-only       | Only `type` imports (e.g., `type-fest`)    | Not listed (erased at compile) |
| Bundled internal | `@lace-*` package                          | Not listed (always inlined)    |

Large + consumer likely has it → peer dep. Small/niche → standard dep.

### 3. Add to package.json, rebuild, validate

```bash
npx nx build lace-sdk

# No internal @lace-* imports in ESM (all bundled):
grep "@lace-" dist/index.mjs

# Dependencies ARE externalized (import statements preserved):
grep "lodash" dist/index.mjs
grep "ts-custom-error" dist/index.mjs

# Unreferenced code is tree-shaken:
grep "SOME_UNEXPORTED_SYMBOL" dist/index.mjs
```

All grep checks for leaked/phantom content must return nothing. Grep checks for externalized deps must return import statements.

## tsdown Configuration

Config: `tsdown.config.ts`

### Key behaviors

- **`dts: false`** — declaration files are generated separately via `tsc -p tsconfig.build.json` because tsdown's rolldown-plugin-dts cannot handle merged type+value re-exports (the value object pattern used by `@lace-sdk/util`). When tsdown's DTS support matures or internal packages add `isolatedDeclarations`-compliant annotations, this can be switched to `dts: true`.
- tsdown resolves `@lace-*` packages via **tsconfig path aliases** from `tsconfig.base.json`. If a new internal package doesn't resolve, check that it has a path alias there.

## Declaration Files (.d.ts)

Currently generated via `tsc --emitDeclarationOnly` using `tsconfig.build.json`. The generated `.d.ts` re-exports types from internal `@lace-*` packages by path alias — this works within the monorepo but not for external npm consumers.

**TODO for npm publishing**: Bundle declarations using `api-extractor` or switch to tsdown `dts: true` once the merged declaration re-export issue is resolved.

## Node.js Polyfills

Some internal code uses Node.js APIs (e.g., `Buffer` in `bytes.vo.ts`). These are native in Node.js but need polyfills for the browser target. The `buffer` npm package provides a browser-compatible implementation and is bundled automatically via `@rolldown/plugin-node-polyfills`.

When adding code that uses other Node.js APIs (`crypto`, `stream`, etc.), ensure the polyfill is installed. See the extension app's `webpack/base/common.webpack.config.js` for which polyfills are needed.

## Output Reference

| File              | Condition key in `exports` | Notes                                             |
| ----------------- | -------------------------- | ------------------------------------------------- |
| `dist/index.mjs`  | `"import"`                 | Tree-shakeable ESM                                |
| `dist/index.cjs`  | `"require"`                | Node.js CJS compat                                |
| `dist/index.d.ts` | `"types"` (must be first)  | Re-exports from internal packages (monorepo only) |
