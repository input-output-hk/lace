// Holds a release's public notes to the checks the public snapshot passes:
// the notes the publish job seeds onto the release of input-output-hk/lace-sdk
// (release-scope.ts public-notes: the version, the API diff and where the
// docs and packages are). They fail on any of the internal terms the
// developer site also keeps out of public copy (internal-terms.mjs: ticket
// references, the internal tracker and chat, internal hosts, the design
// records), and on anything gitleaks finds with the snapshot's own rules
// (tools/open-source-release/.gitleaks.toml), which the snapshot's leak-check
// runs. Node's built-ins and gitleaks only.
//
//   node scripts/release-notes-check.ts <notes.md> [--gitleaks]
//
// --gitleaks requires gitleaks on the PATH, as the release jobs install it;
// without it the gitleaks rules are skipped. Exits 1 on a finding, naming the
// line. The public notes name exports alone, so a finding is an export's name
// or the notes' own text, fixed in the code before the release.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { INTERNAL_TERMS } from './internal-terms.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
const GITLEAKS_CONFIG = path.join(
  repositoryRoot,
  'tools/open-source-release/.gitleaks.toml',
);

/** Each line of `text` that names an internal term, with the term. */
export const internalTermFindings = (text: string): string[] =>
  text
    .split('\n')
    .flatMap((line, index) =>
      INTERNAL_TERMS.filter(term => term.test(line)).map(
        term => `line ${index + 1}: ${term} in "${line.trim()}"`,
      ),
    );

/** What gitleaks finds in `text` with the snapshot's rules, redacted. */
export const gitleaksFindings = (text: string): string[] => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'release-notes-'));
  try {
    fs.writeFileSync(path.join(directory, 'release-notes.md'), text);
    const run = spawnSync(
      'gitleaks',
      [
        'detect',
        '--source',
        directory,
        '--config',
        GITLEAKS_CONFIG,
        '--no-git',
        '--redact',
        '--verbose',
      ],
      { encoding: 'utf8' },
    );
    if (run.error)
      throw new Error(`gitleaks failed to run: ${run.error.message}`);
    if (run.status === 0) return [];
    if (run.status === 1)
      return [`gitleaks: ${run.stdout}${run.stderr}`.trim()];
    throw new Error(`gitleaks exited ${run.status}: ${run.stderr}`);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { gitleaks: { type: 'boolean', default: false } },
  });
  const [file] = positionals;
  if (file === undefined) {
    // eslint-disable-next-line no-console -- usage
    console.error(
      'usage: node scripts/release-notes-check.ts <notes.md> [--gitleaks]',
    );
    process.exit(2);
  }
  const text = fs.readFileSync(file, 'utf8');
  const findings = [
    ...internalTermFindings(text),
    ...(values.gitleaks ? gitleaksFindings(text) : []),
  ];
  if (findings.length > 0) {
    // eslint-disable-next-line no-console -- the gate's verdict
    console.error(
      `The public release notes would publish internal content:\n- ${findings.join(
        '\n- ',
      )}\nAn export's name, or the notes' own text, names it: fix it in the code and run again.`,
    );
    process.exit(1);
  }
  // eslint-disable-next-line no-console -- the gate's verdict
  console.log(
    '✓ the release notes name no internal term and gitleaks finds nothing',
  );
}
