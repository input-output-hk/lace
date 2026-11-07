import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

it('patches both installed HD SDK copies without changing their resolution', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'midnight-hd-patch-'));
  const packageName = '@midnightntwrk/wallet-sdk-hd';
  const copies = [
    { workspace: '', version: 'root' },
    { workspace: 'packages/lib/vendor', version: 'vendor' },
  ];

  try {
    mkdirSync(path.join(root, 'scripts'));
    copyFileSync(
      new URL('../fix-wallet-sdk-abstractions.js', import.meta.url),
      path.join(root, 'scripts/fix-wallet-sdk-abstractions.js'),
    );
    for (const { workspace, version } of copies) {
      const directory = path.join(root, workspace, 'node_modules', packageName);
      mkdirSync(path.join(directory, 'dist'), { recursive: true });
      writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({
          type: 'module',
          module: './dist/index.js',
          exports: { '.': { import: './dist/index.js' } },
        }),
      );
      writeFileSync(
        path.join(directory, 'dist/index.js'),
        `export const version = '${version}';`,
      );
    }

    const runPatch = () =>
      execFileSync(process.execPath, [
        path.join(root, 'scripts/fix-wallet-sdk-abstractions.js'),
      ]);
    runPatch();

    const manifests = copies.map(({ workspace, version }) => {
      const manifestPath = path.join(
        root,
        workspace,
        'node_modules',
        packageName,
        'package.json',
      );
      const manifest = readFileSync(manifestPath, 'utf8');
      expect(JSON.parse(manifest).exports['.'].require).toBe('./dist/index.js');
      const requireFromWorkspace = createRequire(
        path.join(root, workspace, 'probe.cjs'),
      );
      expect(requireFromWorkspace(packageName).version).toBe(version);
      return manifest;
    });

    runPatch();
    expect(
      copies.map(({ workspace }) =>
        readFileSync(
          path.join(
            root,
            workspace,
            'node_modules',
            packageName,
            'package.json',
          ),
          'utf8',
        ),
      ),
    ).toEqual(manifests);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
