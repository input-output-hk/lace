import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dts from 'rollup-plugin-dts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
  try {
    if (fs.statSync(filePath).isDirectory()) {
      return filePath + '/index.d.ts';
    }
  } catch {
    // not found as-is
  }
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.d.ts')) {
    return filePath + '.d.ts';
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
 * Inject side-effect imports for all contract augmentation files into the
 * SDK entry .d.ts.
 *
 * Problem: tsc inlines complex types in module `sdk.d.ts` files, so those
 * files don't `import` from every contract they depend on. This means
 * rollup-plugin-dts never follows the dependency to the contract's
 * `augmentations.d.ts`, and the `declare module` blocks that populate
 * interfaces like `LaceAddons` and `State` are silently dropped.
 *
 * Fix: explicitly import every contract augmentations.d.ts that contains
 * `declare module` blocks, ensuring they enter the rollup bundle and get
 * flattened by `flattenModuleAugmentations`.
 */
const injectAugmentationImports = () => {
  const entryFile = path.join(dtsWork, 'apps/lace-sdk/src/index.d.ts');
  const imports = [];

  for (const kind of ['contract', 'module']) {
    const kindDirectory = path.join(dtsWork, 'packages', kind);
    if (!fs.existsSync(kindDirectory)) continue;
    for (const packageName of fs.readdirSync(kindDirectory).sort()) {
      const augFile = path.join(
        kindDirectory,
        packageName,
        'src',
        'augmentations.d.ts',
      );
      if (!fs.existsSync(augFile)) continue;
      const content = fs.readFileSync(augFile, 'utf8');
      if (!content.includes('declare module')) continue;

      let relative = path.relative(path.dirname(entryFile), augFile);
      if (!relative.startsWith('.')) relative = './' + relative;
      relative = relative.replace(/\.d\.ts$/, '');
      imports.push(`import '${relative}';`);
    }
  }

  if (imports.length > 0) {
    const code = fs.readFileSync(entryFile, 'utf8');
    fs.writeFileSync(entryFile, imports.join('\n') + '\n' + code);
    // eslint-disable-next-line no-console
    console.log(
      `[inject-augmentations] Added ${imports.length} augmentation imports to entry`,
    );
  }
};

// Run the rewriting before rollup processes files
rewriteInternalImportsOnDisk();
// Then inject augmentation imports so rollup-plugin-dts includes them
injectAugmentationImports();

// Everything from npm (rxjs, @reduxjs/toolkit, @cardano-sdk/*, etc.) is external.
// All .dts-work/ files have been rewritten to relative paths — no internal specifiers remain.
const external = source => {
  // Relative and absolute paths are always internal
  if (source.startsWith('.') || source.startsWith('/')) return false;
  // Everything else is external
  return true;
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
     * Uses brace counting to track block depth. This is safe because the input
     * is rollup-plugin-dts output (.d.ts), which contains no string literals,
     * template literals, or comments that could contain unbalanced braces.
     */
    const extractOnce = inputLines => {
      const kept = [];
      const inner = [];
      let lineIndex = 0;

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
          for (const character of line) {
            if (character === '{') braceDepth++;
            if (character === '}') braceDepth--;
          }
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

export default {
  input: 'dist/.dts-work/apps/lace-sdk/src/index.d.ts',
  output: { file: 'dist/index.d.ts', format: 'es' },
  plugins: [
    resolveJsonImports,
    dts({ tsconfig: './tsconfig.dts-bundle.json' }),
    flattenModuleAugmentations,
  ],
  external,
};
