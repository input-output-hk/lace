/**
 * What a built entry promises and what it delivers: the names its bundled
 * declarations export as values and as types, and the names its runtime
 * module exports. A name declared as a value that the runtime lacks passes
 * type-checking and fails when the module links; a runtime name the
 * declarations lack ships undocumented and untyped.
 */
import ts from 'typescript';

/** The export names of a module, by whether a name is usable as a value. */
export interface ModuleExports {
  /** Names usable as values: an import of one type-checks in value position. */
  values: string[];
  /** Names usable as types only. */
  types: string[];
}

/** The exports of one bundled declaration file. */
export interface DeclaredExports extends ModuleExports {
  /**
   * Module specifiers of `export *` statements the compiler cannot resolve:
   * their names are unknown, so neither list can be complete.
   */
  unresolvedStars: string[];
}

/** Whether an alias, or any alias it re-exports through, is type-only. */
const isTypeOnlyAlias = (checker: ts.TypeChecker, symbol: ts.Symbol) => {
  for (
    let current: ts.Symbol | undefined = symbol;
    current && current.flags & ts.SymbolFlags.Alias;
    current = checker.getImmediateAliasedSymbol(current)
  ) {
    if (
      current.declarations?.some(declaration =>
        ts.isTypeOnlyImportOrExportDeclaration(declaration),
      )
    ) {
      return true;
    }
  }
  return false;
};

/** The exports of `moduleSymbol`, sorted, with type-only re-exports as types. */
export const exportsOfModule = (
  checker: ts.TypeChecker,
  moduleSymbol: ts.Symbol,
): ModuleExports => {
  const values: string[] = [];
  const types: string[] = [];
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
    const target =
      symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol;
    const isValue =
      Boolean(target.flags & ts.SymbolFlags.Value) &&
      !isTypeOnlyAlias(checker, symbol);
    (isValue ? values : types).push(symbol.name);
  }
  return { values: values.sort(), types: types.sort() };
};

/**
 * Compiles `declarationFile`, resolving the packages it imports from the
 * directory it sits in, the way a consumer's compiler does.
 */
const compileDeclarations = (declarationFile: string) => {
  const program = ts.createProgram([declarationFile], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(declarationFile);
  const moduleSymbol = source && checker.getSymbolAtLocation(source);
  if (!source || !moduleSymbol) {
    throw new Error(`${declarationFile} is not a module`);
  }
  return { checker, source, moduleSymbol };
};

/** Reads the exports of `declarationFile`. */
export const readDeclaredExports = (
  declarationFile: string,
): DeclaredExports => {
  const { checker, source, moduleSymbol } =
    compileDeclarations(declarationFile);

  const unresolvedStars = source.statements.flatMap(statement =>
    ts.isExportDeclaration(statement) &&
    !statement.exportClause &&
    statement.moduleSpecifier &&
    ts.isStringLiteral(statement.moduleSpecifier) &&
    !checker.getSymbolAtLocation(statement.moduleSpecifier)
      ? [statement.moduleSpecifier.text]
      : [],
  );

  return {
    ...exportsOfModule(checker, moduleSymbol),
    unresolvedStars: unresolvedStars.sort(),
  };
};

/** A type an export's declaration names that its entry does not export. */
export interface UnexportedTypeReference {
  /** The export, a namespace member as `<namespace>.<member>`. */
  owner: string;
  /** The type's name in the bundled declarations. */
  type: string;
}

const resolveAlias = (checker: ts.TypeChecker, symbol: ts.Symbol) =>
  symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;

const MEANINGS =
  ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Namespace;

/** The meanings a declaration gives its name: value, type, namespace. */
const declarationMeaning = (declaration: ts.Declaration): ts.SymbolFlags => {
  if (
    ts.isInterfaceDeclaration(declaration) ||
    ts.isTypeAliasDeclaration(declaration)
  ) {
    return ts.SymbolFlags.Type;
  }
  if (ts.isClassDeclaration(declaration)) {
    return ts.SymbolFlags.Value | ts.SymbolFlags.Type;
  }
  if (
    ts.isEnumDeclaration(declaration) ||
    ts.isModuleDeclaration(declaration)
  ) {
    return MEANINGS;
  }
  return ts.SymbolFlags.Value;
};

/**
 * The name a reference node refers to, the leftmost identifier an app
 * writes, with the meaning the reference uses it in: a qualifier is a
 * namespace or, under `typeof`, a value.
 */
const referencedName = (
  node: ts.Node,
): { name: ts.Node; meaning: ts.SymbolFlags } | undefined => {
  const name = ts.isTypeReferenceNode(node)
    ? node.typeName
    : ts.isExpressionWithTypeArguments(node)
    ? node.expression
    : ts.isTypeQueryNode(node)
    ? node.exprName
    : undefined;
  if (!name) return undefined;
  const isValue =
    ts.isTypeQueryNode(node) ||
    (ts.isExpressionWithTypeArguments(node) &&
      ts.isHeritageClause(node.parent) &&
      node.parent.token === ts.SyntaxKind.ExtendsKeyword &&
      ts.isClassLike(node.parent.parent));
  let leftmost: ts.Node = name;
  while (
    ts.isQualifiedName(leftmost) ||
    ts.isPropertyAccessExpression(leftmost)
  ) {
    leftmost = ts.isQualifiedName(leftmost)
      ? leftmost.left
      : leftmost.expression;
  }
  const meaning = isValue
    ? ts.SymbolFlags.Value
    : leftmost === name
    ? ts.SymbolFlags.Type
    : ts.SymbolFlags.Namespace;
  return { name: leftmost, meaning };
};

/**
 * The symbol a bundled declaration renames, if it is only a rename, with the
 * meaning it renames: the bundler declares a namespace member as
 * `type m_X = X` or `declare const m_x: typeof x`.
 */
const renamedSymbol = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
): { symbol: ts.Symbol; meaning: ts.SymbolFlags } | undefined => {
  const target =
    ts.isTypeAliasDeclaration(declaration) &&
    !declaration.typeParameters &&
    ts.isTypeReferenceNode(declaration.type) &&
    !declaration.type.typeArguments
      ? declaration.type
      : ts.isVariableDeclaration(declaration) &&
        declaration.type &&
        ts.isTypeQueryNode(declaration.type) &&
        !declaration.type.typeArguments
      ? declaration.type
      : undefined;
  const reference = target && referencedName(target);
  if (!reference || !ts.isIdentifier(reference.name)) return undefined;
  const symbol = checker.getSymbolAtLocation(reference.name);
  return (
    symbol && {
      symbol: resolveAlias(checker, symbol),
      meaning: reference.meaning,
    }
  );
};

/**
 * The types the declarations of `owners` name that `declarationFile` declares
 * without exporting them: an app cannot write such a type, and the docs
 * cannot link it. A name counts as exported when the entry exports it under
 * any name, a namespace's members included, in the meaning the reference
 * uses: exporting a value does not export a type of the same name. Only the
 * owners' own declarations are read, not those of the types they name.
 *
 * @param owners - Export names, a namespace member as `<namespace>.<member>`.
 */
export const readUnexportedTypeReferences = (
  declarationFile: string,
  owners: readonly string[],
): UnexportedTypeReference[] => {
  const { checker, source, moduleSymbol } =
    compileDeclarations(declarationFile);
  const isLocal = (symbol: ts.Symbol) =>
    symbol.declarations?.some(
      declaration => declaration.getSourceFile() === source,
    ) ?? false;
  /** The local declarations of `symbol` that give it one of `meaning`. */
  const declarationsOf = (symbol: ts.Symbol, meaning: ts.SymbolFlags) =>
    (symbol.declarations ?? []).filter(
      declaration =>
        declaration.getSourceFile() === source &&
        declarationMeaning(declaration) & meaning,
    );

  /** The meanings of each symbol the entry exports, through renames. */
  const exported = new Map<ts.Symbol, ts.SymbolFlags>();
  const reach = (symbol: ts.Symbol, meaning: ts.SymbolFlags) => {
    const known = exported.get(symbol) ?? 0;
    const added = meaning & symbol.flags & MEANINGS & ~known;
    if (!added) return;
    exported.set(symbol, known | added);
    for (const declaration of declarationsOf(symbol, added)) {
      const renamed = renamedSymbol(checker, declaration);
      if (renamed && isLocal(renamed.symbol)) {
        reach(renamed.symbol, renamed.meaning);
      }
    }
  };
  const byName = new Map<string, ts.Symbol>();
  const namespaces = new Set<ts.Symbol>();
  const addExports = (moduleOrNamespace: ts.Symbol, prefix: string) => {
    for (const member of checker.getExportsOfModule(moduleOrNamespace)) {
      const target = resolveAlias(checker, member);
      byName.set(`${prefix}${member.name}`, target);
      reach(target, MEANINGS);
      if (
        !namespaces.has(target) &&
        target.flags &
          (ts.SymbolFlags.ValueModule | ts.SymbolFlags.NamespaceModule)
      ) {
        namespaces.add(target);
        addExports(target, `${prefix}${member.name}.`);
      }
    }
  };
  addExports(moduleSymbol, '');

  /** The declarations `symbol` has in `meaning`, its renames followed. */
  const ownDeclarations = (
    symbol: ts.Symbol,
    meaning: ts.SymbolFlags,
    seen = new Set<ts.Symbol>(),
  ): ts.Declaration[] => {
    seen.add(symbol);
    return declarationsOf(symbol, meaning).flatMap(declaration => {
      const renamed = renamedSymbol(checker, declaration);
      return renamed && isLocal(renamed.symbol) && !seen.has(renamed.symbol)
        ? ownDeclarations(renamed.symbol, renamed.meaning, seen)
        : [declaration];
    });
  };

  const references: UnexportedTypeReference[] = [];
  for (const owner of owners) {
    const symbol = byName.get(owner);
    if (!symbol) {
      throw new Error(`${declarationFile} does not export '${owner}'`);
    }
    const named = new Set<string>();
    const visit = (node: ts.Node) => {
      const reference = referencedName(node);
      const referenced =
        reference && checker.getSymbolAtLocation(reference.name);
      const target = referenced && resolveAlias(checker, referenced);
      if (
        reference &&
        target &&
        !(target.flags & ts.SymbolFlags.TypeParameter) &&
        isLocal(target) &&
        !((exported.get(target) ?? 0) & reference.meaning)
      ) {
        named.add(target.name);
      }
      ts.forEachChild(node, visit);
    };
    for (const declaration of ownDeclarations(symbol, MEANINGS)) {
      visit(declaration);
    }
    references.push(...[...named].sort().map(type => ({ owner, type })));
  }
  return references;
};

export interface ExportSurfaceProblemsProps {
  /** The entry, as the problems name it. */
  entry: string;
  declared: DeclaredExports;
  /** The runtime export names of each output format, such as ESM and CJS. */
  runtime: Record<string, readonly string[]>;
}

/**
 * Every mismatch between an entry's declarations and its runtime outputs: a
 * value the declarations promise that an output lacks, an output name the
 * declarations lack, and a star re-export the declarations cannot resolve.
 */
export const exportSurfaceProblems = ({
  entry,
  declared,
  runtime,
}: ExportSurfaceProblemsProps): string[] => {
  const declaredNames = new Set([...declared.values, ...declared.types]);
  return [
    ...declared.unresolvedStars.map(
      specifier =>
        `${entry}: the declarations re-export everything from '${specifier}', which does not resolve`,
    ),
    ...Object.entries(runtime).flatMap(([format, names]) => {
      const present = new Set(names);
      return [
        ...declared.values
          .filter(name => !present.has(name))
          .map(
            name =>
              `${entry}: '${name}' is declared as a value but the ${format} output does not export it`,
          ),
        ...names
          .filter(name => name !== 'default' && !declaredNames.has(name))
          .map(
            name =>
              `${entry}: the ${format} output exports '${name}', which the declarations do not`,
          ),
      ];
    }),
  ];
};

/**
 * The places `text` matches `pattern`: each match with its line number and the
 * line it is on, except on a line one of `allowedLines` matches whole.
 */
export const findMarkers = (
  text: string,
  pattern: RegExp,
  allowedLines: readonly RegExp[] = [],
): string[] =>
  text.split('\n').flatMap((line, index) => {
    if (allowedLines.some(allowed => allowed.test(line))) return [];
    const flags = pattern.flags.includes('g')
      ? pattern.flags
      : `${pattern.flags}g`;
    return [...line.matchAll(new RegExp(pattern.source, flags))].map(
      match => `${index + 1}: ${match[0]} in ${line.trim().slice(0, 160)}`,
    );
  });

/**
 * A pattern matching any of `names` as a whole identifier, or undefined for
 * no name.
 */
export const identifierPattern = (
  names: Iterable<string>,
): RegExp | undefined => {
  const alternatives = [...names]
    .sort()
    .map(name => name.replaceAll(/[$]/g, String.raw`\$`));
  return alternatives.length > 0
    ? new RegExp(String.raw`(?<![\w$])(?:${alternatives.join('|')})(?![\w$])`)
    : undefined;
};

/**
 * The identifiers of the exports only the canary build has: a top-level name,
 * or the member name of a namespace member such as `m.createPasskeyAuthoriser`
 * whose namespace the stable build also exports. An identifier the stable
 * build exports under any name, and the `allowed` ones, are left out: stable
 * output names them for its own exports.
 */
export const canaryOnlyIdentifiers = ({
  stable,
  canary,
  allowed = new Set(),
}: {
  stable: Iterable<string>;
  canary: Iterable<string>;
  allowed?: ReadonlySet<string>;
}): string[] => {
  const stableNames = new Set(stable);
  const stableIdentifiers = new Set(
    [...stableNames].flatMap(name => name.split('.')),
  );
  return [
    ...new Set(
      [...canary]
        .filter(name => !stableNames.has(name))
        .map(name => name.split('.').at(-1) ?? name)
        .filter(
          identifier =>
            !stableIdentifiers.has(identifier) && !allowed.has(identifier),
        ),
    ),
  ].sort();
};
