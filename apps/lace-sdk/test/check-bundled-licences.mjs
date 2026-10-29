// Fails the build when an output file inlines a package whose licence is not
// permissive: the published package is Apache-2.0 and carries no third-party
// licence texts, so such a package must stay external and come from the
// consumer's install. The pure parts are in bundled-licences.mjs, with tests.
import assert from 'node:assert/strict';
import path from 'node:path';

import { licenceViolations } from './bundled-licences.mjs';
import { packageDirectory } from './install-package.mjs';

const distributionDirectory = path.join(
  packageDirectory,
  process.env.DIST_DIR ?? 'dist',
);
// rolldown writes the markers' paths relative to the package directory.
const { count, violations } = licenceViolations(
  distributionDirectory,
  packageDirectory,
);
assert.equal(
  violations.length,
  0,
  `The output bundles code under a licence the package cannot carry; keep these packages external:\n  ${violations.join(
    '\n  ',
  )}`,
);
// eslint-disable-next-line no-console -- the build's progress line
console.log(
  `Bundled third-party packages: ${count}, all under permissive licences`,
);
