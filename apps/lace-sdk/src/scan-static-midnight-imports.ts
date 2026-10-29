import fs from 'node:fs';
import { isBuiltin } from 'node:module';
import path from 'node:path';

// Static import/require specifiers, one line each in tsdown's unminified
// output. Dynamic import(...) deliberately does not match.
const STATIC_SPECIFIER_PATTERNS = [
  /^\s*import\s[^;]*?from\s*['"]([^'"]+)['"]/,
  /^\s*import\s*['"]([^'"]+)['"]/,
  /^\s*export\s[^;]*?from\s*['"]([^'"]+)['"]/,
];
// A require preceded by `=>` is rolldown's CJS lowering of dynamic
// import(): `Promise.resolve().then(() => require(...))`.
const REQUIRE_PATTERN = /(?<!=>\s*)require\(\s*['"]([^'"]+)['"]\s*\)/g;
const MIDNIGHT_EXTERNAL = [
  /^@midnight-ntwrk\//,
  /^@midnightntwrk\//,
  /^@polkadot\//,
];

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

// Every require() and import() a chunk makes, static or lazy (rolldown
// lowers import() of a chunk to `() => require(...)` in CommonJS and keeps
// import() of a package native).
const REQUIRE_OR_IMPORT_PATTERN =
  /(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g;

const packageName = (specifier: string): string =>
  specifier.startsWith('node:')
    ? specifier
    : specifier
        .split('/')
        .slice(0, specifier.startsWith('@') ? 2 : 1)
        .join('/');

/**
 * The packages an entry's import closure names, static and lazy, in ESM or
 * CommonJS output, with the files that name them. A bundle moves its dependencies' import
 * sites into this package, so every one of them must be declared.
 */
export const packageRequireClosure = (
  distributionDirectory: string,
  entry: string,
): Map<string, Set<string>> => {
  const packages = new Map<string, Set<string>>();
  const visited = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (visited.has(file)) continue;
    visited.add(file);
    const code = fs.readFileSync(
      path.join(distributionDirectory, file),
      'utf8',
    );
    // A bundled package's doc comment can hold an import in its example.
    const statements = code.replace(/^\s*\/\*[\s\S]*?\*\//gm, '');
    const specifiers = [
      ...staticSpecifiers(statements),
      ...[...code.matchAll(REQUIRE_OR_IMPORT_PATTERN)].map(
        ([, specifier]) => specifier,
      ),
    ];
    for (const specifier of specifiers) {
      if (specifier.startsWith('.')) {
        // A relative specifier that names no output file is a type import
        // in a comment, not a chunk.
        const next = path.normalize(path.join(path.dirname(file), specifier));
        const target = path.join(distributionDirectory, next);
        if (fs.existsSync(target) && fs.statSync(target).isFile()) {
          queue.push(next);
        }
        continue;
      }
      const name = packageName(specifier);
      packages.set(name, (packages.get(name) ?? new Set()).add(file));
    }
  }
  return packages;
};

// A relative dynamic import, in ESM or in rolldown's CJS lowering of it.
const LAZY_CHUNK_PATTERN = /(?:import|require)\(\s*['"](\.[^'"]+)['"]\s*\)/g;

// Midnight packages are external and absent from the SDK's dependency list.
// Walk the entry's static-import closure; dynamic-only chunks may use Midnight
// unless `lazyChunks` asks for them too, which the import-only check does,
// since the engine may sit behind a lazily loaded chunk of the Midnight entry.
export const findStaticMidnightImports = (
  distributionDirectory: string,
  entry: string,
  { lazyChunks = false }: { lazyChunks?: boolean } = {},
): string[] => {
  const violations: string[] = [];
  const visited = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (visited.has(file)) continue;
    visited.add(file);
    const code = fs.readFileSync(
      path.join(distributionDirectory, file),
      'utf8',
    );
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
    if (lazyChunks) {
      for (const [, specifier] of code.matchAll(LAZY_CHUNK_PATTERN)) {
        const next = path.normalize(path.join(path.dirname(file), specifier));
        if (fs.existsSync(path.join(distributionDirectory, next))) {
          queue.push(next);
        }
      }
    }
  }
  return violations;
};

/**
 * The packages in an entry's import closure that `declared` (the
 * package's dependencies and peers) does not hold, each with the files that
 * name it. Node built-ins never count. The build refuses a non-empty result.
 */
export const undeclaredPackageRequires = (
  distributionDirectory: string,
  entry: string,
  declared: Record<string, unknown>,
): string[] =>
  [...packageRequireClosure(distributionDirectory, entry)]
    .filter(([name]) => !isBuiltin(name) && !(name in declared))
    .map(([name, files]) => `${name} (${[...files].join(', ')})`);
