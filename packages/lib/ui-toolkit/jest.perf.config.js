/**
 * Jest island for the Reassure performance tests ONLY
 * (docs/plans/reassure-ci-two-pass.md). Unit tests in this package run
 * on Vitest (vitest.config.js); the two worlds never overlap: Vitest owns
 * test/**\/*.test.*, this config owns perf/**\/*.perf-test.*.
 *
 * This is the SHARED-component twin of packages/next/ui/jest.perf.config.js:
 * the components measured here (TokenItem, ActivityList, ...) live in
 * @lace-lib/ui-toolkit and are rendered by lace-next, lace-mobile AND
 * lace-extension, so their per-render cost is guarded once, here, at the
 * owning package — not per consumer.
 *
 * The JS/TS transform replaces jest-expo's default because the workspace's
 * root babel.config.json defines no presets (apps carry their own .babelrc);
 * this island compiles with babel-preset-expo directly, keeping the preset's
 * metro/ios caller so react-native resolves to native (not react-native-web).
 */
const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  rootDir: __dirname,
  testMatch: ['<rootDir>/perf/**/*.perf-test.[jt]s?(x)'],
  // Reassure runs each measurement 10+ times per test; on slow machines
  // (hosted 2-core CI runners) the heavy update scenarios blow past Jest's 5s
  // default. CI also passes --testTimeout because the two-pass baseline runs
  // an older config.
  testTimeout: 300_000,
  setupFiles: [
    ...expoPreset.setupFiles,
    'react-native-gesture-handler/jestSetup',
    '@shopify/flash-list/jestSetup',
  ],
  setupFilesAfterEnv: ['<rootDir>/perf/setup.perf.ts'],
  // Worklets' .native-stripping trick chained with jest-expo's resolver.
  resolver: '<rootDir>/perf/mocks/jestResolver.js',
  // jest-expo's allowlist + packages whose `react-native` main field points
  // at an untranspiled ESM build (they must go through babel too). @noble/*
  // ships pure ESM and is reached through the legacy contract barrels
  // (ui-toolkit molecules → @lace-contract/* → @lace-contract/module →
  // vendor crypto), so it must be transpiled as well.
  // d3 (+ its d3-* sub-packages and their ESM-only deps) is transpiled, not
  // stubbed: AccountCard's LineChart calls d3 at render time, so measuring the
  // home card at production fidelity requires the real library.
  // @hugeicons-pro is allowlisted because the per-icon modules mapped below
  // exist only as untranspiled ESM.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@reduxjs/toolkit|immer|redux|redux-thunk|redux-persist|reselect|react-redux|use-sync-external-store|@shopify/flash-list|@lodev09|@noble|uuid|d3|d3-.*|internmap|delaunator|robust-predicates|@hugeicons-pro))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  moduleNameMapper: {
    ...expoPreset.moduleNameMapper,
    // util-render's barrel drags the whole legacy contract store (rxjs et al)
    // into every suite, but every binding ui-toolkit calls at render time
    // lives in two pure modules — the mock re-exports the REAL
    // format-number/format-date, so PoolCard/DRepCard/NetworkInfoCard/
    // NumericInput/formatActivity measure production code.
    '^@lace-lib/util-render$': '<rootDir>/perf/mocks/utilRender.js',
    // Same barrel problem; the only runtime binding used (ActivityType) is
    // re-exported from the real dependency-free const module.
    '^@lace-contract/activities$':
      '<rootDir>/perf/mocks/laceContractActivities.js',
    // The i18n contract barrel pulls @lace-contract/module → vendor crypto
    // (@noble/* untranspiled ESM). Components only use its react-i18next
    // re-exports; delegate to the (mocked) react-i18next instead.
    '^@lace-contract/i18n$': '<rootDir>/perf/mocks/laceContractI18n.js',
    // @lace-lib/vendor is the crypto/HD seam (@cardano-sdk, bitcoinjs-lib,
    // @scure/bip32, @midnightntwrk/wallet-sdk-hd, air-gapped codecs) reached
    // transitively through the legacy contract barrels (e.g.
    // AccountSecurityAlertChip → @lace-contract/cardano-context → … → core
    // address.ts). No measured component touches it at render, and several of
    // its exports are ESM-only or unresolvable under jest-expo's resolver, so
    // cut the whole subtree here rather than transpile/resolve each dep.
    '^@lace-lib/vendor$': '<rootDir>/perf/mocks/emptyModule.js',
    // Native sheet module (initializes TurboModule bindings at import time).
    '^@lodev09/react-native-true-sheet$': '<rootDir>/perf/mocks/trueSheet.js',
    '^react-native-webview$': '<rootDir>/perf/mocks/webView.js',
    // hugeicons-pro's per-icon modules exist only under dist/esm, but the
    // exports map also offers a `require` target (dist/cjs/*.js) that is not
    // shipped, and jest-expo's resolver picks it. Map straight to the real
    // esm files so resolution never consults the exports map.
    '^@hugeicons-pro/(core-(?:solid|stroke)-rounded)/dist/esm/(.+)$':
      '<rootDir>/../../../node_modules/@hugeicons-pro/$1/dist/esm/$2.js',
  },
  transform: {
    ...expoPreset.transform,
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: ['babel-preset-expo'],
        caller: { bundler: 'metro', name: 'metro', platform: 'ios' },
      },
    ],
  },
};
