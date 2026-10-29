import { execFile } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// Runs ci.yml's own step scripts as the runner does (bash -eo pipefail),
// with the commands they call stubbed on PATH, so a decision the workflow
// makes in shell is held to its behaviour rather than to its text.
const workflow = parse(
  await readFile(
    fileURLToPath(new URL('../../.github/workflows/ci.yml', import.meta.url)),
    'utf8',
  ),
);

const stepScript = (job, id) => {
  const step = workflow.jobs[job].steps.find(candidate => candidate.id === id);
  if (!step) throw new Error(`no step ${id} in ${job}`);
  return step.run.replaceAll('${{ github.event_name }}', 'pull_request');
};

// Each case gets its own runner directory: RUNNER_TEMP, the step's
// GITHUB_OUTPUT and the stubs on PATH.
const inRunner = async test => {
  const directory = await mkdtemp(join(tmpdir(), 'ci-workflow-'));
  try {
    await mkdir(join(directory, 'bin'));
    return await test(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

const stub = (directory, name, body) =>
  writeFile(
    join(directory, 'bin', name),
    `#!/usr/bin/env bash\n${body}\n`,
  ).then(() => chmod(join(directory, 'bin', name), 0o755));

const runStep = async (directory, script, environment = {}) => {
  const output = join(directory, 'output');
  await writeFile(output, '');
  const code = await new Promise(resolve => {
    execFile(
      'bash',
      ['--noprofile', '--norc', '-eo', 'pipefail', '-c', script],
      {
        cwd: directory,
        env: {
          PATH: `${join(directory, 'bin')}:${process.env.PATH}`,
          GITHUB_OUTPUT: output,
          RUNNER_TEMP: directory,
          EVENT: 'pull_request',
          ...environment,
        },
      },
      error => resolve(error ? error.code : 0),
    );
  });
  return { code, output: await readFile(output, 'utf8') };
};

const GATES = [
  ['build', 'extension-affected'],
  ['build-lace-mobile-storybook', 'affected'],
  ['lace-next-build-and-e2e', 'affected'],
];

describe('the affected gates', () => {
  it.each(GATES)('%s fails when the helper fails', (job, id) =>
    inRunner(async directory => {
      await stub(directory, 'node', 'exit 37');
      const { code, output } = await runStep(directory, stepScript(job, id));
      expect(code).not.toBe(0);
      expect(output).not.toMatch(/=false/);
    }),
  );

  it.each(GATES)('%s skips when the helper finds it unaffected', (job, id) =>
    inRunner(async directory => {
      await stub(directory, 'node', 'printf false');
      const { code, output } = await runStep(directory, stepScript(job, id));
      expect(code).toBe(0);
      expect(output).toMatch(/^run=false$/m);
    }),
  );
});

describe('reusing a draft run when a pull request is marked ready', () => {
  const script = stepScript('changes', 'ready');
  const HEAD = 'a'.repeat(40);
  const run = (id, conclusion, base) => ({
    id,
    conclusion,
    // The base the API reports follows the branch, whatever the run tested.
    pull_requests: [{ number: 7, base: { sha: base } }],
  });

  const ready = ({ runs, tested }) =>
    inRunner(async directory => {
      await mkdir(join(directory, 'ci-tested'));
      await writeFile(join(directory, 'ci-tested', 'base'), 'base-now\n');
      await writeFile(
        join(directory, 'runs.json'),
        JSON.stringify({ workflow_runs: runs }),
      );
      await stub(
        directory,
        'gh',
        [
          'if [[ "$1" == api ]]; then cat "$RUNNER_TEMP/runs.json"; exit 0; fi',
          // gh run download <id> --repo r --name n --dir d
          'id=$3; dir=$9',
          'tested=$(jq -r --arg id "$id" \'.[$id] // empty\' "$RUNNER_TEMP/tested.json")',
          '[[ -n "$tested" ]] || exit 1',
          'mkdir -p "$dir" && printf "%s\\n" "$tested" > "$dir/base"',
        ].join('\n'),
      );
      await writeFile(join(directory, 'tested.json'), JSON.stringify(tested));
      const { code, output } = await runStep(directory, script, {
        HEAD,
        PULL: '7',
        GITHUB_RUN_ID: '100',
        GITHUB_REPOSITORY: 'org/repo',
      });
      expect(code).toBe(0);
      return output.trim();
    });

  it('reuses the latest run when it passed against the base this run tests', async () => {
    expect(
      await ready({
        runs: [run(99, 'success', 'base-now')],
        tested: { 99: 'base-now' },
      }),
    ).toBe('ready_only=true');
  });

  it('runs everything when the run tested an older base the API now reports as current', async () => {
    expect(
      await ready({
        runs: [run(99, 'success', 'base-now')],
        tested: { 99: 'base-before' },
      }),
    ).toBe('ready_only=false');
  });

  it('runs everything when the run recorded no base', async () => {
    expect(
      await ready({ runs: [run(99, 'success', 'base-now')], tested: {} }),
    ).toBe('ready_only=false');
  });

  it('runs everything when the latest run failed, whatever passed before it', async () => {
    expect(
      await ready({
        runs: [run(99, 'failure', 'base-now'), run(98, 'success', 'base-now')],
        tested: { 99: 'base-now', 98: 'base-now' },
      }),
    ).toBe('ready_only=false');
  });

  it('runs everything when no other run tested this head', async () => {
    expect(
      await ready({ runs: [run(100, 'success', 'base-now')], tested: {} }),
    ).toBe('ready_only=false');
  });
});
