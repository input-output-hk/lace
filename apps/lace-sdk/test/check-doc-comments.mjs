// Every export of the channel's entries needs a summary doc comment on its
// declaration: the doc comments are the SDK's API documentation. Reads source,
// so it runs without a build. doc-comments-baseline.json lists the canary
// exports still undocumented; it only shrinks, and holds no stable export.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { docCommentProblems, readExportDocs } from '../scripts/doc-comments.ts';
import {
  channelEntries,
  compilerOptions,
  packageDirectory,
} from '../scripts/reach.mjs';

import { CHANNEL } from './channel.mjs';

const workspaceRoot = path.resolve(packageDirectory, '../..');
const stableEntries = channelEntries('stable');
const entries = channelEntries(CHANNEL);
const exports = readExportDocs({
  entries: [...new Set([...entries, ...stableEntries])],
  options: compilerOptions(CHANNEL),
  workspaceRoot,
});
const isEntry = files => doc =>
  files.some(file => path.relative(workspaceRoot, file) === doc.entry);
const channelExports = exports.filter(isEntry(entries));
const baseline = JSON.parse(
  fs.readFileSync(
    path.join(packageDirectory, 'doc-comments-baseline.json'),
    'utf8',
  ),
);

const problems = docCommentProblems({
  exports: channelExports,
  stableNames: new Set(
    exports.filter(isEntry(stableEntries)).map(doc => doc.name),
  ),
  baseline,
  isComplete: CHANNEL === 'canary',
});
assert.equal(problems.length, 0, `Doc comments:\n  ${problems.join('\n  ')}`);
const counted = new Set(
  channelExports
    .filter(({ status }) => status !== 'third-party')
    .map(({ name }) => name),
);
// eslint-disable-next-line no-console -- concise build proof
console.log(
  `Doc comments: ${
    counted.size
  } ${CHANNEL} exports declared in the workspace, ${
    CHANNEL === 'canary' ? baseline.length : 0
  } on the baseline, the rest documented`,
);
