// Whether a change reaches what the SDK's family ships, and the release notes
// of the pull requests that did, from this repository's history alone. What
// the family ships is the source the SDK's two builds and the Cardano
// packages reach (scripts/reach.mjs, which the declaration build and the
// standalone repository's generator share), the third-party packages those
// builds bundle or the packages depend on, as the lockfile resolves them
// (dependency-scope.ts), and the files of each package that decide its
// output.
//
//   node scripts/release-scope.ts changed [<ref>] [--package <name>] JSON: { ref, ships, files }
//   node scripts/release-scope.ts notes [<ref>] [--api <json>] [--first-canary] [--out <file>]
//   node scripts/release-scope.ts public-notes [<ref>] --api <json> [--out <file>]
//   node scripts/release-scope.ts fragment-check <base>             exits 1 without a fragment
//
// `changed` says whether anything the SDK ships differs between <ref> (the
// previous release's tag) and HEAD. `notes` lists the pull requests merged
// into HEAD since <ref> whose own change reached it, with the API diff from
// scripts/next-version.ts when given, as Markdown: the private release's
// notes. `public-notes` writes the public ones from next-version.ts's result
// alone: the version, the API section and where the docs and packages are,
// with no pull request, commit or SHA. Without <ref>, before the
// first release of the channel, everything ships and the notes name the
// first release; the first canary's notes take the latest stable release as
// <ref> with --first-canary, and list the changes since it. Both notes open
// with the changelog fragments added since <ref> (FRAGMENT_DIRECTORY), the
// users' account of the release. `fragment-check` fails a pull request into
// <base> that changes what the family ships and adds no fragment, nor edits
// one no release holds yet, or whose fragments name an internal term.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { parse as parseYaml } from 'yaml';

import {
  binaryOwners,
  buildTargetOf,
  buildTargetSeeds,
  importsOf,
  manifestBuildChanges,
  type ProjectJson,
  type Lockfile,
  lockSignature,
  packageOfSpecifier,
  type Seed,
  signatureChanges,
} from './dependency-scope.ts';
import { dependencyVersions, movedDependencies } from './next-version.ts';
import {
  CARDANO_APPS,
  cardanoReachedFiles,
  channelEntries,
  compilerOptions,
  packageDirectory,
  reachedOwnSource,
  reachedWorkspaceFiles,
} from './reach.mjs';
import { internalTermFindings } from './release-notes-check.ts';
import { PACKAGES, releaseName, TAG_PREFIX } from './releases.mjs';

const repositoryRoot = path.resolve(packageDirectory, '../..');

/**
 * The files of the family's packages, and of the workspace, that decide the
 * published output beside the source the builds reach: the bundler and
 * declaration configuration, the build and pack scripts, the manifests, the
 * README, licence and notice each tarball carries, and release.json, whose
 * major sets the version. Tests, docs and the release tooling itself are left
 * out.
 */
const SDK_SHIPPING_PATHS: readonly string[] = [
  'apps/lace-sdk/src/',
  'apps/lace-sdk/package.json',
  // The build target's command decides what the build runs.
  'apps/lace-sdk/project.json',
  'apps/lace-sdk/release.json',
  'apps/lace-sdk/README.md',
  'apps/lace-sdk/tsdown.config.ts',
  'apps/lace-sdk/rollup.dts.config.mjs',
  'apps/lace-sdk/tsconfig.json',
  'apps/lace-sdk/tsconfig.build.json',
  'apps/lace-sdk/tsconfig.dts-bundle.json',
  'apps/lace-sdk/tsconfig.dts-gen.json',
  'apps/lace-sdk/scripts/build.sh',
  'apps/lace-sdk/scripts/dts-gen-config.mjs',
  'apps/lace-sdk/scripts/entries.mjs',
  'apps/lace-sdk/scripts/pack.mjs',
  'apps/lace-sdk/scripts/reach.mjs',
  // Which @cardano-sdk imports the bundle and declarations import from
  // @laceio/cardano instead: the subpaths its manifest exports.
  'apps/lace-sdk/scripts/laceio-cardano.mjs',
  'apps/lace-cardano/package.json',
];

/** A Cardano package's files that decide its published output. */
const cardanoShippingPaths = (app: string): string[] => [
  `${app}/src/`,
  `${app}/scripts/build.sh`,
  `${app}/package.json`,
  `${app}/project.json`,
  `${app}/README.md`,
  `${app}/LICENSE`,
  `${app}/NOTICE`,
  `${app}/tsdown.config.ts`,
  `${app}/tsconfig.json`,
  `${app}/tsconfig.dts.json`,
];

/** The files that decide one package's published output, by its directory. */
export const shippingPathsOf = (directory: string): string[] => [
  ...(directory === 'apps/lace-sdk'
    ? SDK_SHIPPING_PATHS
    : cardanoShippingPaths(directory)),
  'tsconfig.base.json',
];

/** The files that decide what any package of the family publishes. */
export const SHIPPING_PATHS: readonly string[] = [
  ...SDK_SHIPPING_PATHS,
  ...CARDANO_APPS.flatMap(cardanoShippingPaths),
  'tsconfig.base.json',
];

/**
 * A manifest or lockfile outside the family's own packages: a change to one
 * ships only through the dependencies it resolves (dependency-scope.ts).
 */
export const isDependencyFile = (file: string) =>
  /(^|\/)(package\.json|package-lock\.json)$/.test(file) &&
  !SHIPPING_PATHS.includes(file);

/** A change the release notes name: a pull request, or a commit pushed directly. */
export interface ShippedChange {
  sha: string;
  number?: number;
  title: string;
  /** Whether the change reached what ships through manifests and lockfiles alone. */
  dependencies?: boolean;
}

/** The part of scripts/next-version.ts's result the notes show. */
export interface NotesApi {
  /** The release's tag, version and channel, for the public notes. */
  tag?: string;
  /** The one package the release publishes; the whole family when absent. */
  package?: string;
  version?: string;
  channel?: string;
  previous: string | null;
  bump: string;
  added: readonly string[];
  removed: readonly string[];
  changed: readonly string[];
  compatible: readonly string[];
  /** The stable version a canary previews. */
  base?: string;
  /** A canary's own changes: its canary build against `canary.previous`'s. */
  canary?: {
    previous: string;
    added: readonly string[];
    removed: readonly string[];
    changed: readonly string[];
  };
}

/**
 * Whether `file` (repository-relative) is part of what the family ships, or
 * with one package's `paths`, what that package ships.
 */
export const isShipped = (
  file: string,
  reached: ReadonlySet<string>,
  paths: readonly string[] = SHIPPING_PATHS,
) =>
  reached.has(file) ||
  paths.some(entry =>
    entry.endsWith('/') ? file.startsWith(entry) : file === entry,
  );

/** The SDK's builds: a release of one channel ships that channel's alone. */
type Channel = 'canary' | 'stable';
const CHANNELS: readonly Channel[] = ['stable', 'canary'];

/**
 * The workspace source the SDK's builds of `channels` (both by default) and
 * the Cardano packages reach, or with a package's `directory`, what that
 * package's build reaches, repository-relative. The Cardano packages have
 * one build, whatever the channel.
 */
export const reachedFiles = (
  directory?: string,
  channels: readonly Channel[] = CHANNELS,
): Set<string> =>
  new Set(
    [
      ...(directory === undefined || directory === 'apps/lace-sdk'
        ? channels.flatMap(channel =>
            reachedWorkspaceFiles(
              channelEntries(channel),
              compilerOptions(channel),
            ),
          )
        : []),
      ...(directory === undefined
        ? cardanoReachedFiles()
        : directory === 'apps/lace-sdk'
        ? []
        : cardanoReachedFiles([directory])),
    ].map(file =>
      path.relative(repositoryRoot, file).split(path.sep).join('/'),
    ),
  );

/**
 * The SDK's own source that only the builds outside `channels` reach,
 * repository-relative: none when `channels` are both. Its source otherwise
 * ships whole, so a file neither build reaches still counts.
 */
export const otherChannelSource = (
  channels: readonly Channel[],
): Set<string> => {
  const others = CHANNELS.filter(channel => !channels.includes(channel));
  if (others.length === 0) return new Set();
  const own = new Set(
    channels.flatMap(channel => [...reachedOwnSource(channel)]),
  );
  return new Set(
    others
      .flatMap(channel => [...reachedOwnSource(channel)])
      .filter(file => !own.has(file))
      .map(file =>
        path.relative(repositoryRoot, file).split(path.sep).join('/'),
      ),
  );
};

/** The family's own packages: their manifests are part of what ships. */
const FAMILY_APPS = ['apps/lace-sdk', ...CARDANO_APPS];

/**
 * What a release covers: the workspace source its builds reach, the paths
 * that ship as they are, and the family packages whose manifests, sources
 * and build tools seed its third-party dependencies.
 * A release of one channel excludes the SDK source only the other
 * channel's build reaches.
 */
interface ReleaseScope {
  reached: ReadonlySet<string>;
  paths: readonly string[];
  apps: readonly string[];
  excluded?: ReadonlySet<string>;
}

/** The whole family's scope: every package releases together. */
const familyScope = (
  channels: readonly Channel[] = CHANNELS,
): ReleaseScope => ({
  reached: reachedFiles(undefined, channels),
  excluded: otherChannelSource(channels),
  paths: SHIPPING_PATHS,
  apps: FAMILY_APPS,
});

/** One family package's scope, from its directory. */
const packageScope = (
  directory: string,
  channels: readonly Channel[] = CHANNELS,
): ReleaseScope => ({
  reached: reachedFiles(directory, channels),
  ...(directory === 'apps/lace-sdk' && {
    excluded: otherChannelSource(channels),
  }),
  paths: shippingPathsOf(directory),
  apps: [directory],
});

/**
 * The third-party packages the family's builds reach, as seeds to resolve in
 * a lockfile: each module the reached source and the family's own source
 * import, from the package directory that imports it, and what the family's
 * manifests at `ref` declare; with `apps`, only those packages'.
 */
const dependencySeeds = (
  ref: string,
  reached: ReadonlySet<string>,
  apps: readonly string[],
): Seed[] => {
  const ownSources = apps.flatMap(app =>
    fs
      .readdirSync(path.join(repositoryRoot, app, 'src'), { recursive: true })
      .map(file => `${app}/src/${String(file).split(path.sep).join('/')}`),
  );
  const seeds: Seed[] = [];
  for (const file of new Set([...reached, ...ownSources])) {
    if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
    const absolute = path.join(repositoryRoot, file);
    if (!fs.existsSync(absolute)) continue;
    const from =
      /^(packages\/[^/]+\/[^/]+|apps\/[^/]+)\//.exec(file)?.[1] ?? '';
    for (const specifier of importsOf(fs.readFileSync(absolute, 'utf8'))) {
      const name = packageOfSpecifier(specifier);
      if (name) seeds.push({ from, name });
    }
  }
  // The tools the build targets run from the root install, and what the
  // scripts and configuration they load import.
  seeds.push(
    ...buildToolSeeds(
      ref,
      readAt<Lockfile>(ref, 'package-lock.json') ?? { packages: {} },
      apps,
    ),
  );
  for (const app of apps) {
    const manifest = readAt<Record<string, Record<string, string>>>(
      ref,
      `${app}/package.json`,
    );
    for (const field of [
      'dependencies',
      'peerDependencies',
      'devDependencies',
    ]) {
      for (const name of Object.keys(manifest?.[field] ?? {})) {
        seeds.push({ from: app, name });
      }
    }
  }
  return seeds;
};

/** A file's text at `ref`, or undefined when `ref` has no such file. */
const textAt = (ref: string, file: string): string | undefined => {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch {
    return undefined;
  }
};

/** The names of the files directly in `directory` at `ref`. */
const filesAt = (ref: string, directory: string): string[] => {
  try {
    return execFileSync(
      'git',
      ['ls-tree', '--name-only', `${ref}:${directory}`],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    )
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
};

/**
 * The seeds of what the family's build targets run from the root install
 * (dependency-scope.ts buildTargetSeeds), read at `ref` with the lockfile of
 * the same commit: its project.json files, the scripts they run and the
 * tools' configuration, so both sides of a comparison are consistent and a
 * change to the build itself is compared like any other. A family app that
 * `ref` does not have yet builds nothing there.
 */
const buildToolSeeds = (
  ref: string,
  lock: Lockfile,
  apps: readonly string[],
): Seed[] => {
  const owners = binaryOwners(lock);
  const read = (file: string) => textAt(ref, file);
  return apps.flatMap(app => {
    const project = read(`${app}/project.json`);
    if (project === undefined) return [];
    return buildTargetSeeds({
      target: buildTargetOf(app, JSON.parse(project) as ProjectJson),
      read,
      configs: filesAt(ref, app).filter(file =>
        /\.config\.[cm]?[jt]s$/.test(file),
      ),
      owners,
      hasPackage: name => Boolean(lock.packages[`node_modules/${name}`]),
    });
  });
};

const readAt = <T>(ref: string, file: string): T | undefined => {
  try {
    return JSON.parse(
      execFileSync('git', ['show', `${ref}:${file}`], {
        cwd: repositoryRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 256 * 1024 * 1024,
      }),
    ) as T;
  } catch {
    return undefined;
  }
};

const signatureAt = (
  ref: string,
  reached: ReadonlySet<string>,
  apps: readonly string[],
) =>
  lockSignature(
    readAt<Lockfile>(ref, 'package-lock.json') ?? { packages: {} },
    dependencySeeds(ref, reached, apps),
    readAt<{ overrides?: Record<string, unknown> }>(ref, 'package.json')
      ?.overrides,
  );

/**
 * The third-party packages whose resolved entries, or the root overrides
 * that name them, differ between two commits, among those the family's
 * builds reach, or with a package's scope, that package's builds reach.
 */
export const dependencyChanges = (
  from: string,
  to: string,
  { reached, apps }: Omit<ReleaseScope, 'paths'> = familyScope(),
): string[] =>
  signatureChanges(
    signatureAt(from, reached, apps),
    signatureAt(to, reached, apps),
  );

/**
 * The pull request a commit on the first-parent history merged: GitHub's
 * merge commit (`Merge pull request #N from …`, the title in its body) or a
 * squash merge (`Title (#N)`). Undefined for a commit pushed directly.
 */
export const pullRequestOf = ({
  subject,
  body,
}: {
  subject: string;
  body: string;
}): { number: number; title: string } | undefined => {
  const merge = /^Merge pull request #(\d+) from \S+/.exec(subject);
  if (merge) {
    const title = body
      .split('\n')
      .map(line => line.trim())
      .find(Boolean);
    return { number: Number(merge[1]), title: title ?? subject };
  }
  const squash = /^(.*\S)\s+\(#(\d+)\)$/.exec(subject);
  return squash ? { number: Number(squash[2]), title: squash[1] } : undefined;
};

type Manifest = Record<string, unknown>;

/**
 * The manifests of the workspace packages the family's builds reach, among
 * `files`, whose build fields differ between two readings, each with the
 * fields that changed: an `exports` entry redirecting a reached subpath, or
 * `sideEffects`, changes what bundles while every reached source file and
 * lock entry stays the same.
 */
export const workspaceManifestChanges = ({
  files,
  reached,
  before,
  after,
}: {
  files: readonly string[];
  reached: ReadonlySet<string>;
  before: (file: string) => Manifest | undefined;
  after: (file: string) => Manifest | undefined;
}): string[] => {
  const packages = new Set(
    [...reached].flatMap(
      file => /^(packages\/[^/]+\/[^/]+|apps\/[^/]+)\//.exec(file)?.[1] ?? [],
    ),
  );
  return files
    .filter(file => {
      const directory = path.posix.dirname(file);
      return (
        file.endsWith('/package.json') &&
        packages.has(directory) &&
        !FAMILY_APPS.includes(directory)
      );
    })
    .flatMap(file => {
      const fields = manifestBuildChanges(before(file), after(file));
      return fields.length > 0 ? [`${file} (${fields.join(', ')})`] : [];
    });
};

const git = (args: string[], cwd = repositoryRoot, input?: string): string =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    input,
    maxBuffer: 256 * 1024 * 1024,
  });

const changedFiles = (from: string, to: string): string[] =>
  git(['diff', '--name-only', '--no-renames', from, to, '--'])
    .split('\n')
    .filter(Boolean);

/**
 * Whether a family package's project.json changed only around its build
 * target: tags and dependency hints decide nothing the package publishes.
 */
export const isBuildTargetUnchanged = (
  file: string,
  before: (file: string) => ProjectJson | undefined,
  after: (file: string) => ProjectJson | undefined,
) =>
  file.endsWith('/project.json') &&
  FAMILY_APPS.includes(path.posix.dirname(file)) &&
  JSON.stringify(before(file)?.targets?.build) ===
    JSON.stringify(after(file)?.targets?.build);

/**
 * The shipped files that differ between `ref` and HEAD: the family's, or with
 * one package's scope, that package's.
 */
export const shippedChanges = (
  ref: string,
  scope: ReleaseScope = familyScope(),
): string[] => {
  const { reached, paths, excluded } = scope;
  const files = changedFiles(ref, 'HEAD');
  return [
    ...files.filter(
      file =>
        !excluded?.has(file) &&
        isShipped(file, reached, paths) &&
        !isBuildTargetUnchanged(
          file,
          entry => readAt<ProjectJson>(ref, entry),
          entry => readAt<ProjectJson>('HEAD', entry),
        ),
    ),
    ...workspaceManifestChanges({
      files,
      reached,
      before: file => readAt<Manifest>(ref, file),
      after: file => readAt<Manifest>('HEAD', file),
    }).map(entry => `manifest: ${entry}`),
    ...(files.some(isDependencyFile)
      ? dependencyChanges(ref, 'HEAD', scope).map(
          entry => `dependency: ${entry}`,
        )
      : []),
  ];
};

/**
 * The family dependencies of the package in `directory` whose range moved
 * to a new compatibility line between two sets of versions (`name@version`,
 * space-separated), as `dependency line: name@from→to`.
 */
export const dependencyLineChanges = (
  directory: string,
  since: string | undefined,
  now: string | undefined,
): string[] =>
  movedDependencies(dependencyVersions(directory, since, now)).map(
    moved => `dependency line: ${moved}`,
  );

/**
 * The commits on HEAD's first-parent history since `ref`, each with the
 * files it changed against its first parent: one per merged pull request.
 */
const firstParentCommits = (ref: string) =>
  git(['log', '--first-parent', '--format=%H%x1f%s%x1f%b%x1e', `${ref}..HEAD`])
    .split('\x1e')
    .map(record => record.replace(/^\n/, ''))
    .filter(Boolean)
    .map(record => {
      const [sha = '', subject = '', body = ''] = record.split('\x1f');
      const parent = git(['rev-list', '--parents', '-n', '1', sha])
        .trim()
        .split(' ')[1];
      return {
        sha,
        subject,
        body,
        parent,
        files: parent
          ? changedFiles(parent, sha)
          : git(['show', '--name-only', '--format=', sha])
              .split('\n')
              .filter(Boolean),
      };
    })
    .reverse();

/**
 * A ticket of the internal tracker, as titles write it: `LW-123`, `LW 123`,
 * `LW_123`, `LW123`, or with `lace` for `LW`.
 */
const TICKET = '(?:lw|lace)[\\s_-]?\\d{3,}';

/**
 * A pull request's title as the public notes carry it: the ticket references
 * this repository's titles carry (`[LW-123]`, `LW-123:`, a `(lw-123)` scope)
 * name an internal tracker, so they are dropped.
 */
const TICKETS = `${TICKET}(?:\\s*,\\s*${TICKET})*`;

export const cleanTitle = (title: string): string =>
  title
    // A title made from a branch name: `Feat/<ticket> …`.
    .replace(
      /^(?:feat|fix|chore|refactor|docs|test|ci|build|perf)\/(?=\S)/i,
      '',
    )
    // One ticket or a list of them, bracketed: `[LW-1, LW-2]`.
    .replaceAll(new RegExp(`\\s*\\[${TICKETS}\\]`, 'gi'), '')
    .replaceAll(new RegExp(`\\(${TICKETS}\\)`, 'gi'), '')
    .replaceAll(new RegExp(`\\b${TICKET}\\b[:/]?\\s*`, 'gi'), '')
    // The separator a leading ticket left: `[LW-123] - …`.
    .replace(/^\s*[-–—:]\s+/, '')
    .replaceAll(/\s{2,}/g, ' ')
    .trim();

/**
 * The pull request's title as GitHub holds it now, when RELEASE_NOTES_TITLES
 * is `github`: a title a release manager edits on GitHub, to take an internal
 * term out of the notes, is what the next run writes. Undefined otherwise,
 * or when the API does not answer, and the merge commit's title stands.
 */
const titleFromGitHub = (pull: number): string | undefined => {
  if (process.env.RELEASE_NOTES_TITLES !== 'github') return undefined;
  try {
    return (
      execFileSync(
        'gh',
        [
          'api',
          `/repos/${process.env.GITHUB_REPOSITORY}/pulls/${pull}`,
          '--jq',
          '.title',
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      ).trim() || undefined
    );
  } catch {
    return undefined;
  }
};

/**
 * The family's changelog fragments, which changie writes (`.changie.yaml`
 * beside them): one file per user-facing change, with its kind. A release
 * commits nothing back, so it deletes no fragment: a release's notes take the
 * fragments added since the release its changes count from, and the monthly
 * sweep (sdk-changelog-sweep.yml) deletes those both channels have released.
 */
export const FRAGMENT_DIRECTORY = 'apps/lace-sdk/.changes/fragments';

/** The fragment kinds, Keep a Changelog's, in the order the notes list them. */
export const FRAGMENT_KINDS = [
  'Added',
  'Changed',
  'Deprecated',
  'Removed',
  'Fixed',
  'Security',
] as const;

/**
 * The packages a fragment can name (`custom.Package`): one package of the
 * family by its id, or `all` for a change every package's users see.
 */
export const FRAGMENT_PACKAGES = [
  'sdk',
  'cardano',
  'cardano-ledger',
  'cardano-trezor',
  'all',
] as const;

export interface Fragment {
  /** The fragment's path, repository-relative. */
  file: string;
  kind: (typeof FRAGMENT_KINDS)[number];
  body: string;
  /** The packages whose release notes list it, by npm name. */
  packages: string[];
  /**
   * Whether the fragment names its package. One written before fragments
   * named a package reads as `all`, so it never stops a release's notes;
   * the changelog check asks for the name on any fragment a change touches.
   */
  packageNamed: boolean;
  /**
   * The build the change is in: `canary` for a feature only the canary build
   * has, which a stable release's notes leave out.
   */
  build: 'canary' | 'stable';
  /** When changie wrote it, which orders fragments of one kind. */
  time: string;
}

/** A fragment's YAML, read strictly: a known kind, a body and its build. */
export const parseFragment = (file: string, text: string): Fragment => {
  const value: unknown = parseYaml(text);
  const record = (value ?? {}) as Record<string, unknown>;
  const kind = FRAGMENT_KINDS.find(known => known === record.kind);
  const body = typeof record.body === 'string' ? record.body.trim() : '';
  if (!kind) {
    throw new Error(
      `${file}: kind must be one of ${FRAGMENT_KINDS.join(', ')}, not ${String(
        record.kind,
      )}`,
    );
  }
  if (!body) throw new Error(`${file}: the fragment has no body`);
  const custom = (record.custom ?? {}) as Record<string, unknown>;
  const build = custom.Build;
  if (build !== 'stable' && build !== 'canary') {
    throw new Error(
      `${file}: custom.Build must be stable or canary, not ${String(build)}`,
    );
  }
  const named =
    custom.Package === undefined
      ? 'all'
      : FRAGMENT_PACKAGES.find(known => known === custom.Package);
  if (!named) {
    throw new Error(
      `${file}: custom.Package must be one of ${FRAGMENT_PACKAGES.join(
        ', ',
      )}, not ${String(custom.Package)}`,
    );
  }
  const packages =
    named === 'all' ? PACKAGES.map(({ name }) => name) : [`@laceio/${named}`];
  const time =
    record.time instanceof Date
      ? record.time.toISOString()
      : typeof record.time === 'string' || typeof record.time === 'number'
      ? String(record.time)
      : '';
  return {
    file,
    kind,
    body,
    packages,
    packageNamed: custom.Package !== undefined,
    build,
    time,
  };
};

/** The fragments the release notes of `name` list, or all of them for the family's. */
export const fragmentsOf = (
  fragments: readonly Fragment[],
  name: string | undefined,
): Fragment[] =>
  name === undefined
    ? [...fragments]
    : fragments.filter(fragment => fragment.packages.includes(name));

/** The fragment files that differ between `ref` and HEAD as `filter` selects. */
const fragmentFilesSince = (ref: string, filter: 'A' | 'M', root: string) =>
  git(
    [
      'diff',
      '--name-only',
      '--no-renames',
      `--diff-filter=${filter}`,
      ref,
      'HEAD',
      '--',
      FRAGMENT_DIRECTORY,
    ],
    root,
  )
    .split('\n')
    .filter(file => file.endsWith('.yaml'));

const fragmentAtHead = (file: string, root: string) =>
  parseFragment(file, git(['show', `HEAD:${file}`], root));

/**
 * The fragments added since `ref` that HEAD holds, or every fragment before
 * the first release.
 */
export const fragmentsSince = (
  ref: string | undefined,
  root = repositoryRoot,
): Fragment[] =>
  (ref
    ? fragmentFilesSince(ref, 'A', root)
    : git(['ls-files', '--', FRAGMENT_DIRECTORY], root)
        .split('\n')
        .filter(file => file.endsWith('.yaml'))
  ).map(file => fragmentAtHead(file, root));

/**
 * Those of `files` that a release tag's tree holds, the family's or a
 * package's. A tag counts whether or not its release was published: the
 * check needs only git, and treating a draft as released asks for a new
 * fragment where an edit would have done.
 */
const releasedFragmentFiles = (
  files: readonly string[],
  root: string,
): Set<string> => {
  const tags = git(
    [
      'for-each-ref',
      '--format=%(refname)',
      `refs/tags/${TAG_PREFIX}*`,
      'refs/tags/@laceio/',
    ],
    root,
  )
    .split('\n')
    .filter(Boolean);
  if (files.length === 0 || tags.length === 0) return new Set();
  const answers = git(
    ['cat-file', '--batch-check'],
    root,
    tags.flatMap(tag => files.map(file => `${tag}:${file}\n`)).join(''),
  ).split('\n');
  return new Set(
    files.filter((_, index) =>
      tags.some(
        (_, tag) => !answers[tag * files.length + index]?.endsWith(' missing'),
      ),
    ),
  );
};

/**
 * The fragments a pull request into `base` adds or edits, and which of the
 * edited ones a release already holds. A release lists only the fragments
 * added since the release before it of its channel, so an edit to a fragment
 * a release holds reaches no later release's notes: the change it describes
 * needs a fragment of its own.
 */
export const pullRequestFragments = (
  base: string,
  root = repositoryRoot,
): { fragments: Fragment[]; released: string[] } => {
  const edited = fragmentFilesSince(base, 'M', root);
  const held = releasedFragmentFiles(edited, root);
  return {
    fragments: [...fragmentFilesSince(base, 'A', root), ...edited].map(file =>
      fragmentAtHead(file, root),
    ),
    released: edited.filter(file => held.has(file)),
  };
};

/** A fragment's entry: its body as a list item, continued lines indented. */
const fragmentItem = (fragment: Fragment) =>
  `- ${fragment.body.split('\n').join('\n  ')}`;

/**
 * The fragments a release of `channel` lists: a stable release leaves out
 * changes only the canary build has.
 */
const releasedFragments = (
  fragments: readonly Fragment[],
  channel: string | undefined,
) =>
  channel === 'stable'
    ? fragments.filter(fragment => fragment.build === 'stable')
    : fragments;

/** The fragments by kind, in Keep a Changelog's order, oldest first. */
const fragmentLines = (fragments: readonly Fragment[]): string[] =>
  FRAGMENT_KINDS.flatMap(kind => {
    const ofKind = fragments
      .filter(fragment => fragment.kind === kind)
      .sort(
        (a, b) => a.time.localeCompare(b.time) || a.file.localeCompare(b.file),
      );
    return ofKind.length > 0
      ? [`### ${kind}`, '', ...ofKind.map(fragmentItem), '']
      : [];
  });

/**
 * A pull request's fragment problems: a change to what a package of the
 * family ships that adds no fragment naming that package, nor edits one no
 * release holds yet, and any fragment it touches naming an internal term,
 * which the public notes' leak-check would refuse at release.
 */
export const fragmentProblems = ({
  shipped,
  fragments,
  released = [],
}: {
  /** What the pull request changes that each package ships, by npm name. */
  shipped: Readonly<Record<string, readonly string[]>>;
  /** The fragments the pull request adds or edits. */
  fragments: readonly Fragment[];
  /** The edited fragments a release already holds, which count for nothing. */
  released?: readonly string[];
}): string[] => [
  ...Object.entries(shipped)
    .filter(
      ([name, files]) =>
        files.length > 0 &&
        !fragments.some(
          fragment =>
            fragment.packages.includes(name) &&
            !released.includes(fragment.file),
        ),
    )
    .map(([name, files]) => {
      const held = fragments
        .filter(fragment => fragment.packages.includes(name))
        .map(fragment => fragment.file);
      return `This change reaches what \`${name}\` ships (${files
        .slice(0, 5)
        .join(', ')}${files.length > 5 ? ', …' : ''}) and adds ${
        held.length > 0
          ? `no changelog fragment for it: a release already holds ${held.join(
              ', ',
            )}, so an edit to it reaches no later release's notes`
          : 'or edits no changelog fragment for it'
      }. From apps/lace-sdk, run \`npx changie new\`, choose its package, and describe the change for its users, edit an unreleased fragment already describing it, or label the pull request \`skip-changelog\` when they would not notice it.`;
    }),
  ...fragments
    .filter(fragment => !fragment.packageNamed)
    .map(
      fragment =>
        `${fragment.file} names no package; add custom.Package (sdk, cardano, cardano-ledger, cardano-trezor or all), which \`npx changie new\` asks for.`,
    ),
  ...fragments.flatMap(fragment =>
    internalTermFindings(fragment.body).map(
      finding =>
        `${fragment.file} names an internal term (${finding}); the public release notes publish the fragment as written.`,
    ),
  ),
];

const exportList = (keys: readonly string[]) =>
  keys.length > 0 ? keys.map(key => `\`${key}\``).join(', ') : 'none';

/**
 * The API section's body. A canary describes what it changed, its canary
 * build against the one its changes count from, and names the stable version
 * it previews; the stable diff alone would miss its canary-only surface.
 */
const apiLines = (api: NotesApi): string[] => {
  if (api.channel === 'canary' && api.canary) {
    const { canary } = api;
    const previous = releaseName(canary.previous, api.package);
    // A canary that changes no export says so, as a stable release does.
    const isUnchanged =
      canary.added.length === 0 &&
      canary.removed.length === 0 &&
      canary.changed.length === 0;
    return [
      ...(isUnchanged
        ? [`The canary build, compared with ${previous}'s: no export changed.`]
        : [
            `The canary build, compared with ${previous}'s:`,
            '',
            `- Added: ${exportList(canary.added)}`,
            `- Removed: ${exportList(canary.removed)}`,
            `- Changed: ${exportList(canary.changed)}`,
          ]),
      ...(api.previous && api.base
        ? [
            '',
            `It previews \`${api.base}\`: the stable API takes a ${
              api.bump
            } change since ${releaseName(api.previous, api.package)}.`,
          ]
        : []),
    ];
  }
  if (!api.previous) {
    return [`The first release, with ${api.added.length} stable exports.`];
  }
  const previous = releaseName(api.previous, api.package);
  // A release that changes no export says so, rather than listing none
  // three times.
  if (
    api.added.length === 0 &&
    api.removed.length === 0 &&
    api.changed.length === 0
  ) {
    return [
      `Compared with ${previous}: a ${api.bump} change; no export changed.`,
    ];
  }
  return [
    `Compared with ${previous}: a ${api.bump} change.`,
    '',
    `- Added: ${exportList(api.added)}`,
    `- Removed: ${exportList(api.removed)}`,
    `- Changed: ${exportList(api.changed)}`,
    ...(api.compatible.length > 0
      ? [`- Declared compatible: ${exportList(api.compatible)}`]
      : []),
  ];
};

/**
 * The release notes: the pull requests (or direct commits) whose change
 * reached what the SDK ships, oldest first, then the API diff.
 */
export const renderNotes = ({
  ref,
  changes,
  api,
  fragments = [],
  firstCanary = false,
  package: name,
}: {
  ref: string | undefined;
  changes: readonly ShippedChange[];
  api?: NotesApi;
  /** The changelog fragments added since `ref`. */
  fragments?: readonly Fragment[];
  /** The first canary, whose changes count from the latest stable `ref`. */
  firstCanary?: boolean;
  /** The family package released on its own; the SDK's family otherwise. */
  package?: string;
}): string => {
  const subject = name ? `\`${name}\`` : 'the SDK';
  const released = releasedFragments(fragments, api?.channel);
  const lines =
    released.length > 0
      ? ["## What's new", '', ...fragmentLines(released), '## Changes', '']
      : ['## Changes', ''];
  const item = (change: ShippedChange) =>
    change.number === undefined
      ? `- ${change.title} (${change.sha.slice(0, 12)})`
      : `- ${change.title} (#${change.number})`;
  const code = changes.filter(change => !change.dependencies);
  const dependencies = changes.filter(change => change.dependencies);
  if (ref === undefined) {
    lines.push(
      name ? `The first release of ${subject}.` : "The SDK's first release.",
    );
  } else if (firstCanary) {
    lines.push(
      `${
        name ? `The first canary of ${subject}` : "The SDK's first canary"
      }, with the changes since ${releaseName(ref, name)}${
        changes.length === 0 ? ': none, beyond the canary features' : ':'
      }`,
    );
  } else if (changes.length === 0) {
    lines.push(
      `No change to what ${subject} ships since ${releaseName(ref, name)}.`,
    );
  } else if (code.length === 0) {
    lines.push('Dependency updates only.');
  }
  lines.push(...code.map(item));
  if (dependencies.length > 0) {
    lines.push('', '## Dependency updates', '', ...dependencies.map(item));
  }
  if (api) {
    lines.push('', '## API', '', ...apiLines(api));
  }
  return lines.join('\n') + '\n';
};

/** The packages each release carries, in lockstep, at its version. */
const RELEASED_PACKAGES = [
  '@laceio/sdk',
  '@laceio/cardano',
  '@laceio/cardano-ledger',
  '@laceio/cardano-trezor',
];

/**
 * The public notes of a release: its version, the API section, and where its
 * docs and packages are. They name no pull request, commit or SHA: the
 * release reaches the public repository as one commit with none of this
 * repository's history, so its notes describe the published API alone, and
 * the list of pull requests stays in the private release (renderNotes).
 */
export const renderPublicNotes = (
  api: NotesApi,
  fragments: readonly Fragment[] = [],
): string => {
  const version = api.version ?? '';
  const isCanary = api.channel === 'canary';
  const released = releasedFragments(fragments, api.channel);
  // Each package's stable release has an archive of its docs (ADR 67):
  // @laceio/sdk's and the family's the whole site at /v/X.Y.Z/, another
  // package's its own pages at /<package>/v/X.Y.Z/. Each leads to the latest
  // docs while the release is the package's latest.
  const docs = isCanary
    ? 'https://sdk.lace.io/canary/'
    : api.package === undefined || api.package === '@laceio/sdk'
    ? `https://sdk.lace.io/v/${version}/`
    : `https://sdk.lace.io/${api.package.replace(
        '@laceio/',
        '',
      )}/v/${version}/`;
  const packages = api.package ? [api.package] : RELEASED_PACKAGES;
  const lines = [
    `## ${api.tag ?? `lace-sdk@${version}`}`,
    '',
    isCanary
      ? `A canary release, previewing the next stable version: install it as \`@canary\` or \`@${version}\`.`
      : 'A stable release.',
    '',
    ...(released.length > 0
      ? ["## What's new", '', ...fragmentLines(released)]
      : []),
    '## API',
    '',
  ];
  if (api.bump === 'promotion') {
    lines.push(
      `The packages are promoted to \`${version.replace(/-.*/, '')}\`.`,
      '',
    );
  }
  lines.push(
    ...apiLines(api),
    '',
    '## Packages',
    '',
    ...packages.map(
      name =>
        `- [\`${name}@${version}\`](https://www.npmjs.com/package/${name}/v/${version})`,
    ),
    '',
    `Docs: ${docs}`,
  );
  return lines.join('\n') + '\n';
};

/** The changes since `ref` that reached what the SDK ships. */
export const shippedPullRequests = (
  ref: string,
  scope: ReleaseScope = familyScope(),
): ShippedChange[] => {
  const { reached, paths, excluded } = scope;
  return firstParentCommits(ref)
    .map(commit => {
      const { parent } = commit;
      // A reached workspace package's manifest ships like its source.
      const code = [
        ...commit.files.filter(
          file =>
            !excluded?.has(file) &&
            isShipped(file, reached, paths) &&
            !(
              parent &&
              isBuildTargetUnchanged(
                file,
                entry => readAt<ProjectJson>(parent, entry),
                entry => readAt<ProjectJson>(commit.sha, entry),
              )
            ),
        ),
        ...(parent
          ? workspaceManifestChanges({
              files: commit.files,
              reached,
              before: file => readAt<Manifest>(parent, file),
              after: file => readAt<Manifest>(commit.sha, file),
            })
          : []),
      ];
      const dependencies =
        code.length === 0 &&
        commit.parent &&
        commit.files.some(isDependencyFile)
          ? dependencyChanges(commit.parent, commit.sha, scope)
          : [];
      return { commit, code, dependencies };
    })
    .filter(({ code, dependencies }) => code.length + dependencies.length > 0)
    .map(({ commit, code }) => {
      const pull = pullRequestOf(commit);
      return {
        sha: commit.sha,
        ...(pull ?? {}),
        title: cleanTitle(
          (pull && titleFromGitHub(pull.number)) ??
            pull?.title ??
            commit.subject,
        ),
        ...(code.length === 0 && { dependencies: true }),
      };
    });
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      api: { type: 'string' },
      out: { type: 'string' },
      'first-canary': { type: 'boolean' },
      channel: { type: 'string' },
      dependencies: { type: 'string' },
      'since-dependencies': { type: 'string' },
      package: { type: 'string' },
    },
  });
  const [command, ref] = positionals;
  const readApi = () =>
    values.api
      ? (JSON.parse(fs.readFileSync(values.api, 'utf8')) as NotesApi)
      : undefined;
  if (
    !['changed', 'notes', 'public-notes', 'fragment-check'].includes(
      command ?? '',
    ) ||
    (command === 'public-notes' && !values.api) ||
    (command === 'fragment-check' && !ref) ||
    (values.channel !== undefined &&
      !CHANNELS.includes(values.channel as Channel))
  ) {
    // eslint-disable-next-line no-console -- usage
    console.error(
      'usage: node scripts/release-scope.ts changed [<ref>] [--package <name>] [--channel stable|canary] | notes [<ref>] [--package <name>] [--channel stable|canary] [--api <json>] [--first-canary] [--out <file>] | public-notes [<ref>] --api <json> [--out <file>] | fragment-check <base>',
    );
    process.exit(2);
  }
  if (command === 'fragment-check') {
    const problems = fragmentProblems({
      shipped: Object.fromEntries(
        PACKAGES.map(({ name, directory }) => [
          name,
          shippedChanges(ref ?? '', packageScope(directory)),
        ]),
      ),
      ...pullRequestFragments(ref ?? ''),
    });
    for (const problem of problems) {
      // eslint-disable-next-line no-console -- the check's verdict
      console.error(`::error::${problem}`);
    }
    process.exit(problems.length > 0 ? 1 : 0);
  }
  // With --package, one package's scope: what its own build reaches and the
  // files that decide its output.
  const member = values.package
    ? PACKAGES.find(({ name }) => name === values.package)
    : undefined;
  if (values.package && !member) {
    throw new Error(`${values.package} is not a package of the SDK's family`);
  }
  // With --channel, what that channel's build reaches: a canary-only change
  // ships no stable release, and a stable release's notes leave it out.
  // Without, both builds, as the changelog check counts them.
  const channels = values.channel ? [values.channel as Channel] : undefined;
  const publicApi = command === 'public-notes' ? readApi() : undefined;
  const result = publicApi
    ? renderPublicNotes(
        publicApi,
        fragmentsOf(fragmentsSince(ref), publicApi.package),
      )
    : command === 'changed'
    ? (() => {
        // A package's declarations import the types of the family packages it
        // depends on, which its own build does not reach: a range that moved
        // to a new compatibility line since `ref` is a change it ships, or it
        // would keep the old line beside a dependant that moved.
        const files = !ref
          ? []
          : member
          ? [
              ...shippedChanges(ref, packageScope(member.directory, channels)),
              ...dependencyLineChanges(
                path.join(repositoryRoot, member.directory),
                values['since-dependencies'],
                values.dependencies,
              ),
            ]
          : shippedChanges(ref, familyScope(channels));
        const isShipping = ref === undefined || files.length > 0;
        return (
          JSON.stringify(
            {
              ...(member && { package: member.name }),
              ref: ref ?? null,
              ships: isShipping,
              files,
            },
            undefined,
            2,
          ) + '\n'
        );
      })()
    : renderNotes({
        ref,
        changes: !ref
          ? []
          : member
          ? shippedPullRequests(ref, packageScope(member.directory, channels))
          : shippedPullRequests(ref, familyScope(channels)),
        api: readApi(),
        fragments: fragmentsOf(fragmentsSince(ref), member?.name),
        firstCanary: values['first-canary'] === true,
        ...(member && { package: member.name }),
      });
  if (values.out) fs.writeFileSync(values.out, result);
  process.stdout.write(result);
}
