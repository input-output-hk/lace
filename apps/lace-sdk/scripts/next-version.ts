/**
 * The version the next release of the SDK's family takes, from this
 * repository alone: its GitHub releases (scripts/releases.mjs) and the API
 * diff between the stable builds of the checked-out commit and of the
 * previous stable release's tag (ADR 66). The family, `@laceio/sdk` and the
 * Cardano packages, releases in lockstep: one `lace-sdk@` release carries one
 * version for all four, moved as far as the largest change among them. A
 * removed export, or one whose declaration changed without a
 * release-overrides.json entry, is a breaking change; an added export is a
 * feature; anything else is a patch. Before 1.0 a breaking change takes the
 * next minor and anything else the next patch; from 1.0 a breaking change
 * takes the next major and a feature the next minor. The first release is
 * 0.1.0. `apps/lace-sdk/release.json` promotes the family to a major version
 * the API diff never reaches, 1.0.0: when its `major` is above the previous
 * stable release's, the version is `<major>.0.0`. A canary previews the next
 * stable version, numbered one past the highest canary of it released.
 *
 * ```bash
 * node scripts/next-version.ts --channel stable --baseline <root> [--next <root>]
 * node scripts/next-version.ts --expect lace-sdk@0.2.0 --baseline <root>
 * node scripts/next-version.ts --channel canary --baseline <root> \
 *   --canary-previous <tag> --canary-baseline <root> --canary-next <root>
 * ```
 *
 * With `--package <name>`, one package of the family instead: its own
 * releases (`releases.mjs`, `--package`), its own exports in each tree, its
 * own release-overrides.json and release.json, and its own `<name>@` tags.
 * `--previous-dependencies` and `--dependencies` give the family packages'
 * versions at the previous release and now (`name@version`, space-separated):
 * a package whose range on one it depends on moves to a new compatibility
 * line takes a breaking change, since its declarations import that
 * package's types.
 *
 * `--next` and `--baseline` are trees holding each package's stable build
 * where the repository does (`apps/lace-sdk/dist/*.d.ts`,
 * `apps/lace-cardano/dist/*.d.ts`, …): the checked-out repository by default,
 * and the previous stable release's build (`releases.mjs previous` names it).
 * `--expect` checks an existing release instead: the version it names must be
 * the one this commit takes after the stable release below it, which holds a
 * release cut by hand to the same rules. Prints the result as JSON (`--out`
 * writes it to a file too, `--summary` a Markdown summary) and exits 1 on a
 * problem: an export removed or changed without being `@deprecated` in the
 * previous release, a version already released, or a canary before the first
 * stable release.
 *
 * A canary's own changes are in its canary build, which the stable diff never
 * reads. With `--canary-previous`, the result also compares the canary builds
 * in `--canary-next` and `--canary-baseline` (the same layout) for the notes:
 * this commit's with the release the canary's changes count from, the
 * previous canary or, with none since the latest stable release, that
 * release's canary build. The version still comes from the stable diff.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  compareExports,
  declarationsIn,
  type DeclaredExport,
  readExports,
  readOverrides,
  type ExportMap,
  type ReleaseOverride,
} from './release-compat.ts';
import {
  bumpVersion,
  canaryBaseFloor,
  compareVersions,
  loadPackageReleases,
  loadReleases,
  nextCanaryNumber,
  parsePackageReleaseTag,
  parseReleaseTag,
  parseVersion,
  previousStable,
  promotedVersion,
  readReleaseConfig,
  releaseName,
  TAG_PREFIX,
  type Bump,
  type ReleaseTag,
} from './releases.mjs';

/**
 * The packages one release carries, each with the entries whose declarations
 * are its API. `@laceio/sdk`'s exports keep their `<entry>:<name>` keys; each
 * Cardano package's are `<package>/<entry>:<name>`, and their declarations
 * import shared chunks, which are part of the API compared.
 */
export const FAMILY = [
  { name: '@laceio/sdk', directory: 'apps/lace-sdk', prefix: '' },
  {
    name: '@laceio/cardano',
    directory: 'apps/lace-cardano',
    prefix: '@laceio/cardano/',
    entries: [
      'core',
      'crypto',
      'util',
      'key-management',
      'input-selection',
      'tx-construction',
      'dapp-connector',
    ],
  },
  {
    name: '@laceio/cardano-ledger',
    directory: 'apps/lace-cardano-ledger',
    prefix: '@laceio/cardano-ledger/',
    entries: ['index'],
  },
  {
    name: '@laceio/cardano-trezor',
    directory: 'apps/lace-cardano-trezor',
    prefix: '@laceio/cardano-trezor/',
    entries: ['index'],
  },
] as const;

const prefixed = <T>(prefix: string, entries: Iterable<[string, T]>) =>
  [...entries].map(([key, value]): [string, T] => [`${prefix}${key}`, value]);

/** The family's members, or the one named `only`, which must be one. */
const membersOf = (only?: string) => {
  if (only === undefined) return FAMILY;
  const members = FAMILY.filter(member => member.name === only);
  if (members.length === 0) {
    throw new Error(`${only} is not a package of the SDK's family`);
  }
  return members;
};

/**
 * Every export of the family's stable builds under `root`, or with `only`,
 * of that package's.
 */
export const readFamilyExports = (root: string, only?: string): ExportMap =>
  new Map(
    membersOf(only).flatMap(member => {
      const directory = path.join(root, member.directory);
      if (!('entries' in member)) {
        return [...readExports(declarationsIn(directory))];
      }
      const files = Object.fromEntries(
        member.entries
          .map((entry): [string, string] => [
            entry,
            path.join(directory, 'dist', `${entry}.d.ts`),
          ])
          .filter(([, file]) => fs.existsSync(file)),
      );
      if (Object.keys(files).length === 0) return [];
      return prefixed(
        member.prefix,
        readExports(files, { followRelativeImports: true }),
      ).map(([key, value]): [string, DeclaredExport] => [
        key,
        { ...value, key },
      ]);
    }),
  );

/**
 * Each package's release overrides, keyed as readFamilyExports keys exports,
 * or with `only`, that package's.
 */
export const readFamilyOverrides = (
  root: string,
  only?: string,
): ReleaseOverride[] =>
  membersOf(only).flatMap(member =>
    readOverrides(path.join(root, member.directory)).map(override => ({
      ...override,
      export: `${member.prefix}${override.export}`,
    })),
  );

export interface StableVersion {
  /** The next stable version. */
  version: string;
  /**
   * The kind of change, `first` for the first release, or `promotion` when
   * release.json's major sets the version.
   */
  bump: Bump | 'first' | 'promotion';
  added: string[];
  removed: string[];
  changed: string[];
  /** Changed exports a release override declares compatible. */
  compatible: string[];
  /** The removed and changed exports that make the release breaking. */
  breaking: string[];
  /** Breaking exports that were not `@deprecated` in the previous release. */
  undeprecated: string[];
  /**
   * The family packages this one depends on whose range moved to a new
   * compatibility line since the previous release (`name@from→to`): their
   * types are this package's API, so the move makes the release breaking.
   */
  dependencies?: string[];
}

/**
 * The compatibility line a caret range on `version` stays within: the major
 * from 1.0, the minor before it, the patch before 0.1. A canary's line is its
 * stable version's.
 */
export const compatibilityLine = (version: string): string => {
  const { major, minor, patch } = parseVersion(version);
  if (major > 0) return `${major}`;
  return minor > 0 ? `0.${minor}` : `0.0.${patch}`;
};

/**
 * A family dependency's version at the previous release and at this one, by
 * name, as the workflow passes them (`name@version`).
 */
export interface DependencyVersions {
  previous: ReadonlyMap<string, string>;
  next: ReadonlyMap<string, string>;
}

/** The dependencies whose compatibility line moved, as `name@from→to`. */
export const movedDependencies = ({
  previous,
  next,
}: DependencyVersions): string[] =>
  [...next]
    .filter(
      ([name, version]) =>
        previous.has(name) &&
        compatibilityLine(previous.get(name) ?? '') !==
          compatibilityLine(version),
    )
    .map(([name, version]) => `${name}@${previous.get(name)}→${version}`)
    .sort();

/**
 * The next stable version after `previousVersion` for the change from
 * `previous` to `next`, or the promotion `major` asks for (release.json). An
 * override applies to the version it names, so a changed export counts as
 * compatible when an override names it for the version the release takes
 * without it: the version the release summary proposes for an override.
 */
export const nextStableVersion = ({
  previousVersion,
  previous,
  next,
  overrides,
  major = 0,
  dependencies,
}: {
  previousVersion: string | undefined;
  previous: ExportMap;
  next: ExportMap;
  overrides: readonly ReleaseOverride[];
  major?: number;
  /** For a package released on its own, its family dependencies' versions. */
  dependencies?: DependencyVersions;
}): StableVersion => {
  const promoted = promotedVersion(previousVersion, major);
  if (previousVersion === undefined) {
    return {
      version: promoted ?? bumpVersion(undefined, 'patch'),
      bump: promoted ? 'promotion' : 'first',
      added: [...next.keys()].sort(),
      removed: [],
      changed: [],
      compatible: [],
      breaking: [],
      undeprecated: [],
    };
  }
  const { added, removed, changed } = compareExports(previous, next);
  const compatibleBump: Bump = added.length > 0 ? 'feature' : 'patch';
  // An override names the version it applies to, and only the release's own
  // version counts, as in the public check (stableReleaseProblems): the
  // compatible version when every change is declared compatible for it and
  // nothing is removed, otherwise the breaking one, whose own overrides
  // still mark a change compatible there.
  const declaredFor = (version: string) =>
    new Set(
      overrides
        .filter(override => override.version === version)
        .map(override => override.export),
    );
  const compatibleVersion =
    promoted ?? bumpVersion(previousVersion, compatibleBump);
  // A dependency whose types this package's declarations import breaks
  // them when its line moves, though no export of this package changed.
  const moved = dependencies ? movedDependencies(dependencies) : [];
  const isCompatible =
    moved.length === 0 &&
    removed.length === 0 &&
    changed.every(key => declaredFor(compatibleVersion).has(key));
  const bump: Bump = isCompatible ? compatibleBump : 'breaking';
  const version = promoted ?? bumpVersion(previousVersion, bump);
  const declared = declaredFor(version);
  const compatible = changed.filter(key => declared.has(key));
  const breaking = [...removed, ...changed.filter(key => !declared.has(key))];
  return {
    version,
    bump: promoted ? 'promotion' : bump,
    added,
    removed,
    changed,
    compatible,
    breaking,
    undeprecated: breaking.filter(key => !previous.get(key)?.deprecated),
    ...(moved.length > 0 && { dependencies: moved }),
  };
};

export interface NextRelease extends StableVersion {
  channel: 'canary' | 'stable';
  /** The stable version a canary previews; the version itself for stable. */
  base: string;
  /**
   * For a canary previewing a higher version than the API diff gives, a
   * canary since the latest stable already previewed: the diff's version.
   */
  raisedFrom?: string;
  tag: string;
  /** The previous stable release's tag, or null before the first. */
  previous: string | null;
  /** A canary's own changes, for its notes: its canary build's diff. */
  canary?: CanaryChanges;
  /** The one package released, with --package; the whole family when absent. */
  package?: string;
  problems: string[];
  warnings: string[];
}

/**
 * The change between two canary builds: this commit's, and that of the
 * release a canary's changes count from (`previous`), the previous canary
 * or, with none since, the latest stable release.
 */
export interface CanaryChanges {
  previous: string;
  added: string[];
  removed: string[];
  changed: string[];
}

/**
 * The next release of `channel` given the repository's releases, the stable
 * change since the previous stable release, and, for `expect`, the release
 * being checked.
 */
export const nextRelease = ({
  channel,
  releases,
  previous,
  stable,
  expect,
  tagPrefix = TAG_PREFIX,
}: {
  channel: 'canary' | 'stable';
  releases: readonly ReleaseTag[];
  previous: ReleaseTag | undefined;
  stable: StableVersion;
  expect?: ReleaseTag;
  /** What a release tag names before its version: `lace-sdk@`, or a package's `<name>@`. */
  tagPrefix?: string;
}): NextRelease => {
  const problems: string[] = [];
  const warnings: string[] = [];
  // Between stable releases a canary never previews a lower version than one
  // already released, so the canary dist-tag only moves forward.
  // The canary being checked never raises its own floor.
  const floor =
    channel === 'canary'
      ? canaryBaseFloor(releases.filter(release => release.tag !== expect?.tag))
      : undefined;
  const base =
    floor !== undefined &&
    compareVersions(parseVersion(floor), parseVersion(stable.version)) > 0
      ? floor
      : stable.version;
  const canary =
    channel === 'canary'
      ? expect?.canary ?? nextCanaryNumber(releases, base)
      : undefined;
  const version = canary === undefined ? base : `${base}-canary.${canary}`;
  const tag = `${tagPrefix}${version}`;
  const from = previous?.tag ?? 'the first release';

  if (expect && expect.version !== version) {
    problems.push(
      `${expect.tag} is not the version this commit takes: its API diff with ${from} makes it ${tag}`,
    );
  }
  // By version: a package's release and the family's of one version are the
  // same published version.
  const released = releases.find(existing => existing.version === version);
  if (!expect && released) {
    problems.push(
      `${version} is already released (${released.tag}); a released version is final, so merge a change before releasing again`,
    );
  }
  if (channel === 'canary' && previous === undefined) {
    problems.push(
      `${tag} would be the package's first version, which npm makes its latest: release a stable version first`,
    );
  }
  for (const key of stable.undeprecated) {
    const message = `${key} changes or is removed without being @deprecated in ${from}`;
    // A canary carries no compatibility promise, so it previews the change;
    // the stable release that ships it is refused until it is deprecated first.
    (channel === 'canary' ? warnings : problems).push(message);
  }
  return {
    ...stable,
    channel,
    base,
    ...(base === stable.version ? {} : { raisedFrom: stable.version }),
    tag,
    version,
    previous: previous?.tag ?? null,
    problems,
    warnings,
  };
};

const list = (keys: readonly string[]) =>
  keys.map(key => `\`${key}\``).join(', ');

/** The release as Markdown, for the job summary and the release notes. */
export const summarise = (release: NextRelease): string => {
  const lines = [
    `### ${release.tag}`,
    '',
    release.bump === 'promotion'
      ? `\`apps/lace-sdk/release.json\` promotes the family to \`${release.base}\`.`
      : release.previous
      ? `A **${release.bump}** change since ${releaseName(
          release.previous,
          release.package,
        )}, so the ${
          release.channel === 'canary' ? 'next stable version' : 'version'
        } is \`${release.base}\`.`
      : `The first release, \`${release.base}\`.`,
    '',
  ];
  if (release.dependencies) {
    lines.push(
      `Its range on ${list(
        release.dependencies,
      )} moves to a new compatibility line, whose types its declarations import, so the change is breaking.`,
      '',
    );
  }
  if (release.raisedFrom) {
    lines.push(
      `The API diff gives \`${release.raisedFrom}\`, but a canary since the latest stable release already previews \`${release.base}\`, and a canary never previews a lower version.`,
      '',
    );
  }
  const isApiUnchanged =
    release.added.length === 0 &&
    release.removed.length === 0 &&
    release.changed.length === 0;
  if (release.previous && isApiUnchanged) {
    lines.push('No export changed.', '');
  } else if (release.previous) {
    lines.push(
      '| Exports | Count | Names |',
      '| --- | --- | --- |',
      `| Added | ${release.added.length} | ${list(release.added)} |`,
      `| Removed | ${release.removed.length} | ${list(release.removed)} |`,
      `| Changed | ${release.changed.length} | ${list(release.changed)} |`,
      '',
    );
    if (release.compatible.length > 0) {
      lines.push(
        `Declared compatible in release-overrides.json: ${list(
          release.compatible,
        )}.`,
        '',
      );
    }
    const unexplained = release.changed.filter(
      key => !release.compatible.includes(key),
    );
    if (unexplained.length > 0 && release.bump !== 'promotion') {
      lines.push(
        `A changed export that keeps calling code working is declared compatible in its package's \`release-overrides.json\` with the version \`${bumpVersion(
          release.previous.slice(release.previous.lastIndexOf('@') + 1),
          release.added.length > 0 ? 'feature' : 'patch',
        )}\`; the release then takes that version.`,
        '',
      );
    }
  } else {
    lines.push(`${release.added.length} stable exports.`, '');
  }
  if (release.canary) {
    const { canary } = release;
    lines.push(
      `The canary build, compared with \`${canary.previous}\`'s:`,
      '',
      '| Exports | Count | Names |',
      '| --- | --- | --- |',
      `| Added | ${canary.added.length} | ${list(canary.added)} |`,
      `| Removed | ${canary.removed.length} | ${list(canary.removed)} |`,
      `| Changed | ${canary.changed.length} | ${list(canary.changed)} |`,
      '',
    );
  }
  for (const problem of release.problems) lines.push(`- ❌ ${problem}`);
  for (const warning of release.warnings) lines.push(`- ⚠️ ${warning}`);
  return lines.join('\n') + '\n';
};

/** `name@version` pairs, space-separated, by name. */
const versionsByName = (specs = ''): Map<string, string> =>
  new Map(
    specs
      .split(/\s+/)
      .filter(Boolean)
      .map(spec => {
        const at = spec.lastIndexOf('@');
        return [spec.slice(0, at), spec.slice(at + 1)];
      }),
  );

/**
 * The versions, at the previous release and now, of the family packages the
 * package in `directory` depends on.
 */
export const dependencyVersions = (
  directory: string,
  previous: string | undefined,
  next: string | undefined,
): DependencyVersions => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, 'package.json'), 'utf8'),
  ) as { dependencies?: Record<string, string> };
  const own = (versions: Map<string, string>) =>
    new Map(
      [...versions].filter(([name]) => name in (manifest.dependencies ?? {})),
    );
  return {
    previous: own(versionsByName(previous)),
    next: own(versionsByName(next)),
  };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packageDirectory = path.resolve(import.meta.dirname, '..');
  const repositoryRoot = path.resolve(packageDirectory, '../..');
  const { values } = parseArgs({
    options: {
      channel: { type: 'string', default: 'stable' },
      expect: { type: 'string' },
      baseline: { type: 'string' },
      next: { type: 'string', default: repositoryRoot },
      'canary-previous': { type: 'string' },
      'canary-baseline': { type: 'string' },
      'canary-next': { type: 'string' },
      package: { type: 'string' },
      dependencies: { type: 'string' },
      'previous-dependencies': { type: 'string' },
      out: { type: 'string' },
      summary: { type: 'string' },
    },
  });
  // With --package, one package's release: its own releases, tags and
  // builds; without, the family's, in lockstep.
  const only = values.package;
  const [member] = membersOf(only);
  const tagPrefix = only ? `${only}@` : TAG_PREFIX;
  const expect = values.expect
    ? only
      ? parsePackageReleaseTag(values.expect)
      : parseReleaseTag(values.expect)
    : undefined;
  if (values.expect && (!expect || !values.expect.startsWith(tagPrefix))) {
    throw new Error(
      `--expect must be ${tagPrefix}X.Y.Z[-canary.N], not ${values.expect}`,
    );
  }
  const channel = expect
    ? expect.canary === undefined
      ? 'stable'
      : 'canary'
    : values.channel;
  if (channel !== 'stable' && channel !== 'canary') {
    throw new Error(`--channel must be stable or canary, not ${channel}`);
  }
  const releases = only ? loadPackageReleases(only) : loadReleases();
  // An existing release follows the stable release below the version it
  // names, so a re-run after later releases still checks it against its own.
  const previous = previousStable(releases, { below: expect?.base });
  if (previous && !values.baseline) {
    throw new Error(
      `--baseline must hold the stable builds of ${previous.tag}, the previous stable release`,
    );
  }
  const next = readFamilyExports(values.next, only);
  if (
    only ? next.size === 0 : ![...next.keys()].some(key => !key.startsWith('@'))
  ) {
    throw new Error(
      `${values.next} holds no stable build of ${
        only ?? '@laceio/sdk'
      }: run SDK_CHANNEL=stable npx nx run-many -t build -p tag:release:lace-sdk first`,
    );
  }
  const baseline: ExportMap = previous
    ? readFamilyExports(values.baseline ?? '', only)
    : new Map<string, DeclaredExport>();
  if (previous && baseline.size === 0) {
    throw new Error(
      `${values.baseline} holds no stable build of ${previous.tag}: every export would read as added`,
    );
  }
  const canaryPrevious = values['canary-previous'];
  const canaryBuild = (root: string | undefined, option: string) => {
    if (!root) {
      throw new Error(`--canary-previous needs --${option}`);
    }
    const exports = readFamilyExports(root, only);
    if (exports.size === 0) {
      throw new Error(`${root} (--${option}) holds no canary build`);
    }
    return exports;
  };
  const canary: CanaryChanges | undefined =
    channel === 'canary' && canaryPrevious
      ? {
          previous: canaryPrevious,
          ...compareExports(
            canaryBuild(values['canary-baseline'], 'canary-baseline'),
            canaryBuild(values['canary-next'], 'canary-next'),
          ),
        }
      : undefined;
  const release: NextRelease = {
    ...nextRelease({
      channel,
      releases,
      previous,
      expect,
      tagPrefix,
      stable: nextStableVersion({
        previousVersion: previous?.base,
        previous: baseline,
        next,
        overrides: readFamilyOverrides(repositoryRoot, only),
        // Each package's own release.json; the family's is the SDK's.
        major: readReleaseConfig(
          only ? path.join(repositoryRoot, member.directory) : packageDirectory,
        ).major,
        ...(only && {
          dependencies: dependencyVersions(
            path.join(repositoryRoot, member.directory),
            values['previous-dependencies'],
            values.dependencies,
          ),
        }),
      }),
    }),
    ...(canary && { canary }),
    ...(only && { package: only }),
  };
  const json = JSON.stringify(release, undefined, 2) + '\n';
  if (values.out) fs.writeFileSync(values.out, json);
  if (values.summary) fs.writeFileSync(values.summary, summarise(release));
  process.stdout.write(json);
  if (release.problems.length > 0) {
    // eslint-disable-next-line no-console -- the release gate's verdict
    console.error(
      `${release.tag} cannot be released:\n- ${release.problems.join('\n- ')}`,
    );
    process.exit(1);
  }
}
