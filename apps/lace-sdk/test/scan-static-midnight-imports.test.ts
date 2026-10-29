import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import {
  findStaticMidnightImports,
  packageRequireClosure,
  undeclaredPackageRequires,
} from '../src/scan-static-midnight-imports';

it('finds Midnight through Cardano ESM and CJS static chunks, not dynamic chunks', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lace-sdk-scan-'));
  try {
    fs.writeFileSync(
      path.join(directory, 'cardano.js'),
      "import './static.js';\nimport('./dynamic.js');\n",
    );
    fs.writeFileSync(
      path.join(directory, 'static.js'),
      "export { value } from '@midnight-ntwrk/compact-runtime';\n",
    );
    fs.writeFileSync(
      path.join(directory, 'dynamic.js'),
      "import '@polkadot/api';\n",
    );
    fs.writeFileSync(
      path.join(directory, 'cardano.cjs'),
      "const chunk = require('./static.cjs');\nPromise.resolve().then(() => require('./dynamic.cjs'));\n",
    );
    fs.writeFileSync(
      path.join(directory, 'static.cjs'),
      "require('@midnightntwrk/wallet-sdk');\n",
    );
    fs.writeFileSync(
      path.join(directory, 'dynamic.cjs'),
      "require('@polkadot/api');\n",
    );

    expect(findStaticMidnightImports(directory, 'cardano.js')).toEqual([
      'static.js: static import of "@midnight-ntwrk/compact-runtime"',
    ]);
    expect(findStaticMidnightImports(directory, 'cardano.cjs')).toEqual([
      'static.cjs: static import of "@midnightntwrk/wallet-sdk"',
    ]);
    // The import-only check follows the lazy chunks as well, since the engine
    // may sit behind one; the imports it reports are still the static ones.
    expect(
      findStaticMidnightImports(directory, 'cardano.js', { lazyChunks: true }),
    ).toEqual([
      'static.js: static import of "@midnight-ntwrk/compact-runtime"',
      'dynamic.js: static import of "@polkadot/api"',
    ]);
    expect(
      findStaticMidnightImports(directory, 'cardano.cjs', { lazyChunks: true }),
    ).toEqual([
      'static.cjs: static import of "@midnightntwrk/wallet-sdk"',
      'dynamic.cjs: static import of "@polkadot/api"',
    ]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

it('names every package a CommonJS closure requires or imports, static and lazy, by package', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lace-sdk-closure-'));
  try {
    fs.writeFileSync(
      path.join(directory, 'midnight.cjs'),
      "const chunk = require('./static.cjs');\nPromise.resolve().then(() => require('./lazy.cjs'));\nrequire('rxjs');\n",
    );
    fs.writeFileSync(
      path.join(directory, 'static.cjs'),
      "require('@midnight-ntwrk/ledger-v8');\nrequire('node:crypto');\n",
    );
    fs.writeFileSync(
      path.join(directory, 'lazy.cjs'),
      "import('@polkadot/api-base/types/errors');\nrequire('lodash/isEqual.js');\n",
    );
    const closure = packageRequireClosure(directory, 'midnight.cjs');
    expect([...closure.keys()].sort()).toEqual([
      '@midnight-ntwrk/ledger-v8',
      '@polkadot/api-base',
      'lodash',
      'node:crypto',
      'rxjs',
    ]);
    expect([...closure.get('@polkadot/api-base')!]).toEqual(['lazy.cjs']);
    // The build refuses a package in that closure that package.json does not
    // declare, naming the file that requires it; built-ins never count.
    const declared = {
      rxjs: '^7',
      lodash: '^4',
      '@midnight-ntwrk/ledger-v8': '8.1.0',
    };
    expect(
      undeclaredPackageRequires(directory, 'midnight.cjs', declared),
    ).toEqual(['@polkadot/api-base (lazy.cjs)']);
    expect(
      undeclaredPackageRequires(directory, 'midnight.cjs', {
        ...declared,
        '@polkadot/api-base': '^16',
      }),
    ).toEqual([]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

it('names every package an ESM closure imports, static and lazy, by package', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lace-sdk-closure-'));
  try {
    fs.writeFileSync(
      path.join(directory, 'experimental.js'),
      "import { a } from './static.js';\nimport('./lazy.js');\nimport('@midnightntwrk/wallet-sdk-facade');\n",
    );
    fs.writeFileSync(
      path.join(directory, 'static.js'),
      "import { b } from '@midnightntwrk/ledger-v9';\nimport 'node:crypto';\nexport { c } from 'rxjs';\n",
    );
    fs.writeFileSync(
      path.join(directory, 'lazy.js'),
      "/**\n * @example\n```js\nimport * as bip39 from '@scure/bip39';\n```\n */\nimport { d } from '@midnight-ntwrk/compact-runtime';\n",
    );
    expect(
      undeclaredPackageRequires(directory, 'experimental.js', { rxjs: '^7' }),
    ).toEqual([
      '@midnightntwrk/wallet-sdk-facade (experimental.js)',
      '@midnightntwrk/ledger-v9 (static.js)',
      '@midnight-ntwrk/compact-runtime (lazy.js)',
    ]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
