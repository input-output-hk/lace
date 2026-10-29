/**
 * The public repository's last check of a release before it publishes
 * (publish-release.yml), against what npm already has (ADR 66). The release's
 * version was decided in lace-platform from its tags and the API diff with the
 * previous release's build (scripts/next-version.ts); this holds the
 * published package to the same rules against the registry it publishes to.
 * The package.json must name the tag's version, which the release stamps into
 * its snapshot. A canary must preview a version above the latest stable and
 * sort above every version already published; a stable release is compared
 * with the latest stable's declarations on npm, and fails when it breaks an
 * export without the version bump and the prior `@deprecated` the rules
 * require. A version npm already has, of either channel, must be this build
 * packed as the release packs it (scripts/pack.mjs), file for file: the
 * publish skips each registry that has the version, so a different build
 * would leave npm and GitHub Packages serving different contents under one
 * version. The SDK released on its own (`@laceio/sdk@X.Y.Z[-canary.N]`) is
 * held to the same rules, and each pin on another package of the family
 * must be the range its release gives (scripts/releases.mjs familyRange) on
 * a version npm already has: the SDK releases after the packages it depends
 * on. Run after the build of the channel the tag names:
 *
 * ```bash
 * RELEASE_TAG=lace-sdk@0.2.0 node scripts/check-release.ts
 * RELEASE_TAG=@laceio/sdk@0.2.0 node scripts/check-release.ts
 * ```
 *
 * PREVIOUS_PACKAGE_DIR (an unpacked package) and PREVIOUS_VERSION replace the
 * npm lookup, for a dry run against a local copy.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { packSdk } from './pack.mjs';
import {
  canaryReleaseProblems,
  declarationsIn,
  latestCanarySinceOf,
  latestStableOf,
  readExports,
  readOverrides,
  republishProblems,
  stableReleaseProblems,
} from './release-compat.ts';
import { familyRange, PACKAGES } from './releases.mjs';

const packageDirectory = path.resolve(import.meta.dirname, '..');
const NAME = '@laceio/sdk';
const NPM_REGISTRY = ['--@laceio:registry=https://registry.npmjs.org'];

const tag = process.env.RELEASE_TAG ?? '';
const tagMatch =
  /^(lace-sdk|@laceio\/sdk)@(\d+\.\d+\.\d+)(-canary\.\d+)?$/.exec(tag);
if (!tagMatch) {
  throw new Error(
    `RELEASE_TAG must be lace-sdk@X.Y.Z[-canary.N] or @laceio/sdk@X.Y.Z[-canary.N], not ${tag}`,
  );
}
/** Whether the SDK releases on its own, rather than with the family. */
const isPackageRelease = tagMatch[1] === NAME;
const base = tagMatch[2];
const version = base + (tagMatch[3] ?? '');
const isCanary = tagMatch[3] !== undefined;

// The release stamps its version into the snapshot's package.json, so the
// tag must name exactly that version; the development version main carries
// never publishes. Checking here stops a mismatched tag before its release
// goes public.
const manifestOf = (directory: string) =>
  JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
  };
const manifest = manifestOf(packageDirectory);
const packageVersion = manifest.version;
const isTagForPackageVersion = packageVersion === version;

const npm = (args: string[], cwd?: string): string =>
  execFileSync('npm', [...args, ...NPM_REGISTRY], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

/**
 * Every version of `name` on npm, prereleases included, or none before the
 * first release. Read from the version list rather than the dist-tags, which
 * a prerelease can hold.
 */
const versionsOf = (name: string): string[] => {
  try {
    const versions = JSON.parse(npm(['view', name, 'versions', '--json'])) as
      | string[]
      | string;
    return Array.isArray(versions) ? versions : [versions];
  } catch (error) {
    if (String((error as { stderr?: string }).stderr).includes('E404')) {
      return [];
    }
    throw error;
  }
};

const publishedVersions = (): string[] =>
  process.env.PREVIOUS_VERSION
    ? [process.env.PREVIOUS_VERSION]
    : versionsOf(NAME);

const published = publishedVersions();
/** The highest stable version on npm, or undefined before the first release. */
const latestStable = (): string | undefined => latestStableOf(published);

const temporary = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), 'lace-sdk-release-'));

const unpackedPackage = (previousVersion: string): string => {
  if (process.env.PREVIOUS_PACKAGE_DIR) return process.env.PREVIOUS_PACKAGE_DIR;
  const directory = temporary();
  const tarball = npm(
    ['pack', `${NAME}@${previousVersion}`, '--pack-destination', directory],
    directory,
  )
    .split('\n')
    .at(-1);
  execFileSync('tar', [
    '-xzf',
    path.join(directory, tarball ?? ''),
    '-C',
    directory,
  ]);
  return path.join(directory, 'package');
};

/** This build, packed as the release publishes it; returns its package/. */
const unpackedBuild = (): string => {
  const directory = temporary();
  const { path: tarball } = packSdk({ out: directory });
  execFileSync('tar', ['-xzf', tarball, '-C', directory]);
  return path.join(directory, 'package');
};

/** Whether npm already has this version: a re-run completing its publish. */
const isPublished = published.includes(version);

/**
 * The SDK released on its own pins each package of the family it depends on
 * at the range its release gives that package's stamped version, which npm
 * must already have.
 */
const familyPinProblems = (): string[] =>
  Object.entries(manifest.dependencies ?? {}).flatMap(([dependency, pin]) => {
    const member = PACKAGES.find(({ name }) => name === dependency);
    if (!member) return [];
    const dependencyVersion = manifestOf(
      path.resolve(packageDirectory, '../..', member.directory),
    ).version;
    const range = familyRange(dependencyVersion, isCanary);
    if (pin !== range) {
      return [
        `${NAME} pins ${dependency} ${pin}, but its release gives ${dependency}@${dependencyVersion} the range ${range}`,
      ];
    }
    return versionsOf(dependency).includes(dependencyVersion)
      ? []
      : [
          `${NAME} depends on ${dependency}@${dependencyVersion}, which npm does not have: release ${dependency} first`,
        ];
  });

const releaseProblems = (latest: string | undefined): string[] => {
  if (!isTagForPackageVersion) {
    return [
      `${tag} does not match apps/lace-sdk/package.json version ${packageVersion}: the release stamps its version into the snapshot (sdk-release.yml prepare), so a package.json that names another version is not this release's`,
    ];
  }
  if (isPackageRelease) {
    const pins = familyPinProblems();
    if (pins.length > 0) return pins;
  }
  // Compared with the rules when it first ran; now it must be the same files.
  if (isPublished) {
    return republishProblems({
      name: NAME,
      version,
      published: unpackedPackage(version),
      built: unpackedBuild(),
    });
  }
  if (isCanary) {
    return canaryReleaseProblems({
      latestStable: latest,
      latestCanary: latestCanarySinceOf(published),
      canaryVersion: version,
    });
  }
  if (latest === undefined) return [];
  return stableReleaseProblems({
    previousVersion: latest,
    nextVersion: version,
    previous: readExports(declarationsIn(unpackedPackage(latest))),
    next: readExports(declarationsIn(packageDirectory)),
    overrides: readOverrides(packageDirectory),
  });
};

const latest = latestStable();
const problems = releaseProblems(latest);

if (problems.length > 0) {
  // eslint-disable-next-line no-console -- the release gate's verdict
  console.error(`${tag} cannot be released:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
// eslint-disable-next-line no-console -- the release gate's verdict
console.log(
  `${tag} meets the versioning rules${
    isPublished
      ? ' (already published, and this build is the same: completing its publish)'
      : latest
      ? ` against the latest stable ${latest}`
      : ' (first stable release)'
  }`,
);
