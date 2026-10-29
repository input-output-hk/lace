import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const UPSTREAM_REPOSITORY = 'https://github.com/midnightntwrk/passport';
const UPSTREAM_CONTRACT = 'contract/contracts/account.compact';

const inventoryFile = path.resolve(
  import.meta.dirname,
  '../src/acc/artefact-inventory.json',
);

const COMMIT = /^[0-9a-f]{40}$/;

/**
 * Parses a bundle-relative path into the circuit and artefact it holds,
 * following the layout the artefact loader fetches: `zkir/<name>.bzkir`,
 * `keys/<name>.prover` and `keys/<name>.verifier`.
 */
const parseArtefactPath = file => {
  const match =
    /^zkir\/(?<zkir>[^/]+)\.bzkir$|^keys\/(?<key>[^/]+)\.(?<kind>prover|verifier)$/.exec(
      file,
    );
  if (!match?.groups) return undefined;
  const { zkir, key, kind } = match.groups;
  return zkir === undefined
    ? { circuit: key, artefact: kind }
    : { circuit: zkir, artefact: 'zkir' };
};

/**
 * Builds the inventory of an artefact bundle from the byte size and sha256
 * of every artefact file in it, keyed by bundle-relative path. Every
 * circuit is listed once, sorted by name, with its circuit IR, prover key
 * and verifier key, so a bundle missing any one of the three, or holding a
 * key for a circuit with no IR, fails instead of producing a partial record.
 */
export const buildInventory = ({ commit, toolchain, digests }) => {
  const circuits = {};
  for (const [file, digest] of Object.entries(digests)) {
    const parsed = parseArtefactPath(file);
    if (!parsed) throw new Error(`Not an artefact path: ${file}`);
    circuits[parsed.circuit] ??= {};
    circuits[parsed.circuit][parsed.artefact] = digest;
  }
  const sorted = {};
  for (const name of Object.keys(circuits).sort()) {
    const entry = circuits[name];
    for (const artefact of ['zkir', 'prover', 'verifier']) {
      if (!entry[artefact])
        throw new Error(`Circuit ${name} has no ${artefact} artefact`);
    }
    sorted[name] = {
      zkir: entry.zkir,
      prover: entry.prover,
      verifier: entry.verifier,
    };
  }
  return {
    repository: UPSTREAM_REPOSITORY,
    contract: UPSTREAM_CONTRACT,
    commit,
    toolchain,
    circuits: sorted,
  };
};

/** Streams one file so a prover key is never held in memory whole. */
const digestFile = async file => {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(file)) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { bytes, sha256: hash.digest('hex') };
};

/** Digests of the artefact files under the bundle's zkir/ and keys/. */
const bundleDigests = async bundle => {
  const digests = {};
  for (const directory of ['zkir', 'keys']) {
    for (const name of await readdir(path.join(bundle, directory))) {
      const file = `${directory}/${name}`;
      if (!parseArtefactPath(file)) continue;
      digests[file] = await digestFile(path.join(bundle, file));
    }
  }
  return digests;
};

/**
 * The toolchain pins the compiler wrote into the bundle's
 * `compiler/contract-info.json`, under the key names `accManifest` uses.
 */
const bundleToolchain = async bundle => {
  const info = JSON.parse(
    await readFile(path.join(bundle, 'compiler/contract-info.json'), 'utf8'),
  );
  return {
    compactc: info['compiler-version'],
    language: info['language-version'],
    runtime: info['runtime-version'],
  };
};

const usage =
  'usage: inventory-artefacts.mjs <bundle-directory> --commit <upstream sha> [--check]\n';

const run = async () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      commit: { type: 'string' },
      check: { type: 'boolean', default: false },
    },
  });
  const [bundle] = positionals;
  if (!bundle || positionals.length > 1 || !COMMIT.test(values.commit ?? '')) {
    process.stderr.write(usage);
    process.exitCode = 2;
    return;
  }
  const inventory = buildInventory({
    commit: values.commit,
    toolchain: await bundleToolchain(bundle),
    digests: await bundleDigests(bundle),
  });
  const serialized = `${JSON.stringify(inventory, null, 2)}\n`;
  if (values.check) {
    const committed = await readFile(inventoryFile, 'utf8');
    if (committed !== serialized) {
      process.stderr.write(
        `${path.basename(inventoryFile)} does not match ${bundle}\n`,
      );
      process.exitCode = 1;
    }
    return;
  }
  await writeFile(inventoryFile, serialized);
  process.stdout.write(
    `${
      Object.keys(inventory.circuits).length
    } circuits written to ${inventoryFile}\n`,
  );
};

const isExecutedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isExecutedDirectly) await run();
