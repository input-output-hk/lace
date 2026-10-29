/**
 * Parity between the workspace files the stable SDK build replaces and their
 * stable variants (ADR 66): `x.stable.ts` stands in for `x.ts` in the stable
 * build, so every file that imports `x` compiles against either. The variant
 * exports what the original does, except the names its header declares it
 * leaves out, each on a `// stable-omits: name, name` line.
 */
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { exportsOfModule } from './export-surface.ts';

import type { ModuleExports } from './export-surface.ts';

/** A workspace file and the stable variant that replaces it. */
export interface StableVariant {
  original: string;
  variant: string;
}

const VARIANT = /\.stable(\.tsx?)$/;

/** The source directories of the SDK and of each workspace package. */
const sourceDirectories = (workspaceRoot: string): string[] => {
  const packages = path.join(workspaceRoot, 'packages');
  const packageSources = fs.existsSync(packages)
    ? fs
        .readdirSync(packages)
        .map(kind => path.join(packages, kind))
        .filter(directory => fs.statSync(directory).isDirectory())
        .flatMap(directory =>
          fs
            .readdirSync(directory)
            .map(name => path.join(directory, name, 'src')),
        )
    : [];
  return [
    path.join(workspaceRoot, 'apps/lace-sdk/src'),
    ...packageSources,
  ].filter(directory => fs.existsSync(directory));
};

/**
 * The stable variants in the SDK's `src` and under `packages/<kind>/<name>/src`
 * of `workspaceRoot`, each with the file it replaces, sorted by path. A variant
 * whose original is missing is returned with that original's expected path.
 */
export const findStableVariants = (workspaceRoot: string): StableVariant[] =>
  sourceDirectories(workspaceRoot)
    .flatMap(source =>
      fs
        .readdirSync(source, { recursive: true })
        .map(String)
        .filter(
          relative =>
            VARIANT.test(relative) && !relative.includes('node_modules'),
        )
        .map(relative => {
          const variant = path.join(source, relative);
          return { original: variant.replace(VARIANT, '$1'), variant };
        }),
    )
    .sort((a, b) => a.variant.localeCompare(b.variant));

const OMISSION = /^\s*\/\/\s*stable-omits:(.*)$/gm;

/** The export names a variant's `// stable-omits:` lines declare. */
export const readStableOmissions = (text: string): string[] =>
  [...text.matchAll(OMISSION)]
    .flatMap(([, names]) => names.split(','))
    .map(name => name.trim())
    .filter(Boolean)
    .sort();

/** The exports of each of `files`, compiled together under `options`. */
export const readModuleExports = (
  files: readonly string[],
  options: ts.CompilerOptions,
): Map<string, ModuleExports> => {
  // Ambient type packages add no export to a module, and loading them all
  // doubles the compile.
  const program = ts.createProgram([...files], {
    ...options,
    noEmit: true,
    types: [],
  });
  const checker = program.getTypeChecker();
  return new Map(
    files.map(file => {
      const source = program.getSourceFile(file);
      const moduleSymbol = source && checker.getSymbolAtLocation(source);
      // A file with no import or export is a script, not a module: it exports
      // nothing.
      return [
        file,
        moduleSymbol
          ? exportsOfModule(checker, moduleSymbol)
          : { values: [], types: [] },
      ];
    }),
  );
};

export interface StableVariantProblemsProps {
  /** The variant, as the problems name it. */
  variant: string;
  original: ModuleExports;
  stable: ModuleExports;
  /** The names the variant declares it omits. */
  omitted: readonly string[];
}

/**
 * Every way a variant departs from its original beyond the omissions it
 * declares: an original export it neither has nor declares omitted, an export
 * the original lacks, a name that is a value in one and a type in the other,
 * and a declared omission the original does not export or the variant does.
 */
export const stableVariantProblems = ({
  variant,
  original,
  stable,
  omitted,
}: StableVariantProblemsProps): string[] => {
  const kinds = ({ values, types }: ModuleExports) =>
    new Map([
      ...values.map(name => [name, 'value'] as const),
      ...types.map(name => [name, 'type'] as const),
    ]);
  const originalKinds = kinds(original);
  const stableKinds = kinds(stable);
  const declared = new Set(omitted);
  const problems: string[] = [];
  for (const [name, kind] of originalKinds) {
    const stableKind = stableKinds.get(name);
    if (stableKind === undefined) {
      if (!declared.has(name)) {
        problems.push(
          `${variant}: lacks the ${kind} '${name}' its original exports; export it or declare it in a stable-omits line`,
        );
      }
    } else if (stableKind !== kind) {
      problems.push(
        `${variant}: exports '${name}' as a ${stableKind}, its original as a ${kind}`,
      );
    }
  }
  for (const name of stableKinds.keys()) {
    if (!originalKinds.has(name)) {
      problems.push(
        `${variant}: exports '${name}', which its original does not`,
      );
    }
  }
  for (const name of declared) {
    if (!originalKinds.has(name)) {
      problems.push(
        `${variant}: declares '${name}' omitted, but its original does not export it`,
      );
    } else if (stableKinds.has(name)) {
      problems.push(`${variant}: declares '${name}' omitted, but exports it`);
    }
  }
  return problems;
};

/**
 * Every parity problem of the stable variants under `workspaceRoot`: each
 * original is read as the canary build and the apps compile it, and each
 * variant as the stable build does, with `stableOptions`.
 */
export const workspaceStableVariantProblems = ({
  workspaceRoot,
  canaryOptions,
  stableOptions,
}: {
  workspaceRoot: string;
  canaryOptions: ts.CompilerOptions;
  stableOptions: ts.CompilerOptions;
}): string[] => {
  const variants = findStableVariants(workspaceRoot);
  const name = (file: string) => path.relative(workspaceRoot, file);
  const missing = variants.filter(({ original }) => !fs.existsSync(original));
  const paired = variants.filter(({ original }) => fs.existsSync(original));
  const originals = readModuleExports(
    paired.map(({ original }) => original),
    canaryOptions,
  );
  const stables = readModuleExports(
    paired.map(({ variant }) => variant),
    stableOptions,
  );
  return [
    ...missing.map(
      ({ variant, original }) =>
        `${name(variant)}: replaces ${name(original)}, which does not exist`,
    ),
    ...paired.flatMap(({ original, variant }) =>
      stableVariantProblems({
        variant: name(variant),
        original: originals.get(original) ?? { values: [], types: [] },
        stable: stables.get(variant) ?? { values: [], types: [] },
        omitted: readStableOmissions(fs.readFileSync(variant, 'utf8')),
      }),
    ),
  ];
};
