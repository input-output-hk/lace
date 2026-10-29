#!/usr/bin/env node
// Prints the comma-separated nx projects that CI shard <index> of <count> owns,
// for the given targets. Every project with any of the targets lands in exactly
// one shard, so the shards together run the same task set as one unsharded
// `nx run-many` / `nx affected` would.
//
// Usage: node scripts/ci-shard-projects.mjs <index 1..count> <count> <target>...
// AFFECTED=true restricts to `nx show projects --affected` (NX_BASE/NX_HEAD).
//
// Round-robin over the sorted list rather than weighting by size: the 343
// type-check tasks are uniformly small (none over ~4 min), so position alone
// balances them, and a stable sort keeps each shard's assignment reproducible.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const shardProjects = (projects, index, count) => {
  if (!Number.isInteger(count) || count < 1)
    throw new Error(`Shard count must be a positive integer, got ${count}`);
  if (!Number.isInteger(index) || index < 1 || index > count)
    throw new Error(`Shard index must be in 1..${count}, got ${index}`);
  return [...new Set(projects)]
    .sort()
    .filter((_, position) => position % count === index - 1);
};

const listProjects = (target, affected) =>
  JSON.parse(
    execFileSync(
      'npx',
      [
        'nx',
        'show',
        'projects',
        '--json',
        `--withTarget=${target}`,
        ...(affected ? ['--affected'] : []),
      ],
      { encoding: 'utf8' },
    ),
  );

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [index, count, ...targets] = process.argv.slice(2);
  if (targets.length === 0)
    throw new Error('Usage: ci-shard-projects.mjs <index> <count> <target>...');
  const affected = process.env.AFFECTED === 'true';
  const projects = targets.flatMap(target => listProjects(target, affected));
  process.stdout.write(
    shardProjects(projects, Number(index), Number(count)).join(','),
  );
}
