import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it, vi } from 'vitest';

import { runNpmCi } from '../../.github/actions/install/npm-ci.mjs';

const failure = (code, exitCode = 1) => ({
  code: exitCode,
  signal: null,
  stderr: `npm error code ${code}\nnpm error network interrupted\n`,
});
const success = { code: 0, signal: null, stderr: '' };
const dependencies = run => ({
  run,
  wait: vi.fn().mockResolvedValue(undefined),
  warn: vi.fn(),
});

describe('CI npm install', () => {
  it('runs the real CLI from the caller directory without installed dependencies', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'npm-ci-cli-'));
    const manifest = { name: 'install-fixture', version: '1.0.0' };
    try {
      await writeFile(
        join(directory, 'package.json'),
        JSON.stringify(manifest),
      );
      await writeFile(
        join(directory, 'package-lock.json'),
        JSON.stringify({
          ...manifest,
          lockfileVersion: 3,
          requires: true,
          packages: { '': manifest },
        }),
      );
      const { stdout } = await promisify(execFile)(
        process.execPath,
        [
          fileURLToPath(
            new URL(
              '../../.github/actions/install/npm-ci.mjs',
              import.meta.url,
            ),
          ),
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
          '--offline',
        ],
        { cwd: directory },
      );
      expect(stdout).toContain('up to date');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('runs a successful install once and preserves every argument', async () => {
    const run = vi.fn().mockResolvedValue(success);
    const options = dependencies(run);
    const args = ['--ignore-scripts', '--no-audit', '--no-fund'];
    expect(await runNpmCi(args, options)).toBe(0);
    expect(run).toHaveBeenCalledExactlyOnceWith(args);
    expect(options.wait).not.toHaveBeenCalled();
  });

  it.each([
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'EAI_AGAIN',
    'ESOCKETTIMEDOUT',
  ])('retries %s and requires a successful install', async code => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(failure(code))
      .mockResolvedValueOnce(success);
    const options = dependencies(run);
    expect(await runNpmCi([], options)).toBe(0);
    expect(run).toHaveBeenCalledTimes(2);
    expect(options.wait).toHaveBeenCalledExactlyOnceWith(5000);
  });

  it('stops after three failed attempts and preserves the final exit code', async () => {
    const run = vi.fn().mockResolvedValue(failure('ETIMEDOUT', 7));
    const options = dependencies(run);
    expect(await runNpmCi([], options)).toBe(7);
    expect(run).toHaveBeenCalledTimes(3);
    expect(options.wait.mock.calls).toEqual([[5000], [10000]]);
  });

  it.each(['E401', 'E403', 'E404', 'EUSAGE', 'ERESOLVE', 'EINTEGRITY', '1'])(
    'does not retry deterministic npm error %s',
    async code => {
      const run = vi.fn().mockResolvedValue(failure(code));
      const options = dependencies(run);
      expect(await runNpmCi([], options)).toBe(1);
      expect(run).toHaveBeenCalledTimes(1);
      expect(options.wait).not.toHaveBeenCalled();
    },
  );

  it('does not mistake a lifecycle script network error for an install failure', async () => {
    const run = vi.fn().mockResolvedValue({
      ...failure('1'),
      stderr: 'npm error code ETIMEDOUT\nnpm error code 1\n',
    });
    expect(await runNpmCi([], dependencies(run))).toBe(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('stops if the retry encounters a deterministic failure', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(failure('ETIMEDOUT'))
      .mockResolvedValueOnce(failure('EUSAGE', 2));
    expect(await runNpmCi([], dependencies(run))).toBe(2);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('does not retry a terminated process', async () => {
    const run = vi.fn().mockResolvedValue({
      ...failure('ETIMEDOUT'),
      signal: 'SIGTERM',
    });
    expect(await runNpmCi([], dependencies(run))).toBe(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not retry an unclassified failure or a missing executable', async () => {
    const run = vi.fn().mockResolvedValue({ code: 1, stderr: 'failed' });
    expect(await runNpmCi([], dependencies(run))).toBe(1);
    expect(run).toHaveBeenCalledTimes(1);
    const missing = vi.fn().mockRejectedValue(new Error('spawn npm ENOENT'));
    await expect(runNpmCi([], dependencies(missing))).rejects.toThrow(
      'spawn npm ENOENT',
    );
    expect(missing).toHaveBeenCalledTimes(1);
  });
});
