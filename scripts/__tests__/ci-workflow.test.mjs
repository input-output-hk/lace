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
const vendorWorkflow = parse(
  await readFile(
    fileURLToPath(
      new URL('../../.github/workflows/vendor-check.yml', import.meta.url),
    ),
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

describe('workspace builds', () => {
  it.each([
    {
      event: 'pull_request',
      base: 'release/2.5.x',
      diffStatus: 0,
      deferred: true,
    },
    {
      event: 'pull_request',
      base: 'release/2.5.x',
      diffStatus: 1,
      deferred: false,
    },
    { event: 'pull_request', base: 'main', diffStatus: 0, deferred: false },
    {
      event: 'workflow_dispatch',
      base: 'release/2.5.x',
      diffStatus: 0,
      deferred: false,
    },
  ])(
    'scopes the SDK migration exception to unchanged release PRs: $event / $base / $diffStatus',
    ({ event, base, diffStatus, deferred }) =>
      inRunner(async directory => {
        await stub(directory, 'git', 'exit "${GIT_DIFF_STATUS:-0}"');
        await stub(
          directory,
          'npx',
          'printf "%s\\n" "$*" >> "$RUNNER_TEMP/commands"',
        );
        const { code } = await runStep(
          directory,
          stepScript('build', 'build-workspace'),
          {
            GITHUB_EVENT_NAME: event,
            GITHUB_BASE_REF: base,
            RELEASE_BASE_SHA: 'release-base',
            GIT_DIFF_STATUS: String(diffStatus),
          },
        );
        expect(code).toBe(0);
        const commands = await readFile(join(directory, 'commands'), 'utf8');
        expect(commands).toContain(
          `nx run-many --target=build --exclude=lace-sdk-site${
            deferred ? ',lace-sdk,lace-sdk-example-passport' : ''
          }`,
        );
        expect(commands).toContain(
          'tsx apps/lace-extension/scripts/verify-build-output.ts',
        );
      }),
  );
});

describe('the release vendor audit', () => {
  const steps = vendorWorkflow.jobs['verify-vendor-bundle'].steps;
  const audit = steps.find(step => step.id === 'release-audit');
  const compare = steps.find(step => step.id === 'compare-vendor');

  it('only substitutes the audited build for release pull requests', () => {
    expect(audit.if).toContain("github.event_name == 'pull_request'");
    expect(audit.if).toContain("github.base_ref == 'release/2.5.x'");
  });

  it.each([0, 1])('refuses changed vendor inputs (git diff exit %s)', status =>
    inRunner(async directory => {
      await mkdir(join(directory, 'scripts'));
      await writeFile(
        join(directory, 'scripts/fix-wallet-sdk-abstractions.js'),
        '',
      );
      await stub(
        directory,
        'git',
        [
          'if [[ "$1" == diff ]]; then exit "$AUDIT_DIFF_STATUS"; fi',
          'if [[ "$1" == worktree ]]; then mkdir -p "$RUNNER_TEMP/lace-vendor-v1/scripts"; fi',
        ].join('\n'),
      );
      await stub(
        directory,
        'node',
        'printf "%s\\n" "$*" >> "$RUNNER_TEMP/commands"',
      );
      const { code } = await runStep(directory, audit.run, {
        RELEASE_BASE_SHA: 'release-base',
        AUDIT_DIFF_STATUS: String(status),
      });
      expect(code === 0).toBe(status === 0);
      if (status === 0) {
        const commands = await readFile(join(directory, 'commands'), 'utf8');
        expect(commands).toContain('scripts/fix-wallet-sdk-abstractions.js');
        expect(commands).toContain('packages/lib/vendor/scripts/build.mjs');
      }
    }),
  );

  it.each([
    ['release/2.5.x', 'lace-vendor-v1/packages/lib/vendor/dist'],
    ['main', 'packages/lib/vendor/dist'],
  ])('compares the correct artifact for %s', (base, expected) =>
    inRunner(async directory => {
      await stub(
        directory,
        'diff',
        'printf "%s\\n" "$*" >> "$RUNNER_TEMP/commands"',
      );
      const { code } = await runStep(directory, compare.run, {
        GITHUB_BASE_REF: base,
      });
      expect(code).toBe(0);
      expect(await readFile(join(directory, 'commands'), 'utf8')).toContain(
        expected,
      );
    }),
  );

  it('fails when the audited bytes differ', () =>
    inRunner(async directory => {
      await stub(directory, 'diff', 'exit 1');
      const { code } = await runStep(directory, compare.run, {
        GITHUB_BASE_REF: 'release/2.5.x',
      });
      expect(code).not.toBe(0);
    }));
});

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
