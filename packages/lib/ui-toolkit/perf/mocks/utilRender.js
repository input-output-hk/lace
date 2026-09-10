/**
 * Production-fidelity mock of @lace-lib/util-render for the perf island. The
 * real package's barrel drags the legacy contract store (rxjs,
 * @lace-contract/module) that no measured component exercises — but every
 * util-render binding ui-toolkit calls at render time lives in the two pure
 * modules re-exported here (BigNumber.js / dayjs only): compactNumberWithUnit
 * (PoolCard), formatAmountToLocale (DRepCard, EpochsRewards), formatEpochEnd
 * (NetworkInfoCard), convertAmountTo* (NumericInput), formatRawToLocale
 * (AssetsSection), formatAmountRawToDenominated/formatDate/formatTime
 * (formatActivity). Measured cost = the real production code, not a stub.
 *
 * Every other binding (LaceView, hooks, ...) falls back to emptyModule's
 * chainable no-op proxy: the barrel-load graph touches them at import time
 * but no measured code calls them.
 */
const noop = require('./emptyModule');

const real = {
  ...require('../../../util-render/src/format-number'),
  ...require('../../../util-render/src/format-date'),
};

module.exports = new Proxy(real, {
  get: (target, property) =>
    property in target ? target[property] : noop[property],
});
