// The SDK's releases, as this repository's GitHub releases record them
// (ADR 66). A published `lace-sdk@X.Y.Z` release that is not a prerelease is
// a stable release; a published `lace-sdk@X.Y.Z-canary.N` prerelease is a
// canary. A draft, a tag with no published release, or a release whose
// prerelease flag disagrees with its name is no release. These are the only
// record of which versions exist: the manifests on main name
// DEVELOPMENT_VERSION, and the release workflows compute each version from
// these releases and the API diff (scripts/next-version.ts), never from a
// registry. git still holds each release's tree, at its tag. Node's built-ins
// only, so a workflow job can read the releases before anything is installed.
//
//   node scripts/releases.mjs fetch [--out <file>]        the GitHub releases, as JSON
//   node scripts/releases.mjs check                       refuse releases and tags that disagree
//   node scripts/releases.mjs previous [--below X.Y.Z]    newest stable release (below X.Y.Z)
//   node scripts/releases.mjs latest [--except TAG]       newest release, canary or stable (other than TAG)
//   node scripts/releases.mjs highest                     the release of the highest version
//   node scripts/releases.mjs reference --channel C [--except TAG]
//                                                          the release a C release must differ from
//   node scripts/releases.mjs packages [--json]           the family's packages, in dependency order
//   node scripts/releases.mjs stamp <root> <version>      stamp the family's manifests
//   node scripts/releases.mjs stamp <root> <version> --package <name> --with <name@version>...
//                                                          stamp one package's release
//
// With `--package <name>`, `previous`, `latest` and `reference` answer for one
// package of the family: its own `<name>@X.Y.Z` releases, and the family's
// `lace-sdk@X.Y.Z` releases, which published every package at X.Y.Z. With
// `--at <commit>`, they count only the releases whose tag that commit
// contains (all tags fetched), and with `--published-by <tag>`, only those
// published no later than that release, so a check of an existing release
// reads the releases as they were when it was published. `highest` names the
// release of the highest version among them, whatever the order they were
// published in.
//
// `previous`, `latest` and `reference` print a tag, or nothing when there is none. The
// releases come from LACE_SDK_RELEASES_FILE (as `fetch` writes it) when set,
// otherwise from the GitHub API through `gh`, for GITHUB_REPOSITORY or the
// checked-out repository.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const TAG_PREFIX = 'lace-sdk@';

/**
 * The version every manifest of the SDK's family names on main. Only a
 * release stamps a real version, into the release's own copy, so nothing is
 * committed back.
 */
export const DEVELOPMENT_VERSION = '0.0.0-development';

/**
 * The packages one `lace-sdk@` release carries, in lockstep at its version:
 * the SDK and the Cardano packages (ADR 68).
 */
export const FAMILY_DIRECTORIES = [
  'apps/lace-sdk',
  'apps/lace-cardano',
  'apps/lace-cardano-ledger',
  'apps/lace-cardano-trezor',
];

/**
 * The family's packages, each released under its own tags as npm names it:
 * `@laceio/cardano@0.1.1`, `@laceio/cardano@0.1.2-canary.0`. In dependency
 * order, which the release workflows version them in: a package after the
 * packages it depends on, so its release can name their new versions.
 */
export const PACKAGES = [
  { name: '@laceio/cardano', directory: 'apps/lace-cardano' },
  { name: '@laceio/cardano-ledger', directory: 'apps/lace-cardano-ledger' },
  { name: '@laceio/cardano-trezor', directory: 'apps/lace-cardano-trezor' },
  { name: '@laceio/sdk', directory: 'apps/lace-sdk' },
];

/** The version of the SDK's first stable release. */
export const FIRST_VERSION = '0.1.0';

/** Parses a semver version, `X.Y.Z[-prerelease]`. */
export const parseVersion = text => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(text);
  if (!match) throw new Error(`Not a semver version: ${text}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
};

/** Compares versions; a prerelease sorts below its release. */
export const compareVersions = (a, b) =>
  a.major - b.major ||
  a.minor - b.minor ||
  a.patch - b.patch ||
  (a.prerelease === b.prerelease
    ? 0
    : a.prerelease === undefined
    ? 1
    : b.prerelease === undefined
    ? -1
    : a.prerelease.localeCompare(b.prerelease, 'en', { numeric: true }));

/**
 * A release tag's parts, `lace-sdk@X.Y.Z` or `lace-sdk@X.Y.Z-canary.N`, or
 * undefined for any other name.
 */
export const parseReleaseTag = tag => {
  const match = /^lace-sdk@(\d+\.\d+\.\d+)(?:-canary\.(\d+))?$/.exec(tag);
  if (!match) return undefined;
  const canary = match[2] === undefined ? undefined : Number(match[2]);
  return {
    tag,
    base: match[1],
    canary,
    version: canary === undefined ? match[1] : `${match[1]}-canary.${canary}`,
  };
};

/**
 * A package's release tag's parts, `<name>@X.Y.Z` or `<name>@X.Y.Z-canary.N`
 * for a package of the family, or undefined for any other name.
 */
export const parsePackageReleaseTag = tag => {
  const match = /^(@laceio\/[a-z-]+)@(\d+\.\d+\.\d+)(?:-canary\.(\d+))?$/.exec(
    tag,
  );
  if (!match || !PACKAGES.some(({ name }) => name === match[1])) {
    return undefined;
  }
  const canary = match[3] === undefined ? undefined : Number(match[3]);
  return {
    tag,
    package: match[1],
    base: match[2],
    canary,
    version: canary === undefined ? match[2] : `${match[2]}-canary.${canary}`,
  };
};

/**
 * A previous release as a package's summary and notes name it, as Markdown:
 * the package's own version, and the family release that published it when
 * the family released it (`@laceio/cardano@0.1.0` (released as
 * `lace-sdk@0.1.0`)). Any other tag stands as it is.
 */
export const releaseName = (tag, name) => {
  const family = name ? parseReleaseTag(tag) : undefined;
  return family
    ? `\`${name}@${family.version}\` (released as \`${tag}\`)`
    : `\`${tag}\``;
};

/** A family release tag or a package's: the tags the release records hold. */
const parseAnyReleaseTag = tag =>
  parseReleaseTag(tag) ?? parsePackageReleaseTag(tag);

/** Whether a release record's prerelease flag matches its tag's channel. */
const isLabelled = (release, isPrerelease) =>
  Boolean(isPrerelease) === (release.canary !== undefined);

/**
 * The SDK's releases among GitHub's release records, oldest first: each
 * published (not draft) `lace-sdk@` release. A canary is a prerelease and a
 * stable release is not; a published record whose flag disagrees with its
 * tag is refused rather than left out, since a record anyone with write
 * access can edit would otherwise steer the version (releaseRecordProblems).
 */
export const releasesOf = records => {
  const mislabelled = records.filter(({ tagName, isDraft, isPrerelease }) => {
    const release = parseReleaseTag(tagName);
    return release && !isDraft && !isLabelled(release, isPrerelease);
  });
  if (mislabelled.length > 0) {
    throw new Error(
      `release records disagree with their tags: ${mislabelled
        .map(
          ({ tagName, isPrerelease }) =>
            `${tagName} is ${isPrerelease ? '' : 'not '}a prerelease`,
        )
        .join('; ')}`,
    );
  }
  return records
    .filter(({ isDraft }) => !isDraft)
    .map(({ tagName, publishedAt }) => {
      const release = parseReleaseTag(tagName);
      return release
        ? { ...release, publishedAt: publishedAt ?? '' }
        : undefined;
    })
    .filter(Boolean)
    .sort((a, b) =>
      compareVersions(parseVersion(a.version), parseVersion(b.version)),
    );
};

/**
 * One package's releases among GitHub's release records, oldest first: its
 * own published `<name>@` releases and the family's `lace-sdk@` releases,
 * each of which published every package at its version. A version both
 * name is the package's own. Refuses mislabelled records as releasesOf does.
 */
export const packageReleasesOf = (records, name) => {
  if (!PACKAGES.some(member => member.name === name)) {
    throw new Error(`${name} is not a package of the SDK's family`);
  }
  const family = releasesOf(records);
  const own = records
    .filter(({ isDraft }) => !isDraft)
    .map(record => ({
      record,
      release: parsePackageReleaseTag(record.tagName),
    }))
    .filter(({ release }) => release?.package === name);
  const mislabelled = own.filter(
    ({ record, release }) => !isLabelled(release, record.isPrerelease),
  );
  if (mislabelled.length > 0) {
    throw new Error(
      `release records disagree with their tags: ${mislabelled
        .map(
          ({ record }) =>
            `${record.tagName} is ${
              record.isPrerelease ? '' : 'not '
            }a prerelease`,
        )
        .join('; ')}`,
    );
  }
  const releases = new Map(
    family.map(release => [release.version, { ...release, package: name }]),
  );
  for (const { record, release } of own) {
    releases.set(release.version, {
      ...release,
      publishedAt: record.publishedAt ?? '',
    });
  }
  return [...releases.values()].sort((a, b) =>
    compareVersions(parseVersion(a.version), parseVersion(b.version)),
  );
};

/**
 * Where the release records and the protected tags disagree: a `lace-sdk@`
 * tag without a published release whose prerelease flag matches its name (a
 * bare tag, a draft, a release flipped to or from prerelease, or one
 * deleted), and a published release without its tag. Only the tags are
 * protected (a ruleset); the records can be edited by anyone with write
 * access, so a release workflow refuses to version against them until they
 * agree, rather than leave a release out and number the next one past it.
 */
export const releaseRecordProblems = (records, tagNames) => {
  const tags = new Set(tagNames.filter(name => parseAnyReleaseTag(name)));
  const published = new Map(
    records
      .filter(({ isDraft, tagName }) => !isDraft && parseAnyReleaseTag(tagName))
      .map(record => [record.tagName, record]),
  );
  const problems = [];
  for (const tag of [...tags].sort()) {
    const record = published.get(tag);
    if (!record) {
      problems.push(
        `${tag} is tagged but has no published release: publish its release, or, if it never published, delete the tag (gh api -X DELETE /repos/<repository>/git/refs/tags/${tag}; docs/publish-public.md, Resuming a partial SDK release)`,
      );
    } else if (!isLabelled(parseAnyReleaseTag(tag), record.isPrerelease)) {
      problems.push(
        `${tag}'s release is ${
          record.isPrerelease ? '' : 'not '
        }marked as a prerelease, against its tag: restore the flag (a canary is a prerelease, a stable release is not)`,
      );
    }
  }
  for (const tag of [...published.keys()].sort()) {
    if (!tags.has(tag)) {
      problems.push(
        `${tag} has a published release but no tag: restore the tag, or delete the release`,
      );
    }
  }
  return problems;
};

/**
 * The newest stable release, or undefined before the first. With `below`, the
 * newest whose version is below it: the release a given version follows.
 */
export const previousStable = (releases, { below } = {}) =>
  releases
    .filter(({ canary }) => canary === undefined)
    .filter(
      ({ version }) =>
        below === undefined ||
        compareVersions(parseVersion(version), parseVersion(below)) < 0,
    )
    .at(-1);

/**
 * The release published last, canary or stable, or undefined before the
 * first: what a canary must contain. By publication, not version: a
 * stable release can ship below a canary's version (the stable release that
 * canary previewed past), and is then the newer of the two. Releases with the
 * same time, or none recorded, fall back to version order.
 */
export const latestRelease = releases =>
  [...releases]
    .map((release, order) => ({ release, order }))
    .sort(
      (a, b) =>
        (a.release.publishedAt ?? '').localeCompare(
          b.release.publishedAt ?? '',
        ) || a.order - b.order,
    )
    .at(-1)?.release;

/**
 * The release a new release of `channel` is compared with to find whether
 * anything it ships changed: the latest of its own channel, by publication,
 * since a release must never repeat the previous release of its channel. A
 * stable release is held to the latest stable release and a canary to the
 * latest canary, whatever the other channel released since. Undefined while
 * the channel has no release: nothing could be identical, so it ships.
 */
export const changeReference = (releases, channel) =>
  channel === 'canary'
    ? latestRelease(releases.filter(({ canary }) => canary !== undefined))
    : previousStable(releases);

/**
 * The highest stable version a canary since the latest stable release
 * previews: the floor a canary's version never goes below until the next
 * stable release, so the `canary` dist-tag only moves forward. Undefined when
 * no canary previews a version above the latest stable.
 */
export const canaryBaseFloor = releases => {
  const stable = previousStable(releases);
  return releases
    .filter(
      ({ canary, base }) =>
        canary !== undefined &&
        (stable === undefined ||
          compareVersions(parseVersion(base), parseVersion(stable.version)) >
            0),
    )
    .map(({ base }) => base)
    .sort((a, b) => compareVersions(parseVersion(a), parseVersion(b)))
    .at(-1);
};

/** The number the next canary of `base` takes: one past its highest, from 0. */
export const nextCanaryNumber = (releases, base) =>
  Math.max(
    -1,
    ...releases
      .filter(release => release.base === base && release.canary !== undefined)
      .map(({ canary }) => canary),
  ) + 1;

/**
 * The version after `previous` for a change of kind `bump` (ADR 66,
 * "Versioning before and after 1.0"): before 1.0 a breaking change takes the
 * next minor and anything else the next patch; from 1.0 a breaking change
 * takes the next major, a feature the next minor and anything else the next
 * patch. Without a previous release, the first version.
 */
export const bumpVersion = (previous, bump) => {
  if (previous === undefined) return FIRST_VERSION;
  const { major, minor, patch } = parseVersion(previous);
  if (major === 0) {
    return bump === 'breaking' ? `0.${minor + 1}.0` : `0.${minor}.${patch + 1}`;
  }
  if (bump === 'breaking') return `${major + 1}.0.0`;
  if (bump === 'feature') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

/**
 * The major version `apps/lace-sdk/release.json` asks for: `{ "major": N }`,
 * a reviewed change that promotes the family to N.0.0 (the 1.0 decision, ADR
 * 66), or 0 when the file is absent.
 */
export const readReleaseConfig = packageDirectory => {
  const file = path.join(packageDirectory, 'release.json');
  if (!fs.existsSync(file)) return { major: 0 };
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Number.isInteger(config.major) || config.major < 0) {
    throw new Error(
      `${file}: major must be a whole number, not ${config.major}`,
    );
  }
  return { major: config.major };
};

/**
 * The promoted version `major` asks for, when it is above the previous stable
 * release's major (or, before the first release, above 0): `<major>.0.0`.
 * Otherwise undefined, and the API diff decides; later majors follow from it.
 */
export const promotedVersion = (previous, major) => {
  const current = previous === undefined ? 0 : parseVersion(previous).major;
  return major > current ? `${major}.0.0` : undefined;
};

/**
 * Stamps a release's `version` into the family's manifests under `root` (the
 * release's snapshot): each package's version, and each dependency of one on
 * another, which main pins to the development version so the workspace links
 * it. Refuses a manifest that does not name the development version, so a
 * version committed by hand never publishes. Returns `name@version` of each.
 */
export const stampVersion = (root, version) => {
  parseVersion(version);
  const manifests = FAMILY_DIRECTORIES.map(directory => {
    const file = path.join(root, directory, 'package.json');
    return { file, manifest: JSON.parse(fs.readFileSync(file, 'utf8')) };
  });
  const names = new Set(manifests.map(({ manifest }) => manifest.name));
  return manifests.map(({ file, manifest }) => {
    if (manifest.version !== DEVELOPMENT_VERSION) {
      throw new Error(
        `${manifest.name} is at ${manifest.version}, not ${DEVELOPMENT_VERSION}: a release computes its version, so the manifest names none`,
      );
    }
    manifest.version = version;
    for (const field of ['dependencies', 'peerDependencies']) {
      for (const [name, range] of Object.entries(manifest[field] ?? {})) {
        if (!names.has(name)) continue;
        if (range !== DEVELOPMENT_VERSION) {
          throw new Error(
            `${manifest.name} pins ${name} ${range}, not ${DEVELOPMENT_VERSION}: the release pins the family to its own version`,
          );
        }
        manifest[field][name] = version;
      }
    }
    fs.writeFileSync(file, JSON.stringify(manifest, undefined, 2) + '\n');
    return `${manifest.name}@${version}`;
  });
};

/**
 * The range one package of the family gives another it depends on: within
 * `version`'s compatibility line (`^X.Y.Z`) for a stable release, or exactly
 * `version` when the depending package's release is a canary, which previews
 * against the very builds it was released with.
 */
export const familyRange = (version, isCanary) =>
  isCanary ? version : `^${version}`;

/**
 * Stamps one package's release into the family's manifests under `root` (the
 * release's snapshot): the package `name` at `version`, every other package at the
 * version `others` gives it (its latest release the release commit contains),
 * and each dependency of one on another as familyRange gives it. Refuses a
 * manifest that does not name the development version, as stampVersion does.
 * Returns `name@version` of each.
 */
export const stampPackage = (root, { name, version, others }) => {
  parseVersion(version);
  const isCanary = version.includes('-canary.');
  const versionOf = new Map([...Object.entries(others), [name, version]]);
  const manifests = FAMILY_DIRECTORIES.map(directory => {
    const file = path.join(root, directory, 'package.json');
    return { file, manifest: JSON.parse(fs.readFileSync(file, 'utf8')) };
  });
  for (const { manifest } of manifests) {
    if (!versionOf.has(manifest.name)) {
      throw new Error(
        `${name}'s release names no version of ${manifest.name}: each package of the family needs its latest release`,
      );
    }
    parseVersion(versionOf.get(manifest.name));
  }
  return manifests.map(({ file, manifest }) => {
    if (manifest.version !== DEVELOPMENT_VERSION) {
      throw new Error(
        `${manifest.name} is at ${manifest.version}, not ${DEVELOPMENT_VERSION}: a release computes its version, so the manifest names none`,
      );
    }
    manifest.version = versionOf.get(manifest.name);
    for (const field of ['dependencies', 'peerDependencies']) {
      for (const [dependency, range] of Object.entries(manifest[field] ?? {})) {
        if (!versionOf.has(dependency)) continue;
        if (range !== DEVELOPMENT_VERSION) {
          throw new Error(
            `${manifest.name} pins ${dependency} ${range}, not ${DEVELOPMENT_VERSION}: the release decides the range`,
          );
        }
        manifest[field][dependency] = familyRange(
          versionOf.get(dependency),
          isCanary,
        );
      }
    }
    fs.writeFileSync(file, JSON.stringify(manifest, undefined, 2) + '\n');
    return `${manifest.name}@${manifest.version}`;
  });
};

/** Whether `commit` contains the commit `tag` names. */
const contains = (commit, tag) => {
  try {
    execFileSync(
      'git',
      ['merge-base', '--is-ancestor', `refs/tags/${tag}`, commit],
      { stdio: 'ignore' },
    );
    return true;
  } catch {
    return false;
  }
};

const repository = () =>
  process.env.GITHUB_REPOSITORY ||
  execFileSync(
    'gh',
    ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'],
    {
      encoding: 'utf8',
    },
  ).trim();

/** This repository's GitHub release records of the SDK, from the API. */
export const fetchReleaseRecords = () =>
  execFileSync(
    'gh',
    [
      'api',
      '--paginate',
      `/repos/${repository()}/releases?per_page=100`,
      '--jq',
      '.[] | select(.tag_name | startswith("lace-sdk@") or startswith("@laceio/")) | {tagName: .tag_name, isDraft: .draft, isPrerelease: .prerelease, publishedAt: (.published_at // "")}',
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));

/** The SDK's releases: from LACE_SDK_RELEASES_FILE, or from the API. */
/**
 * This repository's release tags, the family's `lace-sdk@` and the packages'
 * `@laceio/`, from git (all tags fetched).
 */
export const gitTagNames = () =>
  execFileSync('git', ['tag', '--list', `${TAG_PREFIX}*`, '@laceio/*'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);

/**
 * The SDK's releases: from LACE_SDK_RELEASES_FILE, or from the API, once
 * they agree with the tags (releaseRecordProblems); otherwise it throws.
 */
export const loadReleases = () => {
  const records = process.env.LACE_SDK_RELEASES_FILE
    ? JSON.parse(fs.readFileSync(process.env.LACE_SDK_RELEASES_FILE, 'utf8'))
    : fetchReleaseRecords();
  const problems = releaseRecordProblems(records, gitTagNames());
  if (problems.length > 0) {
    throw new Error(
      `the lace-sdk@ releases and tags disagree, so no version is computed:\n- ${problems.join(
        '\n- ',
      )}`,
    );
  }
  return releasesOf(records);
};

/** One package's releases (packageReleasesOf), checked as loadReleases checks them. */
export const loadPackageReleases = name => {
  const records = process.env.LACE_SDK_RELEASES_FILE
    ? JSON.parse(fs.readFileSync(process.env.LACE_SDK_RELEASES_FILE, 'utf8'))
    : fetchReleaseRecords();
  const problems = releaseRecordProblems(records, gitTagNames());
  if (problems.length > 0) {
    throw new Error(
      `the SDK family's releases and tags disagree, so no version is computed:\n- ${problems.join(
        '\n- ',
      )}`,
    );
  }
  return packageReleasesOf(records, name);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      below: { type: 'string' },
      channel: { type: 'string' },
      except: { type: 'string' },
      out: { type: 'string' },
      package: { type: 'string' },
      at: { type: 'string' },
      'published-by': { type: 'string' },
      with: { type: 'string', multiple: true },
      json: { type: 'boolean' },
    },
  });
  const [command] = positionals;
  // When the release `--published-by` names was published; it must exist.
  const publishedBy = () => {
    const tag = values['published-by'];
    if (!tag) return undefined;
    const records = process.env.LACE_SDK_RELEASES_FILE
      ? JSON.parse(fs.readFileSync(process.env.LACE_SDK_RELEASES_FILE, 'utf8'))
      : fetchReleaseRecords();
    const record = records.find(
      ({ tagName, isDraft }) => tagName === tag && !isDraft,
    );
    if (!record?.publishedAt) {
      throw new Error(`${tag} has no published release to count from`);
    }
    return record.publishedAt;
  };
  const releases = () => {
    const until = publishedBy();
    return (
      values.package ? loadPackageReleases(values.package) : loadReleases()
    )
      .filter(release => !values.at || contains(values.at, release.tag))
      .filter(
        release => until === undefined || (release.publishedAt ?? '') <= until,
      );
  };
  const commands = {
    fetch: () => {
      const json = JSON.stringify(fetchReleaseRecords());
      if (values.out) fs.writeFileSync(values.out, json + '\n');
      return json;
    },
    check: () => {
      const records = process.env.LACE_SDK_RELEASES_FILE
        ? JSON.parse(
            fs.readFileSync(process.env.LACE_SDK_RELEASES_FILE, 'utf8'),
          )
        : fetchReleaseRecords();
      const problems = releaseRecordProblems(records, gitTagNames());
      if (problems.length === 0) return 'the lace-sdk@ releases and tags agree';
      // eslint-disable-next-line no-console -- workflow annotations
      for (const problem of problems) console.log(`::error::${problem}`);
      process.exit(1);
    },
    previous: () => previousStable(releases(), { below: values.below })?.tag,
    // Releases are listed in version order.
    highest: () => releases().at(-1)?.tag,
    latest: () =>
      latestRelease(releases().filter(release => release.tag !== values.except))
        ?.tag,
    reference: () => {
      if (values.channel !== 'stable' && values.channel !== 'canary') {
        throw new Error('reference needs --channel stable or --channel canary');
      }
      return changeReference(
        releases().filter(release => release.tag !== values.except),
        values.channel,
      )?.tag;
    },
    packages: () => {
      const names = PACKAGES.map(({ name }) => name);
      return values.json ? JSON.stringify(names) : names.join(' ');
    },
    stamp: () =>
      (values.package
        ? stampPackage(positionals[1], {
            name: values.package,
            version: positionals[2],
            others: Object.fromEntries(
              (values.with ?? []).map(spec => {
                const at = spec.lastIndexOf('@');
                return [spec.slice(0, at), spec.slice(at + 1)];
              }),
            ),
          })
        : stampVersion(positionals[1], positionals[2])
      ).join('\n'),
  };
  if (!Object.hasOwn(commands, command ?? '')) {
    // eslint-disable-next-line no-console -- usage
    console.error(
      'usage: node scripts/releases.mjs fetch [--out <file>] | check | packages [--json] | previous [--below X.Y.Z] | latest [--except TAG] | highest | reference --channel stable|canary [--except TAG] | stamp <root> <version> [--package <name> --with <name@version>...]; previous, latest, highest and reference take --package <name>, --at <commit> and --published-by <tag>',
    );
    process.exit(2);
  }
  // eslint-disable-next-line no-console -- the command's result
  console.log(commands[command]() ?? '');
}
