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
      exclusions: 'lace-sdk,lace-sdk-example-passport,lace-sdk-site',
      deferred: true,
    },
    { exclusions: '', deferred: false },
  ])(
    'honors the guarded SDK release exclusions: $deferred',
    ({ exclusions, deferred }) =>
      inRunner(async directory => {
        await stub(
          directory,
          'npx',
          'printf "%s\\n" "$*" >> "$RUNNER_TEMP/commands"',
        );
        const { code } = await runStep(
          directory,
          stepScript('build', 'build-workspace'),
          {
            SDK_RELEASE_EXCLUSIONS: exclusions,
          },
        );
        expect(code).toBe(0);
        const commands = await readFile(join(directory, 'commands'), 'utf8');
        expect(commands).toContain(
          `nx run-many --target=build --exclude=${
            deferred ? exclusions : 'lace-sdk-site'
          }`,
        );
        expect(commands).toContain(
          'tsx apps/lace-extension/scripts/verify-build-output.ts',
        );
      }),
  );
});

describe('the temporary app-release gates', () => {
  it.each(['failure', 'skipped', 'cancelled', 'success'])(
    'makes Code Quality follow either native workflow result: %s',
    async result => {
      for (const job of [
        'mobile-release-builds',
        'next-mobile-release-builds',
      ]) {
        await inRunner(async directory => {
          const values = {
            'needs.changes.outputs.ready_only': 'false',
            'needs.changes.outputs.docs_only': 'false',
            'needs.changes.outputs.sdk_exclusions': 'lace-sdk',
            'needs.code-quality-checks.result': 'success',
            'needs.lint.result': 'success',
            'needs.mobile-release-builds.result': 'success',
            'needs.next-mobile-release-builds.result': 'success',
            [`needs.${job}.result`]: result,
          };
          const script = workflow.jobs['code-quality'].steps[0].run.replace(
            /\$\{\{\s*(.*?)\s*\}\}/g,
            (_, key) => values[key] ?? '',
          );
          expect((await runStep(directory, script)).code === 0).toBe(
            result === 'success',
          );
        });
      }
    },
  );

  it('does not require the extra native workflows outside the exception', () =>
    inRunner(async directory => {
      const values = {
        'needs.changes.outputs.ready_only': 'false',
        'needs.changes.outputs.docs_only': 'false',
        'needs.changes.outputs.sdk_exclusions': '',
        'needs.code-quality-checks.result': 'success',
        'needs.lint.result': 'success',
        'needs.mobile-release-builds.result': 'skipped',
        'needs.next-mobile-release-builds.result': 'skipped',
      };
      const script = workflow.jobs['code-quality'].steps[0].run.replace(
        /\$\{\{\s*(.*?)\s*\}\}/g,
        (_, key) => values[key] ?? '',
      );
      expect((await runStep(directory, script)).code).toBe(0);
    }));

  it('requires both native platforms without submitting or announcing PR builds', async () => {
    for (const [job, file] of [
      ['mobile-release-builds', 'mobile-build.yml'],
      ['next-mobile-release-builds', 'lace-next-mobile.yml'],
    ]) {
      const caller = workflow.jobs[job];
      expect(caller.uses).toBe(`./.github/workflows/${file}`);
      expect(caller.with.platform).toBe('all');
      expect(caller.if).toContain("sdk_exclusions != ''");
      expect(caller['continue-on-error']).toBeUndefined();
      expect(workflow.jobs['code-quality'].needs).toContain(job);
      const native = parse(
        await readFile(
          fileURLToPath(
            new URL(`../../.github/workflows/${file}`, import.meta.url),
          ),
          'utf8',
        ),
      );
      expect(native.on.workflow_call.inputs.platform.default).toBe('all');
      expect(native.jobs['build-ios'].if).toContain('inputs.platform');
      expect(native.jobs['build-android'].if).toContain('inputs.platform');
      for (const platform of ['ios', 'android']) {
        const steps = native.jobs[`build-${platform}`].steps;
        expect(steps.some(step => /submit/.test(step.run ?? ''))).toBe(false);
        const browserstack = steps.find(step =>
          step.name?.includes('to BrowserStack'),
        );
        if (browserstack)
          expect(browserstack.if).toContain(
            "github.event_name != 'pull_request'",
          );
      }
    }
    expect(workflow.jobs['mobile-release-builds'].with.notify_slack).toBe(
      false,
    );
  });

  it('does not convert a scope helper failure into an SDK exception', () =>
    inRunner(async directory => {
      await stub(directory, 'node', 'exit 37');
      const result = await runStep(
        directory,
        stepScript('changes', 'sdk-scope'),
      );
      expect(result.code).toBe(37);
      expect(result.output).toBe('');
    }));
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
