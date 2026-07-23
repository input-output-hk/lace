#!/usr/bin/env node
// =====================================================================
// scripts/check-i18n-provenance.js
// =====================================================================
// Validates the i18n provenance discipline defined in
// `docs/i18n-strategy.md`.
//
// Model: the translation ROOT is the unit of governance. A root is a
// directory of `{lang}.json` locale files; its governance
// (`{lang}-provenance.json`, `critical-key-patterns.json`,
// `verified-critical-{lang}.json`) is
// co-located with the root — in the `docs/i18n/` directory of the
// nearest package/app that owns it. Governance for a root is therefore
// defined ONCE, next to the root, regardless of how many apps consume it.
//
//   - Central root: `packages/contract/i18n/src/translations` — the
//     strings shared across wrappers (same app, different wrappers).
//     Governance lives in `packages/contract/i18n/docs/i18n/`.
//   - App-local root (opt-in): `apps/<app>/.../translations` — strings
//     specific to one app. Governance lives in `apps/<app>/docs/i18n/`.
//
// Each app declares its SHIP policy in `apps/<app>/docs/i18n/policy.json`:
// `tolerance`, `shippedLanguages`, and `translationsRoots` — the list of
// roots that make up the app's translatable surface (central always;
// app-local optional). The check walks every (app × root): it resolves
// the root's co-located governance and evaluates each GOVERNED source key
// under THAT app's `tolerance`/`shippedLanguages`. A shared key is defined
// once but evaluated under each consuming app's policy.
//
// EVERY source key must carry an explicit provenance entry — there is no
// implicit exemption. Pre-policy translations are recorded explicitly as
// `unknown` (not omitted); the check then asserts, per key:
//
//   1. The key exists in the target locale JSON (locale parity) and has a
//      provenance entry (a missing entry is an error — `unknown` included).
//   2. The recorded `technique` is one of the valid values.
//   3. `unknown` is recorded-but-not-judged: it is exempt from the
//      consistency / ship-gate / critical checks below (a pre-policy string
//      whose quality is whatever it was at adoption), pending conversion to a
//      real technique. It is NOT a valid state for a newly-added key
//      (see `--strict-new`). Every other technique is judged:
//   4. The technique is consistent with the target value:
//        - target[k] === source[k]  →  must be `stub` or `verbatim`
//        - target[k] !== source[k]  →  must be one of
//          `exact-reuse | exact-ambiguous | machine-translated | mtpe |
//          human`
//   5. Ship-gate: the technique falls in the allow-list for the key's
//      criticality under the app's `tolerance` (the table in
//      `docs/i18n-strategy.md`). E.g. under `strict` a non-critical key
//      cannot be `machine-translated`; under `strict` / `permissive` a
//      critical key cannot be a raw machine draft and must additionally be
//      listed in `verified-critical-{lang}.json` (parallel review) unless it
//      is a deliberate `verbatim`. `pre-production` bypasses both floors.
//      `stub` is the honest "untranslated" marker, governed by parity /
//      `--strict-new`, so the gate applies only to translated techniques.
//   6. With `--strict-new`: keys that didn't exist at HEAD cannot be `stub`
//      or `unknown` — a brand-new key can't be marked pre-policy. Forces the
//      developer to invoke the `i18n-translate` skill or mark it explicitly.
//
// Adoption & conversion:
//   At governance rollout, seed every existing source key as `unknown` in each
//   target locale's provenance (`--seed-unknown <translations-root>`). This is
//   the single, explicit record of what predates the policy — there is no
//   separate baseline list. Resolving that unaudited debt is a burn-down: flip
//   each `unknown` entry to the real technique it earns (`mtpe` / `human` / …)
//   as it is reviewed, per locale, until none remain.
//
// Invocation:
//   node scripts/check-i18n-provenance.js                # post-commit / CI
//   node scripts/check-i18n-provenance.js --strict-new   # pre-commit
//   node scripts/check-i18n-provenance.js --seed-unknown <translations-root>
// =====================================================================

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const VALID_TECHNIQUES = new Set([
  'stub',
  'verbatim',
  'machine-translated',
  'exact-reuse',
  'exact-ambiguous',
  'mtpe',
  'human',
  // Provenance unknown — a pre-policy translation adopted at governance
  // rollout. Recorded explicitly, but we know nothing of how it was produced, so
  // it is unaudited quality risk. Exempt from the quality/ship-gate checks
  // pending conversion to a known technique. Resolving every `unknown` → 0 is
  // risk remediation, not cleanup; it is the measurable burn-down.
  'unknown',
]);

// Techniques permitted when target value differs from source (i.e. the
// string was actually translated, however that happened).
const NON_MIRROR_TECHNIQUES = new Set([
  'exact-reuse',
  'exact-ambiguous',
  'machine-translated',
  'mtpe',
  'human',
]);

// Human-reviewed techniques: produced or signed off by a human for some
// surface. Excludes raw machine output (`machine-translated`) and the
// not-yet-confirmed pool pick (`exact-ambiguous`, "machine-equivalent" per
// docs/i18n-strategy.md), and `stub`.
const HUMAN_REVIEWED_TECHNIQUES = new Set([
  'exact-reuse',
  'verbatim',
  'mtpe',
  'human',
]);

// Ship-gate technique allow-lists per app `tolerance`, mirroring the table in
// docs/i18n-strategy.md. `null` = any technique permitted. The gate is applied
// only to translated (non-`stub`) techniques — `stub` is governed separately by
// the parity and `--strict-new` checks.
const TOLERANCE_TECHNIQUES = {
  strict: {
    critical: HUMAN_REVIEWED_TECHNIQUES,
    nonCritical: HUMAN_REVIEWED_TECHNIQUES,
  },
  permissive: {
    critical: HUMAN_REVIEWED_TECHNIQUES,
    nonCritical: null,
  },
  'pre-production': {
    critical: null,
    nonCritical: null,
  },
};

// Resolve the workspace root from this script's location, not the caller's
// cwd — the check must behave the same run from a package subdir or via npm.
const ROOT = path.resolve(__dirname, '..');

const loadJson = filepath => JSON.parse(fs.readFileSync(filepath, 'utf-8'));

// Governance for a translation root lives in the `docs/i18n/` directory of the
// nearest package/app that owns the root (the first ancestor with a
// package.json). This co-locates governance with the root it governs, so a
// shared root is governed once regardless of how many apps consume it.
const governanceDirForRoot = rootAbs => {
  let dir = rootAbs;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return path.join(dir, 'docs', 'i18n');
    }
    dir = path.dirname(dir);
  }
  return null;
};

// The roots that make up an app's translatable surface. Accepts the current
// `translationsRoots` array and the deprecated single `translationsRoot` string.
const rootsFromPolicy = policy => {
  if (Array.isArray(policy.translationsRoots)) return policy.translationsRoots;
  if (typeof policy.translationsRoots === 'string')
    return [policy.translationsRoots];
  if (typeof policy.translationsRoot === 'string')
    return [policy.translationsRoot];
  return [];
};

// Compile a glob (only `*` is special → matches any run of characters) into an
// anchored regex, escaping all other regex metacharacters.
const compileGlob = glob =>
  new RegExp(
    `^${glob.replace(/[.*+?^${}()|[\]\\]/g, m =>
      m === '*' ? '.*' : `\\${m}`,
    )}$`,
  );

// Keys present in `filepath` at HEAD, or `null` if the file did not exist at
// HEAD (a brand-new locale file). `null` ≠ empty set: a new file means every
// key is "new", which would make --strict-new reject the legitimate all-stub
// onboarding state — callers treat `null` as "skip strict-new for this file".
// Path is POSIX-normalized and passed argv-style (no shell) so it is safe on
// paths with spaces and on Windows.
const keysAtHead = filepath => {
  const relative = path.relative(ROOT, filepath).split(path.sep).join('/');
  try {
    const content = execFileSync('git', ['show', `HEAD:${relative}`], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return new Set(Object.keys(JSON.parse(content)));
  } catch (error) {
    // Only "the file didn't exist at HEAD" is a legitimate null (→ skip
    // strict-new for a brand-new file). Any other failure — no repo, git
    // missing, bad ref — must surface, not silently disable strict-new.
    const stderr = String(error.stderr ?? error.message ?? '');
    if (/does not exist in|exists on disk, but not in/.test(stderr)) {
      return null;
    }
    throw new Error(`git show HEAD:${relative} failed: ${stderr.trim()}`);
  }
};

// Evaluate one (app policy × translation root). `label` identifies the app (and
// root, when the app spans more than one) in error messages. `tolerance` and
// `shippedLanguages` are the app's; critical-patterns / provenance /
// verified-critical are the root's (co-located governance).
const checkRoot = ({
  label,
  tolerance,
  shippedLanguages,
  rootRel,
  strictNew,
}) => {
  const errors = [];
  const rootAbs = path.join(ROOT, rootRel);
  if (!fs.existsSync(rootAbs)) {
    errors.push(`${label}: translations root ${rootRel} not found`);
    return errors;
  }

  const governanceDir = governanceDirForRoot(rootAbs);
  if (!governanceDir) {
    errors.push(
      `${label}: no owning package (package.json) found above root ${rootRel}`,
    );
    return errors;
  }

  const sourcePath = path.join(rootAbs, 'en.json');
  if (!fs.existsSync(sourcePath)) {
    errors.push(
      `${label}: source ${path.relative(ROOT, sourcePath)} not found`,
    );
    return errors;
  }
  const source = loadJson(sourcePath);

  // Critical-surface enforcement: keys matching a pattern in the root's
  // critical-key-patterns.json are accuracy-critical. Absent → no critical
  // surfaces. Bypassed under `pre-production` tolerance.
  const enforceCritical = tolerance !== 'pre-production';
  const criticalPatternsPath = path.join(
    governanceDir,
    'critical-key-patterns.json',
  );
  const criticalRegexes =
    enforceCritical && fs.existsSync(criticalPatternsPath)
      ? (loadJson(criticalPatternsPath).patterns || []).map(compileGlob)
      : [];
  const isCriticalKey = key => criticalRegexes.some(re => re.test(key));

  // Brand-new source file (absent at HEAD) → no "new key" set, so the all-stub
  // onboarding state is allowed under --strict-new.
  const headKeys = strictNew ? keysAtHead(sourcePath) : null;
  const newKeys =
    strictNew && headKeys !== null
      ? new Set(Object.keys(source).filter(k => !headKeys.has(k)))
      : new Set();

  // Validate every target locale that EXISTS in the root, not just the shipped
  // ones — a present `{lang}.json` outside shippedLanguages must still satisfy
  // parity/provenance. Union with shippedLanguages so a shipped language missing
  // its file is still flagged ("target not found").
  const presentLocales = fs
    .readdirSync(rootAbs)
    .filter(file => file.endsWith('.json'))
    .map(file => file.slice(0, -'.json'.length));
  const targetLocales = [
    ...new Set([...(shippedLanguages || []), ...presentLocales]),
  ].filter(lang => lang !== 'en');

  for (const lang of targetLocales) {
    const targetPath = path.join(rootAbs, `${lang}.json`);
    const provenancePath = path.join(governanceDir, `${lang}-provenance.json`);

    if (!fs.existsSync(targetPath)) {
      errors.push(
        `${label}/${lang}: target ${path.relative(ROOT, targetPath)} not found`,
      );
      continue;
    }
    if (!fs.existsSync(provenancePath)) {
      errors.push(
        `${label}/${lang}: provenance ${path.relative(
          ROOT,
          provenancePath,
        )} not found`,
      );
      continue;
    }

    const target = loadJson(targetPath);
    const provenance = loadJson(provenancePath);

    // Keys a second reviewer has signed off for this language (parallel manual
    // check). Absent file → nothing verified yet.
    const verifiedCriticalPath = path.join(
      governanceDir,
      `verified-critical-${lang}.json`,
    );
    const verifiedCritical = fs.existsSync(verifiedCriticalPath)
      ? new Set(loadJson(verifiedCriticalPath))
      : new Set();

    for (const [key, sourceValue] of Object.entries(source)) {
      const technique = provenance[key];

      // Locale parity (a key existing in every locale) is enforced at compile
      // time by the typed key union (docs/i18n-strategy.md); this check governs
      // only translations that EXIST in the locale. A source key absent from the
      // target is skipped — UNLESS its provenance claims a real (non-`unknown`)
      // translation, which is a contradiction the parity net must still catch
      // (else a `machine-translated` / `human` entry passes with no translation).
      if (!Object.prototype.hasOwnProperty.call(target, key)) {
        if (technique !== undefined && technique !== 'unknown') {
          errors.push(
            `${label}/${lang}: key "${key}" has technique "${technique}" but is missing from the target locale (parity broken)`,
          );
        }
        continue;
      }

      const targetValue = target[key];

      if (technique === undefined) {
        errors.push(`${label}/${lang}: key "${key}" missing from provenance`);
        continue;
      }

      if (!VALID_TECHNIQUES.has(technique)) {
        errors.push(
          `${label}/${lang}: key "${key}" has invalid technique "${technique}"`,
        );
        continue;
      }

      // --strict-new: a brand-new key can't be marked pre-policy — reject both
      // `stub` and `unknown` (neither is a real translation for this key yet).
      if (
        strictNew &&
        newKeys.has(key) &&
        (technique === 'stub' || technique === 'unknown')
      ) {
        errors.push(
          `${label}/${lang}: new key "${key}" has technique "${technique}" — invoke the i18n-translate Claude Code skill, or mark explicitly as verbatim / human`,
        );
      }

      // `unknown` is recorded but not judged: a pre-policy translation exempt
      // from the consistency / ship-gate / critical checks below, pending
      // conversion to a real technique.
      if (technique === 'unknown') continue;

      const isMirror = targetValue === sourceValue;
      if (isMirror && technique !== 'stub' && technique !== 'verbatim') {
        errors.push(
          `${label}/${lang}: key "${key}" mirrors source but technique is "${technique}" (expected stub or verbatim)`,
        );
      }
      if (!isMirror && !NON_MIRROR_TECHNIQUES.has(technique)) {
        errors.push(
          `${label}/${lang}: key "${key}" has translation but technique is "${technique}" (expected non-stub / non-verbatim)`,
        );
      }

      // Ship gate: a language the app actually ships (`shippedLanguages`) must
      // not contain `stub` (untranslated / English-mirror) entries — the doc's
      // "no stub" shippability rule (docs/i18n-strategy.md → Ship gate). `unknown`
      // (unaudited but translated debt) still ships; non-shipped locales are
      // unaffected — a stub there is a legitimate not-yet-shipped resting state.
      if (technique === 'stub' && (shippedLanguages || []).includes(lang)) {
        errors.push(
          `${label}/${lang}: key "${key}" is "stub" (untranslated) but "${lang}" is a shipped language — not shippable per policy (docs/i18n-strategy.md)`,
        );
      }

      const critical = isCriticalKey(key);

      // Ship-gate: under the app's tolerance, the technique must be allowed for
      // this key's criticality (docs/i18n-strategy.md table). `stub` is the
      // honest "untranslated" marker (governed by parity / --strict-new), so the
      // gate applies only to translated techniques.
      const allowedTechniques =
        TOLERANCE_TECHNIQUES[tolerance][critical ? 'critical' : 'nonCritical'];
      if (
        technique !== 'stub' &&
        allowedTechniques &&
        !allowedTechniques.has(technique)
      ) {
        errors.push(
          `${label}/${lang}: ${
            critical ? 'critical ' : ''
          }key "${key}" technique "${technique}" not permitted under "${tolerance}" policy (allowed: ${[
            ...allowedTechniques,
          ].join(', ')})`,
        );
      }

      // Critical-surface keys also need a parallel manual check: independently
      // verified (verified-critical-{lang}.json) or deliberately verbatim.
      // `stub` is exempt — an untranslated critical key is governed by the
      // stub ship-gate above (fails only in a shipped language); in a
      // not-yet-shipped locale a `stub` is a legitimate pre-translation resting
      // state (the new-language flow stubs first, then verifies critical keys).
      if (
        critical &&
        technique !== 'stub' &&
        technique !== 'verbatim' &&
        !verifiedCritical.has(key)
      ) {
        errors.push(
          `${label}/${lang}: critical key "${key}" not verified — route through the parallel manual check (docs/i18n-strategy.md) and add it to verified-critical-${lang}.json`,
        );
      }
    }
  }

  return errors;
};

// Apps that declare a ship policy.
const findApps = () => {
  const appsDir = path.join(ROOT, 'apps');
  if (!fs.existsSync(appsDir)) return [];
  return fs
    .readdirSync(appsDir)
    .map(name => ({
      name,
      policyPath: path.join(appsDir, name, 'docs/i18n/policy.json'),
    }))
    .filter(app => fs.existsSync(app.policyPath));
};

const checkApp = (app, strictNew) => {
  const policy = loadJson(app.policyPath);

  const tolerance = policy.tolerance;
  if (!Object.prototype.hasOwnProperty.call(TOLERANCE_TECHNIQUES, tolerance)) {
    return [
      `${app.name}: policy.json "tolerance" must be one of ${Object.keys(
        TOLERANCE_TECHNIQUES,
      ).join(' | ')} (got ${JSON.stringify(tolerance)})`,
    ];
  }

  const roots = rootsFromPolicy(policy);
  if (roots.length === 0) {
    return [`${app.name}: policy.json missing "translationsRoots"`];
  }

  const errors = [];
  for (const rootRel of roots) {
    // Only label with the root when the app spans more than one, to keep
    // single-root messages clean. Use the full root path — a basename like
    // "translations" is ambiguous across roots.
    const label = roots.length > 1 ? `${app.name} [${rootRel}]` : app.name;
    errors.push(
      ...checkRoot({
        label,
        tolerance,
        shippedLanguages: policy.shippedLanguages,
        rootRel,
        strictNew,
      }),
    );
  }
  return errors;
};

// Governance-adoption step: seed every source key that lacks a provenance entry
// as `unknown` in each of the root's target-locale provenance files. Existing
// entries (real techniques, or already `unknown`) are preserved — it only fills
// gaps, so it's safe to re-run. `--strict-new` is the backstop that stops a
// genuinely new key from being seeded `unknown` and slipping past the gate.
const seedUnknown = rootRel => {
  const rootAbs = path.join(ROOT, rootRel);
  const sourcePath = path.join(rootAbs, 'en.json');
  if (!fs.existsSync(sourcePath)) {
    console.error(
      `${rootRel}: source ${path.relative(ROOT, sourcePath)} not found`,
    );
    process.exit(1);
  }
  const governanceDir = governanceDirForRoot(rootAbs);
  if (!governanceDir) {
    console.error(
      `${rootRel}: no owning package (package.json) found above the root`,
    );
    process.exit(1);
  }
  const sourceKeys = Object.keys(loadJson(sourcePath));
  const targetLocales = fs
    .readdirSync(rootAbs)
    .filter(file => file.endsWith('.json'))
    .map(file => file.slice(0, -'.json'.length))
    .filter(lang => lang !== 'en');
  if (targetLocales.length === 0) {
    console.error(`${rootRel}: no target locale files ({lang}.json) found`);
    process.exit(1);
  }
  fs.mkdirSync(governanceDir, { recursive: true });
  for (const lang of targetLocales) {
    // Only seed keys that actually exist in this locale — a `unknown` entry
    // records an existing pre-policy translation, not a missing one (a source
    // key absent from the locale is a parity concern, owned by type-check).
    const target = loadJson(path.join(rootAbs, `${lang}.json`));
    const provenancePath = path.join(governanceDir, `${lang}-provenance.json`);
    const provenance = fs.existsSync(provenancePath)
      ? loadJson(provenancePath)
      : {};
    let added = 0;
    for (const key of sourceKeys) {
      if (
        Object.prototype.hasOwnProperty.call(target, key) &&
        provenance[key] === undefined
      ) {
        provenance[key] = 'unknown';
        added += 1;
      }
    }
    fs.writeFileSync(
      provenancePath,
      JSON.stringify(provenance, null, 2) + '\n',
    );
    console.log(
      `${lang}: seeded ${added} unknown entr${added === 1 ? 'y' : 'ies'} (${
        Object.keys(provenance).length
      } total) → ${path.relative(ROOT, provenancePath)}`,
    );
  }
};

const main = () => {
  const args = process.argv.slice(2);
  const seedIndex = args.indexOf('--seed-unknown');
  if (seedIndex !== -1) {
    const rootRel = args[seedIndex + 1];
    if (!rootRel) {
      console.error(
        'Usage: node scripts/check-i18n-provenance.js --seed-unknown <translations-root>',
      );
      process.exit(1);
    }
    seedUnknown(rootRel);
    return;
  }

  const strictNew = args.includes('--strict-new');
  const apps = findApps();
  if (apps.length === 0) {
    console.log('No apps with docs/i18n/policy.json found — skipping.');
    return;
  }

  let allErrors = [];
  for (const app of apps) {
    const errors = checkApp(app, strictNew);
    if (errors.length > 0) allErrors = allErrors.concat(errors);
  }

  if (allErrors.length > 0) {
    console.error('i18n provenance check FAILED:\n');
    for (const err of allErrors) console.error('  - ' + err);
    console.error(
      '\nFix: invoke the i18n-translate Claude Code skill to populate provenance correctly.',
    );
    console.error('See docs/i18n-strategy.md for the workflow.');
    process.exit(1);
  }

  const plural = apps.length === 1 ? '' : 's';
  const mode = strictNew ? ' (strict-new mode)' : '';
  console.log(
    `i18n provenance check passed for ${apps.length} app${plural}${mode}.`,
  );
};

main();
