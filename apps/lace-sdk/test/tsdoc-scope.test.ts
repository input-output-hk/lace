import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(import.meta.dirname, '../../..');
const eslintConfig = path.join(workspaceRoot, 'eslint.config.mjs');

/** The scope list the workspace ESLint config applies `tsdoc/syntax` to. */
const configuredScope = async () => {
  const config: unknown = await import(pathToFileURL(eslintConfig).href);
  return (config as { TSDOC_SCOPE: string[] }).TSDOC_SCOPE;
};

// The SDK's generated standalone repository has no workspace ESLint config,
// so there is no scope to check; in the monorepo the config is always present.
const hasEslintConfig = fs.existsSync(eslintConfig);

describe.skipIf(!hasEslintConfig)(
  hasEslintConfig
    ? 'TSDOC_SCOPE'
    : 'TSDOC_SCOPE (skipped: no workspace eslint.config.mjs, as in the standalone SDK repository)',
  () => {
    it('lists the SDK and every workspace package its canary entries reach', async () => {
      // The synchronous compiler walk can exceed Vitest's 60-second RPC deadline.
      // Keep the test worker responsive while the child computes the scope.
      const { stdout } = await execFileAsync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `
            import { channelEntries, reachedWorkspaceFiles, workspacePackages } from './apps/lace-sdk/scripts/reach.mjs';
            console.log(JSON.stringify(workspacePackages(reachedWorkspaceFiles(channelEntries('canary')), process.cwd())));
          `,
        ],
        { cwd: workspaceRoot, timeout: 180_000 },
      );
      const reached = ['apps/lace-sdk', ...(JSON.parse(stdout) as string[])];

      expect(
        await configuredScope(),
        `TSDOC_SCOPE in eslint.config.mjs, the projects whose doc comments lint checks as TSDoc, no longer matches what the SDK reaches. Replace it with:\n${JSON.stringify(
          reached,
          undefined,
          2,
        )}\nthen run lint on the projects that join it and fix their tsdoc/syntax errors.`,
      ).toEqual(reached);
      // Loads the workspace ESLint config and walks what the canary entries
      // reach: seconds alone, minutes when CI runs many projects at once.
    }, 180_000);
  },
);
