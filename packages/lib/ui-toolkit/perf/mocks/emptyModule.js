/**
 * Inert stand-in for ESM-only packages that Jest cannot require and that the
 * perf tests never exercise (e.g. d3 behind ui-toolkit's line-chart). Any
 * property access yields a callable that returns a chainable no-op proxy, so
 * incidental module-level usage doesn't crash.
 */
const noop = new Proxy(() => {}, {
  apply: () => noop,
  get: (target, property) => {
    if (property === '__esModule') return true;
    if (property === Symbol.toPrimitive) return () => '';
    return noop;
  },
});

module.exports = noop;
