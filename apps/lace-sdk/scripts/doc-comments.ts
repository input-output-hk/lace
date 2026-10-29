/**
 * Which exports of the SDK's entries carry a summary doc comment on their
 * declaration, and what the doc-comment baseline allows. The doc comments are
 * the SDK's API documentation, so an export without one ships undocumented.
 */
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

/**
 * `documented` and `undocumented` describe a workspace declaration;
 * `third-party` is a declaration outside the workspace, which documents itself
 * elsewhere and is exempt; `unresolved` is an export whose declaration the
 * compiler cannot find, such as one re-exported from a missing module.
 */
export type DocStatus =
  | 'documented'
  | 'third-party'
  | 'undocumented'
  | 'unresolved';

/** One export of one entry, as its declaration documents it. */
export interface ExportDoc {
  /** The entry file, relative to the workspace root. */
  entry: string;
  /** The exported name; a namespace export's members are `<namespace>.<member>`. */
  name: string;
  status: DocStatus;
  /**
   * `<file>:<line>`, relative to the workspace root, of the declaration, or of
   * the export when it is unresolved; absent for a third-party one.
   */
  location?: string;
}

export interface ReadExportDocsProps {
  /** Absolute paths of the entry files. */
  entries: string[];
  options: ts.CompilerOptions;
  /** Absolute path of the workspace root; declarations outside it are third-party. */
  workspaceRoot: string;
}

const isModuleNamespace = (symbol: ts.Symbol) =>
  Boolean(
    symbol.declarations?.some(declaration => ts.isSourceFile(declaration)),
  );

/** The summary of a declaration's own doc comment, without its tags. */
const summaryOf = (declaration: ts.Declaration): string =>
  ts
    .getJSDocCommentsAndTags(declaration)
    .filter(ts.isJSDoc)
    .map(doc => ts.getTextOfJSDocComment(doc.comment) ?? '')
    .join('')
    .trim();

/**
 * The declarations of a symbol grouped as TypeDoc renders them, each group one
 * entry that needs a doc comment on at least one of its declarations. Each kind
 * is its own entry, so a type alias and a constant sharing a name need one
 * each. An overloaded function renders each signature with its own comment
 * and not its implementation, so each overload signature is an entry of its
 * own. Merged interfaces render as one entry. A property assigned to a
 * function constant (`X.member = …`) declares `X` again at the assignment;
 * it renders as a member of `X`, not an entry of its own.
 */
const renderedEntries = (
  declarations: readonly ts.Declaration[],
): ts.Declaration[][] => {
  const byKind = new Map<ts.SyntaxKind, ts.Declaration[]>();
  for (const declaration of declarations) {
    if (ts.isIdentifier(declaration)) continue;
    byKind.set(declaration.kind, [
      ...(byKind.get(declaration.kind) ?? []),
      declaration,
    ]);
  }
  return [...byKind.values()].flatMap(group =>
    group.length > 1 && group.every(ts.isFunctionDeclaration)
      ? group
          .filter(declaration => !declaration.body)
          .map(declaration => [declaration])
      : [group],
  );
};

/**
 * Every export of each entry with its documentation status. A namespace
 * export (`export * as m from './modules'`) is listed by its members, since a
 * reader looks each member up. An export whose declarations TypeDoc renders
 * as several entries is documented only when each entry is; otherwise it is
 * listed once per undocumented declaration.
 */
export const readExportDocs = ({
  entries,
  options,
  workspaceRoot,
}: ReadExportDocsProps): ExportDoc[] => {
  const root = fs.realpathSync(workspaceRoot);
  const program = ts.createProgram(entries, options);
  const checker = program.getTypeChecker();

  // Workspace packages resolve through node_modules links; their real path
  // is in the workspace, a third-party package's is not.
  const isWorkspaceFile = (fileName: string) => {
    const real = fs.realpathSync(fileName);
    return (
      real.startsWith(root + path.sep) &&
      !real.split(path.sep).includes('node_modules')
    );
  };
  const isWorkspaceDeclaration = (declaration: ts.Declaration) =>
    isWorkspaceFile(declaration.getSourceFile().fileName);

  const locationOf = (node: ts.Node) => {
    const source = node.getSourceFile();
    const { line } = source.getLineAndCharacterOfPosition(
      node.getStart(source),
    );
    return `${path.relative(root, fs.realpathSync(source.fileName))}:${
      line + 1
    }`;
  };

  const docOf = (
    entry: string,
    name: string,
    symbol: ts.Symbol,
  ): ExportDoc[] => {
    const target =
      symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol;
    const declarations = target.declarations ?? [];
    if (declarations.length === 0) {
      const exported = symbol.declarations?.[0];
      return [
        {
          entry,
          name,
          status: 'unresolved',
          ...(exported && { location: locationOf(exported) }),
        },
      ];
    }
    if (isModuleNamespace(target)) {
      return checker
        .getExportsOfModule(target)
        .flatMap(member => docOf(entry, `${name}.${member.name}`, member));
    }
    const workspace = declarations.filter(isWorkspaceDeclaration);
    if (workspace.length === 0) return [{ entry, name, status: 'third-party' }];
    const undocumented = renderedEntries(declarations).flatMap(group =>
      group.some(
        declaration =>
          !isWorkspaceDeclaration(declaration) || summaryOf(declaration),
      )
        ? []
        : [group[0]],
    );
    if (undocumented.length === 0) {
      return [
        {
          entry,
          name,
          status: 'documented',
          location: locationOf(workspace[0]),
        },
      ];
    }
    return undocumented.map(declaration => ({
      entry,
      name,
      status: 'undocumented',
      location: locationOf(declaration),
    }));
  };

  return entries.flatMap(file => {
    const source = program.getSourceFile(file);
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) throw new Error(`Cannot read the exports of ${file}`);
    const entry = path.relative(root, file);
    return checker
      .getExportsOfModule(moduleSymbol)
      .flatMap(symbol => docOf(entry, symbol.name, symbol));
  });
};

export interface DocCommentProblemsProps {
  /** The exports of the checked build's entries. */
  exports: ExportDoc[];
  /** The names the stable build exports. */
  stableNames: ReadonlySet<string>;
  /** Names of the undocumented exports the baseline allows. */
  baseline: readonly string[];
  /**
   * Whether `exports` covers every name the baseline may hold, so a baseline
   * name it lacks is no longer exported. True for the canary build, whose
   * entries export everything stable's do.
   */
  isComplete: boolean;
}

/**
 * What the check reports: an unresolved export, an undocumented stable
 * export, an undocumented export the baseline does not list, and a baseline
 * name that is stable, now documented or no longer exported. The baseline
 * only shrinks, and never excuses an unresolved export.
 */
export const docCommentProblems = ({
  exports,
  stableNames,
  baseline,
  isComplete,
}: DocCommentProblemsProps): string[] => {
  const allowed = new Set(baseline);
  const statusOf = new Map<string, DocStatus>();
  const isDocumented = (status: DocStatus | undefined) =>
    status === 'documented' || status === 'third-party';
  for (const { name, status } of exports) {
    if (statusOf.get(name) === undefined || isDocumented(statusOf.get(name))) {
      statusOf.set(name, status);
    }
  }
  const reported = new Set<string>();
  const undocumented = exports
    .filter(({ status }) => !isDocumented(status))
    .flatMap(({ entry, name, status, location }) => {
      const key = `${name}\0${location}`;
      if (reported.has(key)) return [];
      reported.add(key);
      if (status === 'unresolved') {
        return [
          `${name} (${entry}) does not resolve to a declaration${
            location ? ` (exported at ${location})` : ''
          }: fix the export or the module it re-exports from`,
        ];
      }
      if (stableNames.has(name)) {
        return [
          `${name} (${entry}) is a stable export without a doc comment: document its declaration at ${location}; stable exports must be documented`,
        ];
      }
      if (allowed.has(name)) return [];
      return [
        `${name} (${entry}) has no doc comment: document its declaration at ${location}`,
      ];
    });
  const stale = baseline.flatMap(name => {
    if (stableNames.has(name)) {
      return [
        `${name} is on the baseline but is a stable export, which must be documented: remove it from the baseline`,
      ];
    }
    const status = statusOf.get(name);
    if (status !== undefined && isDocumented(status)) {
      return [
        `${name} is on the baseline but needs no entry (${status}): remove it from the baseline`,
      ];
    }
    if (status === undefined && isComplete) {
      return [
        `${name} is on the baseline but is no longer exported: remove it from the baseline`,
      ];
    }
    return [];
  });
  return [...undocumented, ...stale];
};
