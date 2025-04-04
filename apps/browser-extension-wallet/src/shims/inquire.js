'use strict';
module.exports = inquire;

/**
 * Requires a module only if available.
 * @memberof util
 * @param {string} moduleName Module to require
 * @returns {?Object} Required module if available and not empty, otherwise `null`
 */
function inquire(moduleName) {
  try {
    if (typeof require !== 'function') {
      return null;
    }
    var mod = require(moduleName);
    if (mod && (mod.length || Object.keys(mod).length)) return mod;
    return null;
  } catch (err) {
    // ignore
    return null;
  }
}
