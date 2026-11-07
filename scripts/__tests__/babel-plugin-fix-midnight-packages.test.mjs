import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { test } from 'vitest';

for (const scenario of [
  'nested ESM',
  'native require',
  'runtime failure',
  'blocked export',
]) {
  test(`documentation HD loader: ${scenario}`, () => {
    const root = mkdtempSync(path.join(tmpdir(), 'midnight-doc-loader-'));
    try {
      mkdirSync(path.join(root, 'scripts'));
      copyFileSync(
        new URL('../babel-plugin-fix-midnight-packages.js', import.meta.url),
        path.join(root, 'scripts/plugin.cjs'),
      );
      const directory = path.join(
        root,
        'packages/vendor/node_modules/@midnightntwrk/wallet-sdk-hd',
      );
      mkdirSync(directory, { recursive: true });
      const exports =
        scenario === 'blocked export'
          ? { types: './types.d.ts' }
          : { import: './index.js' };
      if (scenario === 'native require') exports.require = './native.cjs';
      const manifest = JSON.stringify({
        type: 'module',
        exports: { '.': exports },
      });
      writeFileSync(path.join(directory, 'package.json'), manifest);
      writeFileSync(
        path.join(directory, 'index.js'),
        scenario === 'runtime failure'
          ? 'throw new Error("HD runtime failure");'
          : 'export const version = "nested-canary";',
      );
      writeFileSync(
        path.join(directory, 'native.cjs'),
        'exports.version = "native";',
      );
      const script = path.join(root, 'packages/vendor/probe.cjs');
      writeFileSync(
        script,
        'require("../../scripts/plugin.cjs"); require("node:fs").writeFileSync(__dirname + "/result", require("@midnightntwrk/wallet-sdk-hd").version);',
      );
      const result = spawnSync(process.execPath, [script], {
        encoding: 'utf8',
      });
      if (scenario === 'runtime failure' || scenario === 'blocked export') {
        assert.notEqual(result.status, 0);
        assert.match(
          result.stderr,
          scenario === 'runtime failure'
            ? /HD runtime failure/
            : /ERR_PACKAGE_PATH_NOT_EXPORTED/,
        );
      } else {
        assert.equal(result.status, 0, result.stderr);
        assert.equal(
          readFileSync(path.join(root, 'packages/vendor/result'), 'utf8'),
          scenario === 'native require' ? 'native' : 'nested-canary',
        );
      }
      assert.equal(
        readFileSync(path.join(directory, 'package.json'), 'utf8'),
        manifest,
      );
      assert.deepEqual(
        readFileSync(path.join(directory, 'index.js'), 'utf8').includes(
          'nested-canary',
        ),
        scenario !== 'runtime failure',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
