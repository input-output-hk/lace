/**
 * Webpack-only shim for `expo-asset` used by shared modules.
 *
 * The real `expo-asset` depends on React Native internals that ship Flow types
 * (e.g. `@react-native/assets-registry`), which break our webpack build because
 * we don't transpile most of `node_modules`.
 *
 * This shim implements the small surface area we need in the browser extension:
 * `Asset.fromModule(...)` returning an object with `uri` and `localUri`.
 */
class Asset {
  /**
   * @param {unknown} mod - Webpack asset module (usually a URL string)
   * @returns {{ uri: string; localUri?: string }}
   */
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  static fromModule(module_) {
    // In webpack builds, imported/required assets are typically emitted as URL strings.
    if (typeof module_ === 'string') {
      return { uri: module_, localUri: module_ };
    }

    // Some loaders might wrap in `{ default: url }`.
    if (
      module_ &&
      typeof module_ === 'object' &&
      typeof module_.default === 'string'
    ) {
      return { uri: module_.default, localUri: module_.default };
    }

    // Fallback: return empty URIs so callers can handle gracefully.
    return { uri: '', localUri: '' };
  }
}

module.exports = { Asset };
