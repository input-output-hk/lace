/**
 * Mock of @lace-contract/activities for the perf island. The real barrel
 * pulls @lace-contract/module and its store, which no measured code
 * exercises. The only runtime binding ui-toolkit calls is the ActivityType
 * enum (utils/formatActivity) — re-exported here from the real, dependency-
 * free const module so formatting is measured against production values.
 *
 * Everything else (activitiesSelectors et al, dereferenced at import time by
 * cardano-context in the barrel-load graph) falls back to emptyModule's
 * chainable no-op proxy, as before.
 */
const real = require('../../../../contract/activities/src/const');

const noop = require('./emptyModule');

module.exports = new Proxy(real, {
  get: (target, property) =>
    property in target ? target[property] : noop[property],
});
