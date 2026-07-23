#!/usr/bin/env node
// ADR-37 first-party purity guard for the host's SOURCE-shared libraries.
//
// @lace-lib/core is admitted into the privileged host's dependency closure as
// SOURCE (docs/adr/37-host-supply-chain-isolation.md).
// For the ONLY external code in the privileged bundle to be the audited
// @lace-lib/vendor artifact, this lib must stay 100% first-party: every module
// it imports (or exports-from) must be relative or another @lace-lib/* package, and
// every SHIPPED dependency it declares must be @lace-lib/*. Externals — including
// transitive ones — enter the host ONLY through the @lace-lib/vendor seam, which
// re-exports the audited surface (the @cardano-sdk crypto/derivation, plus `buffer`
// and type-fest's `Tagged`).
//
// Reliance on an external runtime GLOBAL (e.g. a bare `Buffer`/`process` with no
// import) is caught separately by `no-restricted-globals` in each lib's eslint config
// — this script polices declared deps + module specifiers; eslint polices globals.
//
// devDependencies are intentionally NOT checked: they never ship and never enter the
// host closure (the host re-vendors core/api from their published `files`, not devDeps).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const LIBS = ['packages/lib/core'];
const FIRST_PARTY = /^@lace-lib\//;
const RELATIVE = /^\./;
const SHIPPED_DEP_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
];

// Module specifiers in: `… from '<x>'` (import/export), bare side-effect `import '<x>'`,
// dynamic `import('<x>')`, and `require('<x>')`.
const SPECIFIER_PATTERNS = [
  /\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]/g,
];

const isAllowed = spec => FIRST_PARTY.test(spec) || RELATIVE.test(spec);

const collectTsFiles = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) collectTsFiles(path, out);
    else if (/\.tsx?$/.test(path)) out.push(path);
  }
  return out;
};

const problems = [];

for (const lib of LIBS) {
  const libDir = resolve(repoRoot, lib);

  // (1) every SHIPPED dependency must be first-party
  const pkg = JSON.parse(readFileSync(join(libDir, 'package.json'), 'utf8'));
  for (const field of SHIPPED_DEP_FIELDS) {
    for (const dep of Object.keys(pkg[field] ?? {})) {
      if (!FIRST_PARTY.test(dep)) {
        problems.push(
          `${lib}/package.json: ${field} "${dep}" is not @lace-lib/* — ` +
            `route it through the @lace-lib/vendor seam`,
        );
      }
    }
  }

  // (2) every src import/export specifier must be first-party or relative
  for (const file of collectTsFiles(join(libDir, 'src'))) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(repoRoot, file);
    for (const pattern of SPECIFIER_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (!isAllowed(match[1])) {
          problems.push(
            `${rel}: imports "${match[1]}" — only @lace-lib/* + relative are ` +
              `allowed; route externals through the @lace-lib/vendor seam`,
          );
        }
      }
    }
  }
}

if (problems.length > 0) {
  console.error('\n❌ shared-lib first-party purity check FAILED (ADR 37)\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    '\n  @lace-lib/core must contain ONLY first-party code; every external ' +
      '(incl transitive) enters the closure through the @lace-lib/vendor seam.\n',
  );
  process.exit(1);
}

console.log('[check-shared-lib-purity] core is 100% first-party (ADR 37) ✓');
