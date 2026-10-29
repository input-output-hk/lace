/**
 * The compatibility rules a stable release of the SDK must meet (ADR 66,
 * "Versioning before and after 1.0"): what changed between two releases'
 * declarations, and which version bump and deprecations that requires.
 */
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { channelEntryNames } from './entries.mjs';
import { compareVersions, parseVersion, type Version } from './releases.mjs';

/** One export of one package entry, as its published declarations state it. */
export interface DeclaredExport {
  /** `<entry>:<name>`, e.g. `cardano:createLaceWallet`. */
  key: string;
  /**
   * The declaration text without comments, normalised so only a change in
   * meaning differs.
   */
  signature: string;
  deprecated: boolean;
}

export type ExportMap = Map<string, DeclaredExport>;

/**
 * Declaration bundlers rename a colliding internal name `Name$1`, and the
 * suffix can shift between builds without any change to the API, so it is
 * dropped along with whitespace differences.
 */
const normalise = (text: string): string =>
  text
    .replaceAll(/([A-Za-z_]\w*)\$\d+\b/g, '$1')
    .replaceAll(/\s+/g, ' ')
    .trim();

// Comments are documentation, not meaning: a reworded doc comment on a stable
// type must not count as a breaking change. Deprecation is read from the JSDoc
// tags separately.
const printer = ts.createPrinter({ removeComments: true });

const declarationText = (declaration: ts.Declaration): string =>
  normalise(
    printer.printNode(
      ts.EmitHint.Unspecified,
      declaration,
      declaration.getSourceFile(),
    ),
  );

const isTopLevel = (declaration: ts.Declaration): boolean => {
  // A variable sits in a declaration list inside its statement.
  const statement = ts.isVariableDeclaration(declaration)
    ? declaration.parent.parent
    : declaration;
  return (
    ts.isSourceFile(statement.parent) || ts.isModuleBlock(statement.parent)
  );
};

/**
 * The unexported declarations of the entry files that `roots` reference,
 * directly or through each other. Exported declarations are left out: each is
 * compared as an export of its own.
 */
const referencedLocals = ({
  roots,
  checker,
  entryFiles,
  exported,
}: {
  roots: readonly ts.Declaration[];
  checker: ts.TypeChecker;
  entryFiles: ReadonlySet<ts.SourceFile>;
  exported: ReadonlySet<ts.Symbol>;
}): ts.Declaration[] => {
  const seen = new Set<ts.Symbol>();
  const found: ts.Declaration[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      const atNode = checker.getSymbolAtLocation(node);
      // A namespace's `export { _default as name }` names its member through
      // an alias; the member's declaration is what the export means.
      const symbol =
        atNode && atNode.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(atNode)
          : atNode;
      const local = symbol?.declarations?.filter(
        declaration =>
          entryFiles.has(declaration.getSourceFile()) &&
          isTopLevel(declaration) &&
          !roots.includes(declaration),
      );
      if (
        symbol &&
        local?.length &&
        !seen.has(symbol) &&
        !exported.has(symbol)
      ) {
        seen.add(symbol);
        found.push(...local);
        for (const declaration of local) ts.forEachChild(declaration, visit);
      }
    }
    ts.forEachChild(node, visit);
  };
  for (const root of roots) ts.forEachChild(root, visit);
  return found;
};

/**
 * Reads every export of each entry's declaration file. An export's signature
 * covers the unexported types it references, so a change behind it counts.
 * Third-party imports are not resolved, so a release's own declarations are
 * compared, not the types they reference. With `followRelativeImports`, the
 * package's own declaration files that the entries import, such as the chunks
 * a bundler splits shared declarations into, are read as part of it.
 */
export const readExports = (
  entries: Record<string, string>,
  { followRelativeImports = false }: { followRelativeImports?: boolean } = {},
): ExportMap => {
  const options: ts.CompilerOptions = {
    noEmit: true,
    noResolve: !followRelativeImports,
    skipLibCheck: true,
    types: [],
  };
  const host = ts.createCompilerHost(options);
  if (followRelativeImports) {
    // Only a relative specifier resolves: a chunk of the same package.
    host.resolveModuleNameLiterals = (literals, containingFile) =>
      literals.map(literal => ({
        resolvedModule: literal.text.startsWith('.')
          ? ts.resolveModuleName(literal.text, containingFile, options, host)
              .resolvedModule
          : undefined,
      }));
  }
  const program = ts.createProgram(Object.values(entries), options, host);
  const checker = program.getTypeChecker();
  const resolved = Object.entries(entries).map(([entry, file]) => {
    const source = program.getSourceFile(file);
    const module = source && checker.getSymbolAtLocation(source);
    if (!source || !module) throw new Error(`No module symbol for ${file}`);
    return {
      entry,
      source,
      symbols: checker.getExportsOfModule(module).map(exported => ({
        exported,
        target:
          exported.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(exported)
            : exported,
      })),
    };
  });
  // The package's own files: the entries, and with followRelativeImports every
  // declaration file they reach.
  const entryFiles = new Set(
    followRelativeImports
      ? program
          .getSourceFiles()
          .filter(file => !program.isSourceFileDefaultLibrary(file))
      : resolved.map(({ source }) => source),
  );
  const exportedSymbols = new Set(
    resolved.flatMap(({ symbols }) => symbols.map(({ target }) => target)),
  );
  const exports: ExportMap = new Map();
  for (const { entry, symbols } of resolved) {
    for (const { exported, target } of symbols) {
      const declarations = target.declarations ?? exported.declarations ?? [];
      const locals = referencedLocals({
        roots: declarations,
        checker,
        entryFiles,
        exported: exportedSymbols,
      });
      const key = `${entry}:${exported.name}`;
      exports.set(key, {
        key,
        signature: [
          ...declarations.map(declarationText).sort(),
          ...locals.map(declarationText).sort(),
        ].join('\n'),
        deprecated: [exported, target].some(symbol =>
          symbol.getJsDocTags(checker).some(tag => tag.name === 'deprecated'),
        ),
      });
    }
  }
  return exports;
};

export interface ExportChanges {
  added: string[];
  removed: string[];
  changed: string[];
}

export const compareExports = (
  previous: ExportMap,
  next: ExportMap,
): ExportChanges => ({
  added: [...next.keys()].filter(key => !previous.has(key)).sort(),
  removed: [...previous.keys()].filter(key => !next.has(key)).sort(),
  changed: [...next.keys()]
    .filter(
      key =>
        previous.has(key) &&
        previous.get(key)?.signature !== next.get(key)?.signature,
    )
    .sort(),
});

// The SDK's versions and their order are its releases' (releases.mjs),
// so the rules here and the tags never disagree about which version is newer.
export { compareVersions, parseVersion } from './releases.mjs';
export type { Version } from './releases.mjs';

/**
 * Whether going from `previous` to `next` permits an incompatible change:
 * before 1.0 a minor release, from 1.0 a major release.
 */
export const allowsBreakingChange = (previous: Version, next: Version) =>
  previous.major === 0
    ? next.major > 0 || next.minor > previous.minor
    : next.major > previous.major;

/** A change the release declares compatible, recorded in release-overrides.json. */
export interface ReleaseOverride {
  version: string;
  export: string;
  reason: string;
}

/** The SDK's release overrides (`release-overrides.json` in `packageDirectory`). */
export const readOverrides = (packageDirectory: string): ReleaseOverride[] => {
  const file = path.join(packageDirectory, 'release-overrides.json');
  return fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, 'utf8')) as ReleaseOverride[])
    : [];
};

// Every entry either build has: a stable build holds only the stable ones,
// and declarationsIn skips an entry a build does not hold.
const ENTRIES = channelEntryNames('canary');

/**
 * The declaration file of each SDK entry a build directory (a package, or
 * the directory holding a build's `dist/`) holds. A release from before an
 * entry was added has no file for it, and so no exports there to compare.
 */
export const declarationsIn = (directory: string): Record<string, string> =>
  Object.fromEntries(
    ENTRIES.map((entry): [string, string] => [
      entry,
      path.join(directory, 'dist', `${entry}.d.ts`),
    ]).filter(([, file]) => fs.existsSync(file)),
  );

/** Every file under `directory`, relative to it, sorted. */
const filesIn = (directory: string): string[] =>
  fs
    .readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry =>
      path.relative(directory, path.join(entry.parentPath, entry.name)),
    )
    .sort();

/** The files two unpacked packages do not hold byte for byte alike. */
const differingFiles = (a: string, b: string): string[] =>
  [...new Set([...filesIn(a), ...filesIn(b)])].sort().filter(file => {
    const left = path.join(a, file);
    const right = path.join(b, file);
    return (
      !fs.existsSync(left) ||
      !fs.existsSync(right) ||
      !fs.readFileSync(left).equals(fs.readFileSync(right))
    );
  });

/**
 * The problem with this build of a version a registry already has, or none:
 * a published version is final, so a re-run may only complete a partial
 * publish with the files already published. Each registry skips a version it
 * has, so a different build under that version would leave npm and GitHub
 * Packages serving different contents. `published` and `built` are the
 * unpacked `package/` directories of the published tarball and of this
 * build's.
 */
export const republishProblems = ({
  name,
  version,
  published,
  built,
}: {
  name: string;
  version: string;
  published: string;
  built: string;
}): string[] => {
  const differing = differingFiles(published, built);
  if (differing.length === 0) return [];
  return [
    `${name}@${version} is already published and this build differs from it (${differing
      .slice(0, 5)
      .join(', ')}${
      differing.length > 5 ? ', …' : ''
    }): a published version is final, so cut a new release`,
  ];
};

/**
 * The problems that stop a stable release, or none. `overrides` marks a
 * changed signature compatible for this release (a reworded type, not a
 * change in meaning); a removal cannot be overridden.
 */
export const stableReleaseProblems = ({
  previousVersion,
  nextVersion,
  previous,
  next,
  overrides,
}: {
  previousVersion: string;
  nextVersion: string;
  previous: ExportMap;
  next: ExportMap;
  overrides: ReleaseOverride[];
}): string[] => {
  const from = parseVersion(previousVersion);
  const to = parseVersion(nextVersion);
  if (compareVersions(to, from) <= 0) {
    return [`${nextVersion} is not above the latest stable ${previousVersion}`];
  }
  const declaredCompatible = new Set(
    overrides
      .filter(override => override.version === nextVersion)
      .map(override => override.export),
  );
  const { removed, changed } = compareExports(previous, next);
  const breaking = [
    ...removed,
    ...changed.filter(key => !declaredCompatible.has(key)),
  ];
  const problems: string[] = [];
  if (breaking.length > 0 && !allowsBreakingChange(from, to)) {
    problems.push(
      `${nextVersion} changes or removes ${breaking.join(
        ', ',
      )} after ${previousVersion}; ${
        from.major === 0 ? 'a minor' : 'a major'
      } release is required, or a release-overrides.json entry for a change that is compatible`,
    );
  }
  for (const key of breaking) {
    if (!previous.get(key)?.deprecated) {
      problems.push(
        `${key} changes or is removed without being @deprecated in ${previousVersion}`,
      );
    }
  }
  return problems;
};

/** The highest released version, ignoring prereleases, or undefined if none. */
export const latestStableOf = (
  versions: readonly string[],
): string | undefined =>
  versions
    .map(parseVersion)
    .filter(version => version.prerelease === undefined)
    .sort(compareVersions)
    .map(({ major, minor, patch }) => `${major}.${minor}.${patch}`)
    .at(-1);

/**
 * The highest canary published since the latest stable release: the highest
 * canary whose stable version is above it, or undefined if none. Canaries
 * below the latest stable are history, so a canary is compared with these
 * alone, and a stable release with stable releases alone.
 */
export const latestCanarySinceOf = (
  versions: readonly string[],
): string | undefined => {
  const stable = latestStableOf(versions);
  return versions
    .map(parseVersion)
    .filter(
      version =>
        version.prerelease?.startsWith('canary.') &&
        (stable === undefined ||
          compareVersions(
            {
              major: version.major,
              minor: version.minor,
              patch: version.patch,
            },
            parseVersion(stable),
          ) > 0),
    )
    .sort(compareVersions)
    .map(
      ({ major, minor, patch, prerelease }) =>
        `${major}.${minor}.${patch}-${prerelease}`,
    )
    .at(-1);
};

/**
 * A canary previews the next stable release, so it sorts above the latest.
 * npm makes a package's first version its `latest`, whatever dist-tag it
 * publishes with, so the first release must be stable. A canary below a
 * canary published since the latest stable would move the `canary` dist-tag,
 * and the public repository's main, back to older code, as a late re-run of
 * a failed canary would; the same version again is a re-run completing its
 * own publish. A canary is held to canaries alone: a stable release below a
 * canary's version is the stable release that canary previewed past.
 */
export const canaryReleaseProblems = ({
  latestStable,
  latestCanary,
  canaryVersion,
}: {
  latestStable: string | undefined;
  latestCanary?: string;
  canaryVersion: string;
}): string[] => {
  if (latestStable === undefined) {
    return [
      `${canaryVersion} would be the package's first version, which npm makes its latest: release a stable version first`,
    ];
  }
  const canary = parseVersion(canaryVersion);
  const base = {
    major: canary.major,
    minor: canary.minor,
    patch: canary.patch,
  };
  if (compareVersions(base, parseVersion(latestStable)) <= 0) {
    return [
      `${canaryVersion} previews ${base.major}.${base.minor}.${base.patch}, which is not above the latest stable ${latestStable}`,
    ];
  }
  return latestCanary !== undefined &&
    compareVersions(canary, parseVersion(latestCanary)) < 0
    ? [
        `${canaryVersion} is below ${latestCanary}, which is already published: releasing it would move the canary dist-tag back, so cut a newer canary`,
      ]
    : [];
};
