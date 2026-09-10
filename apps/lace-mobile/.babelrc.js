module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // @lace-* packages resolve via node_modules symlinks + package `exports`
    // (Metro `unstable_enablePackageExports`), so no module-resolver aliases are
    // needed. The aliases also rewrote export-subpath imports (e.g.
    // `@lace-lib/util-hw/mobile`) to relative paths that bypass the `exports` map
    // and fail to resolve, so they are intentionally omitted.
    plugins: ['react-native-reanimated/plugin'],
  };
};
