/*
The latest published version of protobufjs/inquire uses eval, which is not allowed in the browser extension
https://github.com/protobufjs/protobuf.js/blob/2b12fb7db9d4eaa3b76b7198539946e97db684c4/lib/inquire/index.js

This issue has been already fixed in protobujs/inquire
https://github.com/protobufjs/protobuf.js/blob/master/lib/inquire/index.js

but not published yet
https://github.com/protobufjs/protobuf.js/pull/1941

This shim can be removed once protobujs/inquire is published with the fix
*/

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
