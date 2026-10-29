// Every stable variant in the workspace exports what the file it replaces
// does, apart from the names it declares omitted (ADR 66). It runs after the
// unit tests rather than among them: it compiles the workspace twice, and in
// parallel with them it starves their own compilations.
import assert from 'node:assert/strict';
import path from 'node:path';

import { compilerOptions, packageDirectory } from '../scripts/reach.mjs';
import {
  findStableVariants,
  workspaceStableVariantProblems,
} from '../scripts/stable-variants.ts';

const workspaceRoot = path.resolve(packageDirectory, '../..');
const variants = findStableVariants(workspaceRoot);
const problems = workspaceStableVariantProblems({
  workspaceRoot,
  canaryOptions: compilerOptions('canary'),
  stableOptions: compilerOptions('stable'),
});

assert.equal(
  problems.length,
  0,
  `Stable variants:\n  ${problems.join('\n  ')}`,
);
// eslint-disable-next-line no-console -- concise check proof
console.log(
  `Stable variants: ${variants.length} variants export what their originals do, apart from their declared omissions`,
);
