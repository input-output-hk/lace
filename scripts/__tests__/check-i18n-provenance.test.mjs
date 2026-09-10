// Fixture-driven harness for scripts/check-i18n-provenance.js.
//
// The checker resolves its "new key" baseline from git history, so a real
// throwaway repo is the only honest way to exercise `keysAtRef` and
// `resolveBaseline`. Each case builds a temp repo (base commit on `main`, a
// branch commit that mimics a PR), points the checker at it via the
// `I18N_PROVENANCE_ROOT` seam, and asserts exit code + stderr. The rows map
// one-to-one to the success-criteria matrix in
// docs/i18n-provenance-new-key-ci-enforcement.md.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, '..', 'check-i18n-provenance.js');

// Root of the fixture's single translation root, relative to the repo root.
// `governanceDirForRoot` walks up from here to the nearest package.json
// (pkg/i18n), so governance resolves to pkg/i18n/docs/i18n.
const ROOT_REL = 'pkg/i18n/src/translations';
const GOV_REL = 'pkg/i18n/docs/i18n';

const createdRepos = [];

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  // Never let a developer's global hooks/signing config perturb the fixture.
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
};

const git = (repo, args) =>
  execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: gitEnv,
  });

const writeJson = (repo, rel, value) => {
  const full = join(repo, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(value, null, 2) + '\n');
};

const writeText = (repo, rel, text) => {
  const full = join(repo, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
};

const initRepo = () => {
  const repo = mkdtempSync(join(tmpdir(), 'i18n-prov-'));
  createdRepos.push(repo);
  git(repo, ['init']);
  // Deterministic initial branch across git versions (avoids relying on -b).
  git(repo, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  return repo;
};

const commitAll = (repo, message) => {
  git(repo, ['add', '-A']);
  git(repo, ['commit', '--no-gpg-sign', '-m', message]);
};

// Write the app policy + owning package.json (+ optional critical patterns).
// These are the stable governance scaffolding; individual cases vary only the
// locale/provenance files.
const scaffold = (
  repo,
  { tolerance = 'permissive', shipped = ['en', 'es'], criticalPatterns } = {},
) => {
  writeJson(repo, 'apps/app1/docs/i18n/policy.json', {
    tolerance,
    shippedLanguages: shipped,
    translationsRoots: [ROOT_REL],
  });
  writeJson(repo, 'pkg/i18n/package.json', { name: 'fixture-i18n' });
  if (criticalPatterns) {
    writeJson(repo, `${GOV_REL}/critical-key-patterns.json`, {
      patterns: criticalPatterns,
    });
  }
};

const writeLocales = (repo, { en, es, esProvenance }) => {
  writeJson(repo, `${ROOT_REL}/en.json`, en);
  writeJson(repo, `${ROOT_REL}/es.json`, es);
  writeJson(repo, `${GOV_REL}/es-provenance.json`, esProvenance);
};

const runChecker = (repo, args) => {
  try {
    const stdout = execFileSync('node', [SCRIPT, ...args], {
      cwd: repo,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, I18N_PROVENANCE_ROOT: repo },
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      status: error.status ?? 1,
      stdout: String(error.stdout ?? ''),
      stderr: String(error.stderr ?? error.message ?? ''),
    };
  }
};

afterAll(() => {
  for (const repo of createdRepos) {
    rmSync(repo, { recursive: true, force: true });
  }
});

describe('check-i18n-provenance --base-ref (new-key enforcement)', () => {
  it('FAILS a new key marked "unknown" in a shipped locale (strict-new message)', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    git(repo, ['checkout', '-b', 'feature']);
    writeLocales(repo, {
      en: { greeting: 'Hello', farewell: 'Bye' },
      es: { greeting: 'Hola', farewell: 'Adiós' },
      esProvenance: { greeting: 'unknown', farewell: 'unknown' },
    });
    commitAll(repo, 'feature: add farewell as unknown');

    const { status, stderr } = runChecker(repo, ['--base-ref', 'main']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/new key "farewell" has technique "unknown"/);
    expect(stderr).toMatch(/i18n-translate/);
  });

  it('FAILS a new key marked "stub" in a shipped locale (strict-new message)', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    git(repo, ['checkout', '-b', 'feature']);
    writeLocales(repo, {
      en: { greeting: 'Hello', farewell: 'Bye' },
      es: { greeting: 'Hola', farewell: 'Bye' },
      esProvenance: { greeting: 'unknown', farewell: 'stub' },
    });
    commitAll(repo, 'feature: add farewell as stub');

    const { status, stderr } = runChecker(repo, ['--base-ref', 'main']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/new key "farewell" has technique "stub"/);
  });

  it('PASSES a new non-critical key marked "machine-translated" under permissive', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    git(repo, ['checkout', '-b', 'feature']);
    writeLocales(repo, {
      en: { greeting: 'Hello', farewell: 'Bye' },
      es: { greeting: 'Hola', farewell: 'Adiós' },
      esProvenance: { greeting: 'unknown', farewell: 'machine-translated' },
    });
    commitAll(repo, 'feature: add farewell as machine-translated');

    const { status, stdout } = runChecker(repo, ['--base-ref', 'main']);
    expect(status).toBe(0);
    expect(stdout).toMatch(/new-key mode vs main/);
  });

  it('FAILS a new CRITICAL key marked "machine-translated" (existing gate, unchanged)', () => {
    const repo = initRepo();
    scaffold(repo, { criticalPatterns: ['send-flow.*'] });
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    git(repo, ['checkout', '-b', 'feature']);
    writeLocales(repo, {
      en: { greeting: 'Hello', 'send-flow.amount': 'Amount' },
      es: { greeting: 'Hola', 'send-flow.amount': 'Cantidad' },
      esProvenance: {
        greeting: 'unknown',
        'send-flow.amount': 'machine-translated',
      },
    });
    commitAll(repo, 'feature: add critical key as machine-translated');

    const { status, stderr } = runChecker(repo, ['--base-ref', 'main']);
    expect(status).toBe(1);
    // Raw machine draft on a critical surface is rejected by the tolerance
    // allow-list regardless of the new-key check.
    expect(stderr).toMatch(/not permitted under "permissive"|not verified/);
    expect(stderr).toMatch(/send-flow\.amount/);
  });

  it('PASSES a pre-existing "unknown" key that the PR does not touch (no forced burn-down)', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello', legacy: 'Legacy' },
      es: { greeting: 'Hola', legacy: 'Heredado' },
      esProvenance: { greeting: 'unknown', legacy: 'unknown' },
    });
    commitAll(repo, 'base');

    // A PR that changes an unrelated file and adds no new keys.
    git(repo, ['checkout', '-b', 'feature']);
    writeText(repo, 'README.md', '# unrelated change\n');
    commitAll(repo, 'feature: unrelated change');

    const { status, stderr } = runChecker(repo, ['--base-ref', 'main']);
    expect(status).toBe(0);
    expect(stderr).toBe('');
  });

  it('PASSES when the PR only changes the value of an existing key', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    // Retranslate an existing key; provenance stays "unknown" (still exempt).
    git(repo, ['checkout', '-b', 'feature']);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Buenos días' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'feature: retranslate greeting');

    const { status } = runChecker(repo, ['--base-ref', 'main']);
    expect(status).toBe(0);
  });

  it('SKIPS new-key strictness for a source file absent at the baseline (onboarding)', () => {
    const repo = initRepo();
    // Baseline has no translation root at all.
    writeText(repo, 'README.md', '# repo\n');
    commitAll(repo, 'base: no translations yet');

    // The whole root + governance arrives in one commit, es unshipped + all stub.
    git(repo, ['checkout', '-b', 'feature']);
    scaffold(repo, { shipped: ['en'] });
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hello' },
      esProvenance: { greeting: 'stub' },
    });
    commitAll(repo, 'feature: onboard translation root');

    const { status } = runChecker(repo, ['--base-ref', 'main']);
    // en.json absent at baseline → keysAtRef returns null → every key is treated
    // as pre-existing, so the all-stub onboarding state is allowed.
    expect(status).toBe(0);
  });

  it('flags ONLY the branch additions on a stale branch — valid addition passes', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    git(repo, ['checkout', '-b', 'feature']);
    // main advances with its OWN new unknown key after the fork.
    git(repo, ['checkout', 'main']);
    writeLocales(repo, {
      en: { greeting: 'Hello', onMain: 'On main' },
      es: { greeting: 'Hola', onMain: 'En main' },
      esProvenance: { greeting: 'unknown', onMain: 'unknown' },
    });
    commitAll(repo, 'main: advance with onMain (unknown)');

    git(repo, ['checkout', 'feature']);
    writeLocales(repo, {
      en: { greeting: 'Hello', onBranch: 'On branch' },
      es: { greeting: 'Hola', onBranch: 'En rama' },
      esProvenance: { greeting: 'unknown', onBranch: 'machine-translated' },
    });
    commitAll(repo, 'feature: add onBranch (machine-translated)');

    const { status, stderr } = runChecker(repo, ['--base-ref', 'main']);
    // merge-base is the fork point: onMain (main-only, newer) is never in the
    // branch's source, and the branch's own valid addition clears the gate.
    expect(status).toBe(0);
    expect(stderr).not.toMatch(/onMain/);
  });

  it('flags ONLY the branch additions on a stale branch — invalid addition fails', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    git(repo, ['checkout', '-b', 'feature']);
    git(repo, ['checkout', 'main']);
    writeLocales(repo, {
      en: { greeting: 'Hello', onMain: 'On main' },
      es: { greeting: 'Hola', onMain: 'En main' },
      esProvenance: { greeting: 'unknown', onMain: 'unknown' },
    });
    commitAll(repo, 'main: advance with onMain (unknown)');

    git(repo, ['checkout', 'feature']);
    writeLocales(repo, {
      en: { greeting: 'Hello', onBranch: 'On branch' },
      es: { greeting: 'Hola', onBranch: 'Bye' },
      esProvenance: { greeting: 'unknown', onBranch: 'unknown' },
    });
    commitAll(repo, 'feature: add onBranch (unknown)');

    const { status, stderr } = runChecker(repo, ['--base-ref', 'main']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/new key "onBranch" has technique "unknown"/);
    // main's own newer unknown debt is NOT dragged into this PR.
    expect(stderr).not.toMatch(/onMain/);
  });

  it('HARD-FAILS with a fetch hint when the base ref cannot be resolved', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    // No remote configured → origin/main is unresolvable (simulates a shallow
    // clone / unfetched base ref in CI).
    const { status, stderr } = runChecker(repo, ['--base-ref', 'origin/main']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/Fetch the base branch/);
  });

  it('errors with usage when --base-ref is passed without a value', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    const { status, stderr } = runChecker(repo, ['--base-ref']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/Usage: .*--base-ref <ref>/);
  });

  it('honours the equals-form --base-ref=<ref> instead of silently skipping the gate', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    git(repo, ['checkout', '-b', 'feature']);
    writeLocales(repo, {
      en: { greeting: 'Hello', farewell: 'Bye' },
      es: { greeting: 'Hola', farewell: 'Adiós' },
      esProvenance: { greeting: 'unknown', farewell: 'unknown' },
    });
    commitAll(repo, 'feature: add farewell as unknown');

    // The GNU equals-form must engage the new-key gate, not fall through to the
    // permissive whole-set no-op.
    const { status, stderr } = runChecker(repo, ['--base-ref=main']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/new key "farewell" has technique "unknown"/);

    // An empty equals-value fails loudly rather than degrading to permissive.
    const empty = runChecker(repo, ['--base-ref=']);
    expect(empty.status).toBe(1);
    expect(empty.stderr).toMatch(/Usage: .*--base-ref <ref>/);
  });

  it('HARD-FAILS (never silently skips) when git show returns unparseable content at the baseline', () => {
    const repo = initRepo();
    scaffold(repo);
    // Baseline en.json exists but is malformed → `git show` succeeds, JSON.parse
    // throws → keysAtRef must re-throw (its throw-on-other-git-error contract),
    // not swallow it as "file absent" and silently disable new-key strictness.
    writeText(repo, `${ROOT_REL}/en.json`, '{ this is not valid json');
    writeJson(repo, `${ROOT_REL}/es.json`, { greeting: 'Hola' });
    writeJson(repo, `${GOV_REL}/es-provenance.json`, { greeting: 'unknown' });
    commitAll(repo, 'base: malformed en.json');

    git(repo, ['checkout', '-b', 'feature']);
    // Feature source is valid, and its one new key is a legal technique — so the
    // ONLY thing that can produce a non-zero exit is keysAtRef throwing on the
    // malformed baseline. If the throw branch regressed to returning null, the
    // check would pass (exit 0) and this test would catch it.
    writeLocales(repo, {
      en: { greeting: 'Hello', farewell: 'Bye' },
      es: { greeting: 'Hola', farewell: 'Adiós' },
      esProvenance: { greeting: 'unknown', farewell: 'machine-translated' },
    });
    commitAll(repo, 'feature: valid locales');

    const { status, stderr } = runChecker(repo, ['--base-ref', 'main']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/git show .*failed/);
    // Distinct from resolveBaseline's failure — this is the keysAtRef guard.
    expect(stderr).not.toMatch(/Fetch the base branch/);
  });
});

describe('check-i18n-provenance --strict-new (HEAD baseline, unchanged)', () => {
  it('detects an UNCOMMITTED new stub key (pre-commit feedback)', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    // Working tree diverges from HEAD (not yet committed) — the pre-commit case.
    writeLocales(repo, {
      en: { greeting: 'Hello', farewell: 'Bye' },
      es: { greeting: 'Hola', farewell: 'Bye' },
      esProvenance: { greeting: 'unknown', farewell: 'stub' },
    });

    const { status, stderr } = runChecker(repo, ['--strict-new']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/new key "farewell" has technique "stub"/);
  });

  it('demonstrates the CI loophole (committed key passes --strict-new) that --base-ref closes', () => {
    const repo = initRepo();
    scaffold(repo);
    writeLocales(repo, {
      en: { greeting: 'Hello' },
      es: { greeting: 'Hola' },
      esProvenance: { greeting: 'unknown' },
    });
    commitAll(repo, 'base');

    git(repo, ['checkout', '-b', 'feature']);
    // Smuggled as "unknown" (a translated value, so no other gate trips) — the
    // exact loophole: "unknown" is exempt from the consistency / ship-gate /
    // critical checks, so only the new-key check can catch a brand-new one.
    writeLocales(repo, {
      en: { greeting: 'Hello', farewell: 'Bye' },
      es: { greeting: 'Hola', farewell: 'Adiós' },
      esProvenance: { greeting: 'unknown', farewell: 'unknown' },
    });
    commitAll(repo, 'feature: smuggle farewell as unknown');

    // Working tree == HEAD, so --strict-new sees no new keys — the silent no-op.
    expect(runChecker(repo, ['--strict-new']).status).toBe(0);
    // The base-branch baseline catches exactly what the HEAD baseline missed.
    const netted = runChecker(repo, ['--base-ref', 'main']);
    expect(netted.status).toBe(1);
    expect(netted.stderr).toMatch(/new key "farewell" has technique "unknown"/);
  });
});
