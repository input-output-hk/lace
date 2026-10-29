// An app that depends on @laceio/cardano at the version the SDK names shares
// one copy of the Cardano domain layer with the SDK: the SDK imports it rather
// than bundling it. In an install of the built package beside the workspace's
// @laceio/cardano, each loader reads the namespaces the SDK re-exports and the
// domain layer's own, and holds them to one identity: the same objects, and a
// class instance made through either route is an instance of the other's. The
// ESM and CommonJS builds are two module graphs, so each route is held within
// its own loader.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { CHANNEL } from './channel.mjs';
import { withInstalledPackage } from './install-package.mjs';

const ADDRESS =
  'addr_test1qp0np478uj3lpl5ffk72m9t89rrgplcmxq6rz8lhk3yxeadwylevelqjsja5ucxf7kq6as840xtphdkr56t97fzhy7zqzmtjwh';
// A transaction input: the all-zero transaction id, output 0.
const INPUT_CBOR = `825820${'00'.repeat(32)}00`;

const probe = ({ sdk, root, core, util }) => `
const sdk = ${sdk};
const root = ${root};
const { Cardano, Serialization } = ${core};
const { HexBlob } = ${util};
const address = sdk.Cardano.Address.fromBech32('${ADDRESS}');
const input = Serialization.TransactionInput.fromCbor(HexBlob('${INPUT_CBOR}'));
const back = sdk.Serialization.TransactionInput.fromCbor(input.toCbor());
console.log(JSON.stringify({
  cardano: sdk.Cardano === Cardano && root.Cardano === Cardano,
  serialization: sdk.Serialization === Serialization && root.Serialization === Serialization,
  hexBlob: sdk.HexBlob === HexBlob && root.HexBlob === HexBlob,
  addressInstance: address instanceof Cardano.Address,
  inputInstance: input instanceof sdk.Serialization.TransactionInput,
  roundTrip: back instanceof Serialization.TransactionInput && back.toCbor() === '${INPUT_CBOR}',
}));
`;

const LOADERS = {
  'identity.mjs': `import * as sdkEntry from '@laceio/sdk/cardano';
import * as rootEntry from '@laceio/sdk';
import * as coreEntry from '@laceio/cardano/core';
import * as utilEntry from '@laceio/cardano/util';
${probe({
  sdk: 'sdkEntry',
  root: 'rootEntry',
  core: 'coreEntry',
  util: 'utilEntry',
})}`,
  'identity.cjs': probe({
    sdk: "require('@laceio/sdk/cardano')",
    root: "require('@laceio/sdk')",
    core: "require('@laceio/cardano/core')",
    util: "require('@laceio/cardano/util')",
  }),
};

const expected = {
  cardano: true,
  serialization: true,
  hexBlob: true,
  addressInstance: true,
  inputInstance: true,
  roundTrip: true,
};

await withInstalledPackage('lace-sdk-cardano-identity-', installDirectory => {
  for (const [file, source] of Object.entries(LOADERS)) {
    fs.writeFileSync(path.join(installDirectory, file), source);
    const run = spawnSync(process.execPath, [file], {
      cwd: installDirectory,
      encoding: 'utf8',
      timeout: 60_000,
    });
    assert.equal(run.status, 0, `${file} failed in Node:\n${run.stderr}`);
    assert.deepEqual(
      JSON.parse(run.stdout),
      expected,
      `${file}: @laceio/sdk and @laceio/cardano hold one Cardano domain layer (${CHANNEL})`,
    );
  }
});
// eslint-disable-next-line no-console -- concise build proof
console.log(
  `@laceio/sdk and @laceio/cardano share one Cardano domain layer through import and require() (${CHANNEL}): Cardano, Serialization and HexBlob are the same objects, and instances pass between them`,
);
