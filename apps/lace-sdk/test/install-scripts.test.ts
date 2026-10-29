import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const script = path.resolve(__dirname, '../scripts/install-scripts.mjs');

const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
};

// An installed tree as `npm ci --ignore-scripts` leaves it: native-probe@1,
// required at the top, and native-probe@2, an optional dependency of
// wrapper, nested under it. Each install script records that it ran; the
// required copy's builds, fails or is absent.
const fixture = (required: 'builds' | 'fails' | 'has no script') => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'install-scripts-'));
  const record = `node -e "require('fs').writeFileSync('built', '')"`;
  writeJson(path.join(root, 'package.json'), {
    name: 'fixture',
    version: '1.0.0',
    dependencies: { 'native-probe': '1.0.0', wrapper: '1.0.0' },
  });
  writeJson(path.join(root, 'node_modules/native-probe/package.json'), {
    name: 'native-probe',
    version: '1.0.0',
    ...(required === 'has no script'
      ? {}
      : { scripts: { install: required === 'fails' ? 'exit 1' : record } }),
  });
  writeJson(path.join(root, 'node_modules/wrapper/package.json'), {
    name: 'wrapper',
    version: '1.0.0',
    optionalDependencies: { 'native-probe': '2.0.0' },
  });
  writeJson(
    path.join(
      root,
      'node_modules/wrapper/node_modules/native-probe/package.json',
    ),
    { name: 'native-probe', version: '2.0.0', scripts: { install: 'exit 1' } },
  );
  writeJson(path.join(root, 'package-lock.json'), {
    name: 'fixture',
    version: '1.0.0',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: 'fixture',
        version: '1.0.0',
        dependencies: { 'native-probe': '1.0.0', wrapper: '1.0.0' },
      },
      'node_modules/native-probe': {
        version: '1.0.0',
        ...(required === 'has no script' ? {} : { hasInstallScript: true }),
      },
      'node_modules/wrapper': {
        version: '1.0.0',
        optionalDependencies: { 'native-probe': '2.0.0' },
      },
      'node_modules/wrapper/node_modules/native-probe': {
        version: '2.0.0',
        hasInstallScript: true,
        optional: true,
      },
    },
  });
  return fs.realpathSync(root);
};

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true });
});

const run = (root: string) =>
  spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NPM_CONFIG_USERCONFIG: '/dev/null' },
  });

describe('install-scripts', () => {
  it('keeps a required copy and drops only the failing optional copy of the same name', () => {
    const root = fixture('builds');
    roots.push(root);
    const result = run(root);
    expect(result.status, result.stderr).toBe(0);
    expect(
      fs.existsSync(path.join(root, 'node_modules/native-probe/built')),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(root, 'node_modules/wrapper/node_modules/native-probe'),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(root, 'node_modules/wrapper/package.json')),
    ).toBe(true);
  });

  it('fails when a required copy fails its install script', () => {
    const root = fixture('fails');
    roots.push(root);
    expect(run(root).status).toBe(1);
  });

  // npm rebuild with no directories rebuilds the whole tree, optional copies
  // included, so an empty required set must run nothing.
  it('rebuilds nothing else when no required copy has an install script', () => {
    const root = fixture('has no script');
    roots.push(root);
    const result = run(root);
    expect(result.status, result.stderr).toBe(0);
    expect(
      fs.existsSync(
        path.join(root, 'node_modules/wrapper/node_modules/native-probe'),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(root, 'node_modules/native-probe/package.json')),
    ).toBe(true);
  });
});
