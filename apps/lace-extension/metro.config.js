const path = require('path');

const { withNxMetro } = require('@nx/expo');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { mergeConfig } = require('metro-config');
const defaultConfig = getSentryExpoConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..'); // Adjust if needed*/

/** Used to detect expo running or building for web
 * allows preference to be taken for .web.tsx components */
const isWebContext = true;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: 'lace-extension',
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
        inlineRequires: true,
      },
    }),
    unstable_allowRequireContext: true,
  },
  resolver: {
    blockList: [/.*\.scss$/, /.*\.sass$/], // Ignore .scss files,
    assetExts: assetExts.filter(
      extension =>
        extension !== 'svg' && //loaded via react-native-svg only
        extension !== 'scss' && // exclude scss as not used in lace-mobile
        extension !== 'sass', //  exclude sass as not used in lace-mobile
    ),
    sourceExts: [
      ...sourceExts,
      isWebContext ? 'web.tsx' : 'tsx',
      'cjs',
      'mjs',
      'svg',
    ],
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    extraNodeModules: {
      'get-port-please': require.resolve('empty-module'),
      net: require.resolve('empty-module'),
      fs: require.resolve('empty-module'),
      os: require.resolve('empty-module'),
      path: require.resolve('empty-module'),
      dns: require.resolve('empty-module'),
      tls: require.resolve('empty-module'),
      child_process: require.resolve('empty-module'),
      perf_hooks: require.resolve('empty-module'),
      // buffer: require.resolve('@craftzdog/react-native-buffer'),
      // crypto: require.resolve('react-native-quick-crypto'),
      stream: require.resolve('readable-stream'),
    },
  },
};

const withNxMetroResult = withNxMetro(
  mergeConfig(defaultConfig, customConfig),
  {
    // Change this to true to see debugging info.
    // Useful if you have issues resolving modules
    debug: true,
    // all the file extensions used for imports other than 'ts', 'tsx', 'js', 'jsx', 'json'
    extensions: [],
    // Specify folders to watch, in addition to Nx defaults (workspace libraries and node_modules)
    watchFolders: [workspaceRoot],
  },
);

const patchNxConfig = nxConfig => {
  const nxResolver = nxConfig.resolver.resolveRequest.bind(nxConfig.resolver);
  nxConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    if (
      moduleName === './RCTNetworking' ||
      moduleName === 'react-native/Libraries/Network/RCTNetworking' ||
      moduleName.includes('Utilities/BackHandler') ||
      moduleName.includes('Utilities/Platform') ||
      moduleName.includes('PlatformColorValueTypes') ||
      moduleName.includes('BaseViewConfig') ||
      moduleName.includes('legacySendAccessibilityEvent')
    ) {
      return { type: 'empty' };
    }
    if (moduleName.startsWith('node:')) {
      return nxResolver(context, moduleName.replace('node:', ''), platform);
    }
    if (moduleName.endsWith('.scss') || moduleName.endsWith('.sass')) {
      return { type: 'empty' }; // Exclude styling entirely
    }
    // Stub the WASM-backed cip8 helpers in @cardano-sdk/key-management that
    // import @emurgo/cardano-message-signing-nodejs (fails to init in Metro).
    // The pure-TS cip8/coseUtils.js helpers we actually use stay reachable.
    if (
      context.originModulePath.includes('@cardano-sdk/key-management/dist') &&
      (moduleName === './util.js' ||
        moduleName === './cip30signData.js' ||
        moduleName === './util' ||
        moduleName === './cip30signData')
    ) {
      return { type: 'empty' };
    }
    // Exclude @effect/platform's HttpApiScalar module - it contains a CDN reference to
    // @scalar/api-reference (cdn.jsdelivr.net) that violates Chrome Web Store MV3 policy
    // which prohibits remotely hosted code. HttpApiScalar is server-side API docs tooling
    // with no role in a browser extension bundle.
    // Dependency chain: blockchain-midnight → wallet-sdk-facade → wallet-sdk-capabilities
    //   → wallet-sdk-prover-client → @effect/platform → HttpApiScalar (CDN reference)
    if (
      moduleName.includes('HttpApiScalar') &&
      context.originModulePath.includes('@effect/platform')
    ) {
      return { type: 'empty' };
    }
    // Exclude midnight sdk packages
    const midnightBlackList = [
      './workaround-for-importing-midnight-ledger',
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/wallet-sdk-indexer-client',
      '@midnight-ntwrk/wallet-sdk-node-client',
      '@midnight-ntwrk/wallet-sdk-runtime',
      '@midnight-ntwrk/wallet-sdk-shielded',
      '@midnight-ntwrk/wallet-sdk-utilities',
      '@midnight-ntwrk/onchain-runtime-v3',
    ];
    if (midnightBlackList.some(name => moduleName.startsWith(name))) {
      return { type: 'empty' };
    }
    // Load feature-flags.override instead if it exists
    if (
      moduleName.includes('feature-flags') ||
      moduleName.endsWith('feature-flags')
    ) {
      const fs = require('fs');

      // Check if the actual override file exists
      const overridePath = path.resolve(
        projectRoot,
        'src',
        'app',
        'feature-flags.override.ts',
      );

      const exists = fs.existsSync(overridePath);

      if (exists) {
        // Use override file if it exists
        return { type: 'sourceFile', filePath: overridePath };
      }
    }
    return nxResolver(context, moduleName, platform);
  };
  return nxConfig;
};

module.exports =
  typeof withNxMetroResult?.then === 'function'
    ? withNxMetroResult.then(patchNxConfig)
    : patchNxConfig(withNxMetroResult);
