import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { rolldown } from 'rolldown';

import { CHANNEL } from './channel.mjs';

const packageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const entry = fileURLToPath(import.meta.resolve('@laceio/sdk/cardano'));
assert.equal(entry, path.join(packageDirectory, 'dist/cardano.js'));
for (const entryName of [
  'index.js',
  'index.cjs',
  'cardano.js',
  'cardano.cjs',
]) {
  const source = fs.readFileSync(
    path.join(packageDirectory, 'dist', entryName),
    'utf8',
  );
  // Passport accounts and custody are experimental (ADR 66): neither the root
  // nor the Cardano entry carries them in any build.
  assert.doesNotMatch(
    source,
    /passportSelectors|passportActions|createPassportAccountModule|createCardanoCustodyAccount|@midnight(?:-ntwrk|ntwrk)\/|@polkadot\//,
    `${entryName} carries Passport, custody or Midnight`,
  );
}

// Bitcoin is canary (ADR 66): no stable output file holds Bitcoin code, and
// neither the Cardano entry nor anything it imports does in any channel. The
// bundle names the source file of each module it inlines in a `//#region`
// comment, so these are the Bitcoin sources, by where they come from.
const BITCOIN_SOURCE =
  /^\/\/#region (?:src\/bitcoin\/|\S*packages\/[^/\s]+\/[^/\s]*bitcoin[^/\s]*\/|\S*node_modules\/(?:bitcoinjs-lib|@bitcoinerlab\/secp256k1)\/)\S*$/m;
const DIST_FILE_REFERENCE =
  /(?:from\s*|import\(\s*|require\(\s*)["'](\.\/[^"'/]+\.c?js)["']/g;

/** The output files an entry loads, statically or on demand, itself included. */
const reachableFiles = entryName => {
  const reached = new Set();
  const queue = [entryName];
  while (queue.length > 0) {
    const file = queue.shift();
    if (reached.has(file)) continue;
    reached.add(file);
    const code = fs.readFileSync(
      path.join(packageDirectory, 'dist', file),
      'utf8',
    );
    for (const [, specifier] of code.matchAll(DIST_FILE_REFERENCE)) {
      const reference = path.normalize(
        path.join(path.dirname(file), specifier),
      );
      if (fs.existsSync(path.join(packageDirectory, 'dist', reference))) {
        queue.push(reference);
      }
    }
  }
  return [...reached];
};

/** The Bitcoin sources the output files inline, by file. */
const bitcoinSourcesIn = files =>
  files.flatMap(file => {
    const match = BITCOIN_SOURCE.exec(
      fs.readFileSync(path.join(packageDirectory, 'dist', file), 'utf8'),
    );
    return match ? [`${file}: ${match[0]}`] : [];
  });

// The experimental sources, by where the bundle's `//#region` comments say
// they come from: the root and Cardano entries reach none of them. Custody's
// are the SDK helpers, its store (actions, selectors and the account tokens
// side effect) and its module's build and probe side effects.
const EXPERIMENTAL_SOURCE =
  /^\/\/#region (?:src\/(?:custody|passport)\/|\S*packages\/(?:module\/passport-account|contract\/passport)\/|\S*packages\/contract\/cardano-context\/src\/custody\/(?:contract|build-actions|store\/)|\S*packages\/module\/blockchain-cardano\/src\/(?:custody-|store\/custody\/(?:init|build-side-effect|creator-index-probe-side-effect)\.))\S*$/m;
// Custody's action types: a file that names one carries custody's store.
const CUSTODY_ACTION_TYPE = /["']cardanoCustody\//;
const experimentalSourcesIn = files =>
  files.flatMap(file => {
    const match = EXPERIMENTAL_SOURCE.exec(
      fs.readFileSync(path.join(packageDirectory, 'dist', file), 'utf8'),
    );
    return match ? [`${file}: ${match[0]}`] : [];
  });
assert.deepEqual(
  experimentalSourcesIn(
    ['index.js', 'index.cjs', 'cardano.js', 'cardano.cjs'].flatMap(
      reachableFiles,
    ),
  ),
  [],
  'The root or Cardano entry reaches experimental code',
);
for (const file of [
  'index.js',
  'index.cjs',
  'cardano.js',
  'cardano.cjs',
].flatMap(reachableFiles)) {
  assert.doesNotMatch(
    fs.readFileSync(path.join(packageDirectory, 'dist', file), 'utf8'),
    CUSTODY_ACTION_TYPE,
    `${file}, which the root or Cardano entry loads, carries custody's store`,
  );
}

const cardanoFiles = ['cardano.js', 'cardano.cjs'].flatMap(reachableFiles);
assert(cardanoFiles.length > 2, 'The Cardano entry imports no output files');
assert.deepEqual(
  bitcoinSourcesIn(cardanoFiles),
  [],
  'The Cardano entry reaches Bitcoin code',
);
if (CHANNEL === 'stable') {
  assert.deepEqual(
    bitcoinSourcesIn(
      fs
        .readdirSync(path.join(packageDirectory, 'dist'))
        .filter(file => /\.c?js$/.test(file)),
    ),
    [],
    'The stable build holds Bitcoin code',
  );
  for (const file of fs
    .readdirSync(path.join(packageDirectory, 'dist'))
    .filter(name => name.endsWith('.d.ts'))) {
    assert.doesNotMatch(
      fs.readFileSync(path.join(packageDirectory, 'dist', file), 'utf8'),
      /declare enum BitcoinNetwork\b|\bbitcoinProvider:/,
      `The stable ${file} declares Bitcoin types`,
    );
  }
} else {
  assert.notDeepEqual(
    bitcoinSourcesIn(['bitcoin.js', 'bitcoin.cjs'].flatMap(reachableFiles)),
    [],
    'The canary Bitcoin entry must carry the Bitcoin modules',
  );
  // The experimental entry carries the Passport and custody APIs, and no
  // Bitcoin code.
  assert.deepEqual(
    bitcoinSourcesIn(
      ['experimental.js', 'experimental.cjs'].flatMap(reachableFiles),
    ),
    [],
    'The experimental entry reaches Bitcoin code',
  );
  for (const entryName of ['experimental.js', 'experimental.cjs']) {
    const source = reachableFiles(entryName)
      .map(file =>
        fs.readFileSync(path.join(packageDirectory, 'dist', file), 'utf8'),
      )
      .join('\n');
    assert.match(
      source,
      /createPassportAccountModule/,
      `${entryName} must carry the Passport API`,
    );
    assert.match(
      source,
      /createCardanoCustodyAccount/,
      `${entryName} must carry the custody API`,
    );
    assert.match(
      source,
      CUSTODY_ACTION_TYPE,
      `${entryName} must carry custody's store`,
    );
    assert.match(
      source,
      /^\/\/#region \S*packages\/module\/blockchain-cardano\/src\/store\/custody\/build-side-effect\.ts$/m,
      `${entryName} must carry custody's side effects`,
    );
  }
}

// Bundle an actual consumer import from package exports, not source files.
// Dependencies already external in the published SDK remain external here.
const bundle = await rolldown({
  input: path.join(packageDirectory, 'test/cardano-consumer-entry.mjs'),
  external: id =>
    id !== '@laceio/sdk/cardano' && !id.startsWith('.') && !path.isAbsolute(id),
});

try {
  const { output } = await bundle.generate({ format: 'esm' });
  const modules = new Set(
    output.flatMap(chunk => Object.keys(chunk.modules ?? {})),
  );
  // The entry itself can be a pure re-export the bundler elides, so the proof
  // is where the bundled modules come from: the package output, never source.
  const fromDistributionribution = [...modules].filter(id =>
    id.startsWith(path.join(packageDirectory, 'dist') + path.sep),
  );
  assert(
    fromDistributionribution.length > 0 &&
      ![...modules].some(id =>
        id.startsWith(path.join(packageDirectory, 'src') + path.sep),
      ),
    'Cardano entry was not bundled from package exports',
  );
  assert(
    !modules.has(path.join(packageDirectory, 'dist/index.js')),
    'Root SDK entry leaked into Cardano import',
  );
  const code = output.map(chunk => chunk.code ?? '').join('\n');
  assert.match(
    code,
    /createPasskeyWalletEntity/,
    'Consumer wallet adapter missing',
  );
  assert.doesNotMatch(
    code,
    /passportSelectors|passportActions|createPassportAccountModule|@midnight(?:-ntwrk|ntwrk)\/|@polkadot\//,
    'Passport or Midnight reached the Cardano consumer bundle',
  );
  for (const moduleId of modules) {
    assert.doesNotMatch(moduleId, /(?:passport-account|contract\/passport)/);
  }
  // eslint-disable-next-line no-console -- concise build proof
  console.log(
    `Cardano consumer bundle (${CHANNEL}): ${modules.size} built modules, no Passport or Midnight runtime`,
  );
} finally {
  await bundle.close();
}

// The canary Bitcoin entry, bundled the same way, stands alone: it carries
// neither the root entry nor the Passport, Midnight or custody runtime.
if (CHANNEL === 'canary') {
  const bitcoinBundle = await rolldown({
    input: path.join(
      packageDirectory,
      'test/bitcoin-consumer-entry.canary.mjs',
    ),
    external: id =>
      id !== '@laceio/sdk/bitcoin' &&
      !id.startsWith('.') &&
      !path.isAbsolute(id),
  });
  try {
    const { output } = await bitcoinBundle.generate({ format: 'esm' });
    const modules = new Set(
      output.flatMap(chunk => Object.keys(chunk.modules ?? {})),
    );
    assert(
      [...modules].some(id =>
        id.startsWith(path.join(packageDirectory, 'dist') + path.sep),
      ),
      'Bitcoin entry was not bundled from package exports',
    );
    assert(
      !modules.has(path.join(packageDirectory, 'dist/index.js')),
      'Root SDK entry leaked into Bitcoin import',
    );
    const code = output.map(chunk => chunk.code ?? '').join('\n');
    assert.match(code, /blockchain-bitcoin/, 'Bitcoin module missing');
    assert.doesNotMatch(
      code,
      /passportSelectors|passportActions|createPassportAccountModule|createCardanoCustodyAccount|@midnight(?:-ntwrk|ntwrk)\/|@polkadot\//,
      'Passport, Midnight or custody reached the Bitcoin consumer bundle',
    );
    // eslint-disable-next-line no-console -- concise build proof
    console.log(
      `Bitcoin consumer bundle (${CHANNEL}): ${modules.size} built modules, no root entry, Passport, Midnight or custody runtime`,
    );
  } finally {
    await bitcoinBundle.close();
  }
}
