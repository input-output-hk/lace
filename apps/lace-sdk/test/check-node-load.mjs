// Isolated Node loaders exercise offline Bitcoin and canary Midnight
// initialization, and the experimental entry's custody keys, Passport
// factories and MIP-0015 secrets; the root and Cardano entries load without
// the experimental APIs, and on stable neither loader resolves a canary-only
// entry.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { CANARY_ONLY_ENTRIES } from '../scripts/entries.mjs';

import { CHANNEL } from './channel.mjs';
import {
  manifest,
  packageDirectory,
  withInstalledPackage,
} from './install-package.mjs';

// The words of the words-based signing fixtures, their testnet custody
// account key, and device key 0 of that account.
const WORDS =
  'fame coconut utility print giraffe common twin evil alone exclude great echo since cart erode noise icon repair amused drip awake coral hat unveil'.split(
    ' ',
  );
const CUSTODY_XPUB =
  '5daf833bb597b987983984cbf950f81fc274a038574e4bf52d00433dbc11efd183ab5e43da8fd700e7c32e17b25f30e904e30da92501456943d5f8f041d769a4';
const DEVICE_0_KEY_HASH =
  'c673124ca3922223ff8e522559f25e2236f5294b0a486a55833d55dc';
// The account validator of the custody contract the SDK pins.
const ACCOUNT_VALIDATOR_HASH =
  'ed61963ac94d12c0b320be5a336c36af66bc02c380e0aa3001899253';
const PREPROD = { networkId: 0, networkMagic: 1 };

// Only `self` decides the outcome: Node has no `window`, and libsodium looks
// for `self` before it falls back to the `crypto` module. The local device
// key request derives the key from words, which also needs `createHash` and
// pbkdf2 in the CommonJS output and a real `global` in the ESM output.
const experimentalProbe = load => `
if (typeof self !== 'undefined') throw new Error('globalThis.self is set');
(async () => {
  const sdk = ${load};
  const device = await sdk.deriveCardanoCustodyDevice('${CUSTODY_XPUB}', 0);
  const fromWords = await sdk.requestCardanoCustodyDeviceKey({
    mode: 'local',
    keySource: {
      credentialRef: () => ({
        credentialId: 'node-load',
        rpId: 'localhost',
        recipeVersion: 'v1',
      }),
      withPasskeyMnemonic: use => use(${JSON.stringify(WORDS)}),
    },
    chainId: ${JSON.stringify(PREPROD)},
  });
  console.log(JSON.stringify({
    accountValidatorHash: sdk.CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASH,
    keyHash: device.keyHash,
    wordsAccountKey: fromWords.extendedAccountPublicKey,
    wordsKeyHash: fromWords.device.keyHash,
    createPassportAccountModule: typeof sdk.m.createPassportAccountModule,
    symmetricSecretLength: sdk.deriveSymmetricSecret(new Uint8Array(64), {
      domain: 'node-load',
      context: 'probe',
    }).length,
  }));
})();
`;

const cardanoProbe = load => `
(async () => {
  const sdk = ${load};
  console.log(JSON.stringify({
    createLaceWallet: typeof sdk.createLaceWallet,
    createCardanoCustodyAccount: typeof sdk.createCardanoCustodyAccount,
    createPassportAccountModule: typeof sdk.m.createPassportAccountModule,
    deriveSymmetricSecret: typeof sdk.deriveSymmetricSecret,
  }));
})();
`;
const cardanoExpected = {
  createLaceWallet: 'function',
  createCardanoCustodyAccount: 'undefined',
  createPassportAccountModule: 'undefined',
  deriveSymmetricSecret: 'undefined',
};

// The BIP-39 test vector's words, and the BIP-84 mainnet account 0 key they
// derive, in xpub encoding.
const BITCOIN_WORDS =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'.split(
    ' ',
  );
const BITCOIN_NATIVE_SEGWIT_KEY =
  'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V';

const bitcoinProbe = load => `
(async () => {
  const sdk = ${load};
  const featureFlags = [
    { key: sdk.BITCOIN_FEATURE_FLAG },
    { key: sdk.BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG },
    { key: sdk.FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
  ];
  const wallet = await sdk.createLaceWallet({
    modules: [
      sdk.m.featureDev,
      sdk.m.storageInMemory,
      sdk.m.blockchainBitcoin,
      sdk.m.bitcoinProviderMaestro,
      sdk.m.bitcoinMempoolFeeMarket,
    ],
    environment: 'development',
    featureFlags,
    config: {
      defaultFeatureFlags: featureFlags,
      extraFeatureFlags: [],
      bitcoinProvider: {
        tipPollFrequency: 60000,
        historyDepth: 20,
        maestroConfig: {},
      },
      bitcoinFeeMarketProvider: { mempoolSpaceConfig: {} },
    },
  });
  const entity = await sdk.createInMemoryWalletEntity(wallet, {
    mnemonicWords: ${JSON.stringify(BITCOIN_WORDS)},
    walletName: 'node-load',
  });
  const mainnet = entity.accounts.find(
    account =>
      account.blockchainNetworkId ===
      sdk.BitcoinNetworkId(sdk.BitcoinNetwork.Mainnet),
  );
  console.log(JSON.stringify({
    type: entity.type,
    nativeSegWitKey: mainnet.blockchainSpecific.extendedAccountPublicKeys.nativeSegWit,
  }));
})();
`;

const stableBitcoinProbe = load => `
(async () => {
  const sdk = ${load};
  console.log(JSON.stringify({
    exports: Object.keys(sdk).filter(name => name !== 'default'),
  }));
})();
`;

// Derive the finite runtime roster from the public entry so new exports must
// also survive both installed Node loaders.
const midnightSource = ts.createSourceFile(
  'midnight.ts',
  fs.readFileSync(path.join(packageDirectory, 'src/midnight.ts'), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
const midnightRuntimeExports = midnightSource.statements.flatMap(statement => {
  if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) return [];
  const clause = statement.exportClause;
  if (!clause) return [];
  return ts.isNamedExports(clause)
    ? clause.elements
        .filter(element => !element.isTypeOnly)
        .map(element => element.name.text)
    : [clause.name.text];
});
const midnightProbe = load => `
if (typeof self !== 'undefined' || typeof window !== 'undefined') throw new Error('Browser globals are set');
(async () => {
  const assert = (await import('node:assert/strict')).default;
  const net = await import('node:net');
  const { syncBuiltinESMExports } = await import('node:module');
  const { firstValueFrom, filter, timeout } = await import('rxjs');
  const networkAttempts = [];
  const denyNetwork = () => {
    networkAttempts.push('network access attempted');
    throw new Error('The empty Midnight wallet must initialize offline');
  };
  net.Socket.prototype.connect = denyNetwork;
  globalThis.fetch = denyNetwork;
  globalThis.WebSocket = class { constructor() { denyNetwork(); } };
  syncBuiltinESMExports();
  const sdk = ${load};
  const module = sdk.createMidnightModule({
    password: new Uint8Array(),
  });
  const featureFlags = [
    { key: sdk.FEATURE_FLAG_MIDNIGHT },
    { key: sdk.FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
  ];
  const wallet = await sdk.createLaceWallet({
    modules: [sdk.m.featureDev, sdk.m.storageInMemory, module],
    environment: 'development',
    featureFlags,
    config: {
      defaultFeatureFlags: featureFlags,
      extraFeatureFlags: [],
      defaultMidnightTestnetNetworkId: sdk.MidnightSDKNetworkIds.Preview,
    },
  });
  const currentNetwork = await firstValueFrom(
    wallet.stateObservables.midnightContext.selectCurrentNetwork$.pipe(
      filter(network => network?.config.nodeAddress === sdk.MIDNIGHT_PREVIEW_NODE_URL),
      timeout(5000),
    ),
  );
  assert.deepEqual(wallet.getState().wallets.ids, []);
  assert.equal(currentNetwork.networkId, sdk.MidnightSDKNetworkIds.Preview);
  const integrations = await wallet._loadModules('addons.loadInMemoryWalletIntegration');
  assert(integrations.some(integration => integration.blockchainName === 'Midnight'));
  // Deriving an account runs the wallet SDK's HD derivation, which the
  // CommonJS output bundles; no network is needed.
  const password = new TextEncoder().encode('node-load');
  const entity = await sdk.createInMemoryWalletEntity(wallet, {
    mnemonicWords: ${JSON.stringify(WORDS)},
    password,
    walletName: 'node-load',
  });
  const isMidnight = account => account.blockchainName === 'Midnight';
  const derived = await sdk.createMidnightAccounts(wallet, {
    wallet: entity,
    accountIndex: 1,
    password,
    targetNetworks: new Set([sdk.MidnightNetworkId(sdk.MidnightSDKNetworkIds.Preview)]),
  });
  const before = entity.accounts.filter(isMidnight).length;
  const midnightAccounts = derived.accounts.filter(isMidnight);
  assert.equal(midnightAccounts.length, before + 1, 'one Preview account derived at index 1');
  const midnightAccount = midnightAccounts.find(account => !entity.accounts.includes(account));
  process.once('beforeExit', () => {
    assert.deepEqual(networkAttempts, []);
  });
  console.log(JSON.stringify({
    publicExportsPresent: ${JSON.stringify(
      midnightRuntimeExports,
    )}.every(name => sdk[name] !== undefined),
    privateEngineExposed: 'midnightWalletFor' in sdk || 'withMidnightWallet' in sdk,
    moduleName: module.moduleName,
    loads: module.feature.willLoad([{ key: sdk.FEATURE_FLAG_MIDNIGHT }], 'production'),
    emptyWalletInitialized: true,
    derivedAccountId: midnightAccount.accountId,
    preview: sdk.MidnightSDKNetworkIds.Preview,
    nodeUrl: sdk.MIDNIGHT_PREVIEW_NODE_URL,
  }));
})();
`;
const probes = {
  [`${manifest.name}/cardano`]: {
    probeFor: cardanoProbe,
    expected: cardanoExpected,
  },
  [manifest.name]: { probeFor: cardanoProbe, expected: cardanoExpected },
  [`${manifest.name}/bitcoin`]:
    CHANNEL === 'canary'
      ? {
          probeFor: bitcoinProbe,
          expected: {
            type: 'LazyInMemory',
            nativeSegWitKey: BITCOIN_NATIVE_SEGWIT_KEY,
          },
        }
      : { probeFor: stableBitcoinProbe, expected: { exports: [] } },
  ...(CHANNEL === 'canary' && {
    [`${manifest.name}/experimental`]: {
      probeFor: experimentalProbe,
      expected: {
        accountValidatorHash: ACCOUNT_VALIDATOR_HASH,
        keyHash: DEVICE_0_KEY_HASH,
        wordsAccountKey: CUSTODY_XPUB,
        wordsKeyHash: DEVICE_0_KEY_HASH,
        createPassportAccountModule: 'function',
        symmetricSecretLength: 32,
      },
    },
  }),
};

if (CHANNEL === 'canary') {
  probes[`${manifest.name}/midnight`] = {
    probeFor: midnightProbe,
    expected: {
      publicExportsPresent: true,
      privateEngineExposed: false,
      moduleName: 'midnight-sync',
      loads: true,
      emptyWalletInitialized: true,
      // Account 1 of the words above on Preview: the id the bundled wallet
      // SDK derives through HD derivation.
      derivedAccountId: 'e7749704bca9f05970280f63ad16f53e-mn-1-preview',
      preview: 'preview',
      nodeUrl: 'https://rpc.preview.midnight.network',
    },
  };
}
// The stable package does not declare a canary-only entry, so loading one
// fails as loading any undeclared subpath does.
const absentProbe = load => `
(async () => {
  try {
    ${load};
    console.log(JSON.stringify({ code: 'loaded' }));
  } catch (error) {
    console.log(JSON.stringify({ code: error.code }));
  }
})();
`;
for (const { name } of CANARY_ONLY_ENTRIES) {
  const specifier = `${manifest.name}/${name}`;
  if (CHANNEL === 'stable') {
    probes[specifier] = {
      probeFor: absentProbe,
      expected: { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' },
    };
  } else {
    assert(specifier in probes, `No Node load probe for ${specifier}`);
  }
}

const specifiers = Object.keys(probes);
await withInstalledPackage('lace-sdk-node-load-', installDirectory => {
  for (const specifier of specifiers) {
    const { probeFor, expected } = probes[specifier];
    const entryProbes = {
      'probe.mjs': probeFor(`await import('${specifier}')`),
      'probe.cjs': probeFor(`require('${specifier}')`),
    };
    for (const [file, source] of Object.entries(entryProbes)) {
      fs.writeFileSync(path.join(installDirectory, file), source);
      const run = spawnSync(process.execPath, [file], {
        cwd: installDirectory,
        encoding: 'utf8',
        timeout: 60_000,
      });
      assert.equal(
        run.status,
        0,
        `${file} failed to load ${specifier} in Node:\n${run.stderr}`,
      );
      assert.deepEqual(
        JSON.parse(run.stdout),
        expected,
        `${file} loading ${specifier} (${CHANNEL})`,
      );
    }
  }
});
// eslint-disable-next-line no-console -- concise build proof
console.log(
  `Node ${process.version}: ${specifiers.join(
    ', ',
  )} load through import and require() (${CHANNEL}${
    CHANNEL === 'canary'
      ? ', deriving custody device keys, a MIP-0015 secret and Bitcoin accounts'
      : ', without custody, Bitcoin or a canary-only entry'
  })`,
);
