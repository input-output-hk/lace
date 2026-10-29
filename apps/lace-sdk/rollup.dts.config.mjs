import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dts from 'rollup-plugin-dts';
import ts from 'typescript';

import { channelEntryNames, entrySource } from './scripts/entries.mjs';
import {
  cardanoSubpathOf,
  useLaceioCardano,
} from './scripts/laceio-cardano.mjs';
import { reachedWorkspaceFiles, compilerOptions } from './scripts/reach.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The build channel (ADR 66): canary rolls up the entry twins that add
// canary.ts; stable resolves each workspace file's `.stable` variant first.
const CHANNEL = process.env.SDK_CHANNEL === 'canary' ? 'canary' : 'stable';
const MODULE_SUFFIXES = CHANNEL === 'stable' ? ['.stable', ''] : [''];
const repoRoot = path.resolve(__dirname, '../..');
const dtsWork = path.resolve(__dirname, 'dist/.dts-work');

// Map @lace-{kind}/name → packages/{kindDir}/name/src
const PACKAGE_KIND_MAP = {
  contract: 'contract',
  lib: 'lib',
  sdk: 'sdk',
  module: 'module',
};

/**
 * Resolve a @lace-* bare specifier to a file path inside .dts-work/.
 * Returns null if not a @lace-* import.
 */
const resolveInternalSpecifier = specifier => {
  // @lace-module/NAME/sdk → packages/module/NAME/src/sdk
  const subpathMatch = specifier.match(
    /^@lace-(contract|lib|sdk|module)\/([^/]+)\/(.+)$/,
  );
  if (subpathMatch) {
    const [, kind, name, subpath] = subpathMatch;
    return path.join(
      dtsWork,
      'packages',
      PACKAGE_KIND_MAP[kind],
      name,
      'src',
      subpath,
    );
  }
  // @lace-contract/NAME → packages/contract/NAME/src
  const bareMatch = specifier.match(
    /^@lace-(contract|lib|sdk|module)\/([^/]+)$/,
  );
  if (bareMatch) {
    const [, kind, name] = bareMatch;
    return path.join(dtsWork, 'packages', PACKAGE_KIND_MAP[kind], name, 'src');
  }
  return null;
};

/**
 * Resolve a path to a .d.ts file: try directory/index.d.ts, then .d.ts extension.
 */
const resolveDtsFile = filePath => {
  const withSuffix = base =>
    MODULE_SUFFIXES.map(suffix => `${base}${suffix}.d.ts`).find(file =>
      fs.existsSync(file),
    );
  try {
    if (fs.statSync(filePath).isDirectory()) {
      return withSuffix(filePath + '/index') ?? filePath + '/index.d.ts';
    }
  } catch {
    // not found as-is
  }
  if (!fs.existsSync(filePath)) {
    return withSuffix(filePath) ?? filePath;
  }
  return filePath;
};

/**
 * Compute a relative path from `fromFile` to `targetPath` within .dts-work,
 * stripping .d.ts / index.d.ts extensions (TypeScript resolves without them).
 */
const toRelative = (fromFile, targetPath) => {
  const resolved = resolveDtsFile(targetPath);
  let relative = path.relative(path.dirname(fromFile), resolved);
  if (!relative.startsWith('.')) relative = './' + relative;
  return relative.replace(/\/index\.d\.ts$/, '').replace(/\.d\.ts$/, '');
};

/**
 * Rewrite internal specifiers to relative paths in all generated .d.ts files.
 *
 * tsc emits three kinds of internal references that block rollup-plugin-dts
 * from inlining types:
 *
 * 1. @lace-* package specifiers  (from tsconfig paths)
 *    e.g. import("@lace-contract/module").State
 *
 * 2. Repo-relative paths         (tsc expands complex inferred types)
 *    e.g. import("packages/contract/views/src").ViewsSliceState
 *    e.g. import("apps/lace-sdk/src").HexBytes
 *
 * 3. node_modules deep paths     (tsc resolves through real file paths)
 *    e.g. import("node_modules/@cardano-sdk/core/dist/esm/Cardano").PartialBlockHeader
 *    → rewritten to import("@cardano-sdk/core").Cardano.PartialBlockHeader
 *    Works for any scoped or unscoped package; the last non-"index" path
 *    segment becomes a namespace accessor (e.g. .Cardano, .Serialization).
 *
 * After rewriting, all internal references use relative paths and rollup-plugin-dts
 * treats them as local project files → they get inlined.
 */
const rewriteInternalImportsOnDisk = () => {
  const allDtsFiles = [];
  const collectDts = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) collectDts(full);
      else if (entry.name.endsWith('.d.ts')) allDtsFiles.push(full);
    }
  };
  collectDts(dtsWork);

  // --- Pattern 1: @lace-* specifiers in `from '...'` and `import('...')` ---
  const laceFromPattern =
    /(from\s+['"])(@lace-(?:contract|lib|sdk|module)\/[^'"]+)(['"])/g;
  const laceDynamicPattern =
    /(import\(\s*['"])(@lace-(?:contract|lib|sdk|module)\/[^'"]+)(['"]\s*\))/g;

  // --- Pattern 2: repo-relative paths in `import("packages/...")` and `import("apps/...")` ---
  const repoRelativeDynamicPattern =
    /(import\(\s*["'])((?:packages|apps)\/[^"']+)(["']\s*\))/g;

  // --- Pattern 3: node_modules deep paths ---
  // tsc resolves through real file paths for packages that use namespace re-exports.
  // e.g. import("node_modules/@cardano-sdk/core/dist/esm/Cardano").PartialBlockHeader
  // → import("@cardano-sdk/core").Cardano.PartialBlockHeader
  // Handles both scoped (@scope/pkg) and unscoped (pkg) packages.
  // The last non-"index" path segment becomes a namespace accessor.
  const nodeModulesDeepPattern =
    /import\(\s*["']node_modules\/((?:@[^/]+\/)?[^/"']+)(\/[^"']+)?["']\s*\)/g;

  let totalRewrites = 0;
  for (const file of allDtsFiles) {
    let code = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Shared rewriter: resolves a specifier to a relative path, returns null if unresolvable
    const rewriteMatch = (groups, resolve) => {
      const target = resolve(groups[2]);
      if (!target) return null;
      changed = true;
      return groups[1] + toRelative(file, target) + groups[3];
    };

    // Rewrite @lace-* specifiers to relative paths
    const rewriteLace = (...groups) =>
      rewriteMatch(groups, resolveInternalSpecifier) ?? groups[0];

    // Rewrite repo-relative paths (packages/..., apps/...) to relative paths in .dts-work
    const rewriteRepoRelative = (...groups) =>
      rewriteMatch(groups, specifier => {
        const target = path.join(dtsWork, specifier);
        if (
          !fs.existsSync(target) &&
          !fs.existsSync(target + '.d.ts') &&
          !fs.existsSync(path.join(target, 'index.d.ts'))
        ) {
          return null;
        }
        return target;
      }) ?? groups[0];

    // Rewrite node_modules deep paths → bare specifier with optional namespace accessor
    const rewriteNodeModulesDeep = (_match, packageName, deepPath) => {
      changed = true;
      if (!deepPath) return `import("${packageName}")`;
      const lastSegment = path.basename(deepPath);
      if (lastSegment === 'index') return `import("${packageName}")`;
      return `import("${packageName}").${lastSegment}`;
    };

    code = code
      // Inferred brands expose type-fest's private Tag through an extensionless
      // path. Tagged<unknown, ...> is the public equivalent and resolves in Node16.
      .replace(
        /import\(\s*["'](?:node_modules\/)?type-fest\/source\/tagged(?:\.js)?["']\s*\)\.Tag</g,
        () => {
          changed = true;
          return 'import("type-fest").Tagged<unknown, ';
        },
      )
      .replace(laceFromPattern, rewriteLace)
      .replace(laceDynamicPattern, rewriteLace)
      .replace(repoRelativeDynamicPattern, rewriteRepoRelative)
      .replace(nodeModulesDeepPattern, rewriteNodeModulesDeep);

    if (changed) {
      fs.writeFileSync(file, code);
      totalRewrites++;
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[rewrite-imports] Rewrote specifiers in ${totalRewrites} files`);
};

/**
 * The contract packages whose augmentations the declarations flatten: every
 * one on canary; on stable, those whose contract the runtime bundles
 * (tsdown.config.ts, record-bundled-contracts), so the stable types describe
 * the state, dependencies, config and addons of the contracts the SDK loads.
 * A contract the stable SDK names a type from but never loads, such as the
 * authentication prompt's or the onboarding flow's, adds nothing to them.
 */
const flattensAugmentationsOf = (() => {
  if (CHANNEL !== 'stable') return () => true;
  const recorded = path.join(dtsWork, 'bundled-contracts.json');
  if (!fs.existsSync(recorded)) {
    throw new Error(
      `${recorded} is missing: run tsdown before the declaration rollup`,
    );
  }
  const bundled = new Set(JSON.parse(fs.readFileSync(recorded, 'utf8')));
  return packageDirectory =>
    !packageDirectory.startsWith('packages/contract/') ||
    bundled.has(packageDirectory);
})();

const AUGMENTATIONS_FILE =
  /[/\\]\.dts-work[/\\](packages[/\\][^/\\]+[/\\][^/\\]+)[/\\]src[/\\]augmentations(?:\.stable)?\.d\.ts$/;

/** Drops the augmentations of the contracts the build does not load. */
const dropUnloadedAugmentations = {
  name: 'drop-unloaded-augmentations',
  load: id => {
    const match = AUGMENTATIONS_FILE.exec(id);
    return match && !flattensAugmentationsOf(match[1].replaceAll('\\', '/'))
      ? 'export {};'
      : null;
  },
};

const ENTRIES = channelEntryNames(CHANNEL);
const entries = process.env.ENTRY ? [process.env.ENTRY] : ENTRIES;
if (entries.some(entry => !ENTRIES.includes(entry)))
  throw new Error(`Unknown ${CHANNEL} entry: ${process.env.ENTRY}`);

/** Inferred state needs explicit imports of the augmentations this entry reaches. */
const injectAugmentationImports = entry => {
  const source = `apps/lace-sdk/${entrySource(entry, CHANNEL).replace(
    /\.ts$/,
    '',
  )}`;
  const entryFile = path.join(dtsWork, `${source}.d.ts`);
  const realRepoRoot = fs.realpathSync(repoRoot);
  const reached = reachedWorkspaceFiles(
    [path.join(repoRoot, `${source}.ts`)],
    compilerOptions(CHANNEL),
  )
    .filter(file => /[/\\]augmentations(?:\.stable)?\.ts$/.test(file))
    .map(file =>
      path
        .join(dtsWork, path.relative(realRepoRoot, file))
        .replace(/\.ts$/, '.d.ts'),
    )
    .sort();
  const imports = [];

  for (const augFile of reached) {
    const packageDirectory = path
      .relative(dtsWork, augFile)
      .split(path.sep)
      .slice(0, 3)
      .join('/');
    if (!flattensAugmentationsOf(packageDirectory) || !fs.existsSync(augFile))
      continue;
    const content = fs.readFileSync(augFile, 'utf8');
    if (!content.includes('declare module')) continue;

    let relative = path.relative(path.dirname(entryFile), augFile);
    if (!relative.startsWith('.')) relative = './' + relative;
    relative = relative.replace(/\.d\.ts$/, '');
    imports.push(`import '${relative}';`);
  }

  const code = fs.readFileSync(entryFile, 'utf8');
  if (imports.length > 0 && !code.startsWith(imports[0])) {
    fs.writeFileSync(entryFile, imports.join('\n') + '\n' + code);
    // eslint-disable-next-line no-console
    console.log(
      `[inject-augmentations] Added ${imports.length} augmentation imports to ${entry}`,
    );
  }
};

// Run the rewriting before rollup processes files
rewriteInternalImportsOnDisk();
// Then inject augmentation imports so rollup-plugin-dts includes them
for (const entry of entries) injectAugmentationImports(entry);

// The declarations carry the types they take from these packages, so the SDK
// does not depend on them.
const INLINED_TYPE_PACKAGES = ['@midnight-ntwrk/dapp-connector-api'];

const isInlinedTypePackage = source =>
  INLINED_TYPE_PACKAGES.some(
    name => source === name || source.startsWith(`${name}/`),
  );

// Every other npm package (rxjs, @reduxjs/toolkit, @laceio/cardano, etc.) is
// external; the @cardano-sdk packages the domain layer publishes import its
// subpaths (scripts/laceio-cardano.mjs).
// All .dts-work/ files have been rewritten to relative paths — no internal specifiers remain.
const external = source => {
  // Relative and absolute paths are always internal
  if (source.startsWith('.') || source.startsWith('/')) return false;
  // dts() resolves the inlined packages only when they are not external here,
  // and useLaceioCardano redirects the Cardano packages, which rollup asks
  // only for a source this does not already mark external.
  return !isInlinedTypePackage(source) && !cardanoSubpathOf(source);
};

/**
 * Handle JSON imports (tsc doesn't copy .json to outDir) by resolving
 * them from the original repo root.
 */
const resolveJsonImports = {
  name: 'resolve-json-imports',
  resolveId: (source, importer) => {
    if (source.endsWith('.json') && importer?.includes('.dts-work/')) {
      const relativeFromDtsWork = path.relative(
        dtsWork,
        path.dirname(importer),
      );
      return path.resolve(repoRoot, relativeFromDtsWork, source);
    }
    return null;
  },
};

/**
 * Post-process the bundled .d.ts to fix module augmentations.
 *
 * rollup-plugin-dts preserves `declare module '@lace-contract/module' { ... }`
 * blocks from augmentations.ts files. Since the consumer doesn't have
 * @lace-contract/module installed, these augmentations target non-existent
 * modules and are silently ignored — leaving interfaces like State and
 * AppConfig empty.
 *
 * Fix: unwrap the augmentation blocks into top-level interface declarations.
 * TypeScript merges same-name interfaces within a single .d.ts file, so the
 * unwrapped declarations merge with the originals:
 *
 *   // Original (from inlined contract):
 *   interface State {}
 *   // Unwrapped augmentation (was in declare module '@lace-contract/module'):
 *   interface State extends StateFromReducersMapObject<typeof failuresReducers> {}
 *   // Merged result: State has all properties from failuresReducers
 *
 * Augmentations targeting real external packages (e.g. 'i18next') are kept as-is.
 */
const flattenModuleAugmentations = {
  name: 'flatten-module-augmentations',
  renderChunk: code => {
    const laceBlockPattern =
      /^declare module\s+['"](@lace-(?:contract|lib|sdk|module)\/[^'"]+)['"]\s*\{/;

    /**
     * One pass: strip all `declare module '@lace-*'` blocks, returning
     * their inner content (de-indented) and the remaining lines.
     *
     * Uses brace counting to track block depth, skipping comments and
     * string literals: the declarations keep their doc comments, whose prose
     * and code spans may hold unbalanced braces, and a string such as a URL
     * holds `//` that must not end the line's count.
     */
    const extractOnce = inputLines => {
      const kept = [];
      const inner = [];
      let lineIndex = 0;
      let inComment = false;
      const braceDelta = line => {
        let delta = 0;
        for (let index = 0; index < line.length; index++) {
          const pair = line.slice(index, index + 2);
          if (inComment) {
            if (pair === '*/') {
              inComment = false;
              index++;
            }
          } else if (pair === '/*') {
            inComment = true;
            index++;
          } else if (pair === '//') {
            break;
          } else if (`'"\``.includes(line[index])) {
            const quote = line[index];
            index++;
            while (index < line.length && line[index] !== quote) {
              if (line[index] === '\\') index++;
              index++;
            }
          } else if (line[index] === '{') {
            delta++;
          } else if (line[index] === '}') {
            delta--;
          }
        }
        return delta;
      };

      while (lineIndex < inputLines.length) {
        if (!laceBlockPattern.test(inputLines[lineIndex])) {
          kept.push(inputLines[lineIndex]);
          lineIndex++;
          continue;
        }

        // Extract contents of declare module block
        let braceDepth = 1;
        lineIndex++; // skip the `declare module` line

        while (lineIndex < inputLines.length && braceDepth > 0) {
          const line = inputLines[lineIndex];
          braceDepth += braceDelta(line);
          if (braceDepth > 0) {
            inner.push(line.replace(/^    /, ''));
          }
          lineIndex++;
        }
      }

      return { kept, inner };
    };

    // rollup-plugin-dts can nest declare module blocks (e.g. module A's
    // augmentation is emitted inside module B's augmentation block), so
    // a single pass only unwraps one level.  We extract from the original
    // code once, then recursively extract from the inner content until
    // no more @lace-* blocks remain.
    const { kept: keptLines, inner: firstInner } = extractOnce(
      code.split('\n'),
    );

    const allExtracted = [];
    let pending = firstInner;
    while (pending.length > 0) {
      const { kept, inner } = extractOnce(pending);
      allExtracted.push(...kept); // lines that are NOT blocks
      pending = inner; // continue extracting nested blocks
    }

    const lines = keptLines;

    if (allExtracted.length > 0) {
      const exportIndex = lines.findLastIndex(line =>
        line.startsWith('export '),
      );
      if (exportIndex >= 0) {
        lines.splice(
          exportIndex,
          0,
          '',
          '// --- Flattened module augmentations ---',
          ...allExtracted,
          '',
        );
      } else {
        lines.push(
          '',
          '// --- Flattened module augmentations ---',
          ...allExtracted,
        );
      }
      // eslint-disable-next-line no-console
      console.log(
        `[flatten-augmentations] Extracted ${allExtracted.length} lines from declare module blocks`,
      );
    }

    return { code: lines.join('\n'), map: null };
  },
};

/**
 * The names an entry exports as types only, by the compiler's own rule: a
 * probe uses every value-like export of the entry as a value, and the names it
 * refuses are the ones an `export type` brought in, directly or through
 * `export type *`.
 */
const typeOnlyExports = entryFile => {
  const options = {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    moduleSuffixes: MODULE_SUFFIXES,
  };
  const entryProgram = ts.createProgram([entryFile], options);
  const checker = entryProgram.getTypeChecker();
  const names = checker
    .getExportsOfModule(
      checker.getSymbolAtLocation(entryProgram.getSourceFile(entryFile)),
    )
    .filter(symbol => {
      const target =
        symbol.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol;
      return target.flags & ts.SymbolFlags.Value;
    })
    .map(symbol => symbol.name);
  const probeFile = path.join(path.dirname(entryFile), '__type-only-probe.ts');
  fs.writeFileSync(
    probeFile,
    [
      `import { ${names
        .map((name, index) => `${name} as probe${index}`)
        .join(', ')} } from './${path.basename(entryFile, '.d.ts')}';`,
      ...names.map((_name, index) => `void probe${index};`),
    ].join('\n'),
  );
  try {
    const probeProgram = ts.createProgram([probeFile], options);
    const probeSource = probeProgram.getSourceFile(probeFile);
    const exportedAsType = new Set([1361, 1362]);
    return new Set(
      probeProgram
        .getSemanticDiagnostics(probeSource)
        .filter(({ code }) => exportedAsType.has(code))
        .map(
          ({ start }) =>
            names[probeSource.getLineAndCharacterOfPosition(start).line - 1],
        ),
    );
  } finally {
    fs.rmSync(probeFile);
  }
};

/**
 * Keeps the type-only exports of the entry type-only in the bundle.
 * rollup-plugin-dts lists a re-exported declaration that also declares a
 * value, such as a class or a value object, among the value exports even when
 * the entry exported it with `export type`. The declarations would then
 * promise a value the runtime build does not export, which type-checks and
 * fails when the module links.
 */
const keepTypeOnlyExports = typeOnly => ({
  name: 'keep-type-only-exports',
  renderChunk: code => ({
    code: code.replace(
      /^export \{ ([^}]*) \}( from '[^']+')?;$/gm,
      (statement, specifiers, from = '') => {
        const all = specifiers.split(', ');
        const types = all.filter(specifier =>
          typeOnly.has(specifier.split(' as ').at(-1)),
        );
        if (types.length === 0) return statement;
        const values = all.filter(specifier => !types.includes(specifier));
        return [
          ...(values.length > 0
            ? [`export { ${values.join(', ')} }${from};`]
            : []),
          `export type { ${types.join(', ')} }${from};`,
        ].join('\n');
      },
    ),
    map: null,
  }),
});

export default entries.map(entry => {
  const input = `dist/.dts-work/apps/lace-sdk/${entrySource(
    entry,
    CHANNEL,
  ).replace(/\.ts$/, '.d.ts')}`;
  return {
    input,
    output: { file: `dist/${entry}.d.ts`, format: 'es' },
    plugins: [
      useLaceioCardano,
      dropUnloadedAugmentations,
      resolveJsonImports,
      dts({
        tsconfig: './tsconfig.dts-bundle.json',
        compilerOptions: { moduleSuffixes: MODULE_SUFFIXES },
        includeExternal: INLINED_TYPE_PACKAGES,
      }),
      flattenModuleAugmentations,
      keepTypeOnlyExports(typeOnlyExports(path.resolve(__dirname, input))),
    ],
    external,
  };
});
