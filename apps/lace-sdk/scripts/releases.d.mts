/** Types for releases.mjs, for its TypeScript callers. */
export interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/** A GitHub release record, as `releases.mjs fetch` writes it. */
export interface ReleaseRecord {
  tagName: string;
  isDraft: boolean;
  isPrerelease: boolean;
  /** ISO 8601, as the API gives it; empty for a draft. */
  publishedAt?: string;
}

export interface ReleaseTag {
  tag: string;
  /** The stable version the release is or previews, `X.Y.Z`. */
  base: string;
  /** The canary number, or undefined for a stable release. */
  canary: number | undefined;
  version: string;
  publishedAt?: string;
}

/** A package's release: a ReleaseTag naming the package it is a release of. */
export interface PackageReleaseTag extends ReleaseTag {
  package: string;
}

export type Bump = 'breaking' | 'feature' | 'patch';

export const TAG_PREFIX: string;
export const DEVELOPMENT_VERSION: string;
export const FIRST_VERSION: string;
export const FAMILY_DIRECTORIES: readonly string[];
export const PACKAGES: readonly { name: string; directory: string }[];
export const releaseName: (tag: string, name?: string) => string;
export const parsePackageReleaseTag: (
  tag: string,
) => PackageReleaseTag | undefined;
export const packageReleasesOf: (
  records: readonly ReleaseRecord[],
  name: string,
) => PackageReleaseTag[];
export const loadPackageReleases: (name: string) => PackageReleaseTag[];
export const stampVersion: (root: string, version: string) => string[];
export const familyRange: (version: string, isCanary: boolean) => string;
export const stampPackage: (
  root: string,
  release: { name: string; version: string; others: Record<string, string> },
) => string[];
export const parseVersion: (text: string) => Version;
export const compareVersions: (a: Version, b: Version) => number;
export const parseReleaseTag: (tag: string) => ReleaseTag | undefined;
export const releasesOf: (records: readonly ReleaseRecord[]) => ReleaseTag[];
export const releaseRecordProblems: (
  records: readonly ReleaseRecord[],
  tagNames: readonly string[],
) => string[];
export const gitTagNames: () => string[];
export const previousStable: (
  releases: readonly ReleaseTag[],
  options?: { below?: string },
) => ReleaseTag | undefined;
export const latestRelease: (
  releases: readonly ReleaseTag[],
) => ReleaseTag | undefined;
export const changeReference: (
  releases: readonly ReleaseTag[],
  channel: 'canary' | 'stable',
) => ReleaseTag | undefined;
export const canaryBaseFloor: (
  releases: readonly ReleaseTag[],
) => string | undefined;
export const nextCanaryNumber: (
  releases: readonly ReleaseTag[],
  base: string,
) => number;
export const bumpVersion: (previous: string | undefined, bump: Bump) => string;
export const readReleaseConfig: (packageDirectory: string) => {
  major: number;
};
export const promotedVersion: (
  previous: string | undefined,
  major: number,
) => string | undefined;
export const fetchReleaseRecords: () => ReleaseRecord[];
export const loadReleases: () => ReleaseTag[];
