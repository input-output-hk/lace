#!/usr/bin/env node
// Decides whether a CI job's suite can see a pull request's change: prints
// `true` when one of the given nx projects is affected, or when a changed
// file matches one of the given globs, else `false`.
//
// Usage: node scripts/ci-affected.mjs --project <nx project>... [--infra <glob>...]
// Reads NX_BASE and NX_HEAD (set by .github/actions/install's nx-set-shas).
//
// The globs name the infrastructure that runs the suite — this workflow,
// the actions it uses — which sits outside every project root, so no nx
// input covers it: a change to the command that runs a suite would
// otherwise skip the suite and fail only after merging. What every suite
// installs from counts for each without being named: the Node version, the
// npm configuration, the root manifests, the scripts the root postinstall
// runs, and this script, which decides the rest.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

/** The root files every suite installs from, given the root manifest. */
export const installInputs = manifest => [
  '.nvmrc',
  '.npmrc',
  'package.json',
  'package-lock.json',
  'nx.json',
  'scripts/ci-affected.mjs',
  ...[...(manifest.scripts?.postinstall ?? '').matchAll(/\bnode\s+(\S+)/g)].map(
    ([, script]) => script,
  ),
];

export const isAffected = ({
  affectedProjects,
  changedFiles,
  projects,
  infra,
}) =>
  projects.some(project => affectedProjects.includes(project)) ||
  changedFiles.some(file => infra.some(glob => matchesGlob(file, glob)));

const affectedProjects = (base, head) =>
  JSON.parse(
    execFileSync(
      'npx',
      [
        'nx',
        'show',
        'projects',
        '--affected',
        '--json',
        `--base=${base}`,
        `--head=${head}`,
      ],
      { encoding: 'utf8' },
    ),
  );

const changedFiles = (base, head) =>
  execFileSync('git', ['diff', '--name-only', base, head], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: {
      project: { type: 'string', multiple: true, default: [] },
      infra: { type: 'string', multiple: true, default: [] },
    },
  });
  const { NX_BASE: base, NX_HEAD: head } = process.env;
  if (!base || !head) throw new Error('NX_BASE and NX_HEAD must be set');
  if (values.project.length === 0)
    throw new Error(
      'Usage: ci-affected.mjs --project <name>... [--infra <glob>...]',
    );
  process.stdout.write(
    String(
      isAffected({
        affectedProjects: affectedProjects(base, head),
        changedFiles: changedFiles(base, head),
        projects: values.project,
        infra: [
          ...installInputs(JSON.parse(readFileSync('package.json', 'utf8'))),
          ...values.infra,
        ],
      }),
    ),
  );
}
