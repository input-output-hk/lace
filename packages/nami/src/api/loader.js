// import * as wasm from '../wasm/cardano_multiplatform_lib/cardano_multiplatform_lib.generated';
// import * as wasm2 from '../wasm/cardano_message_signing/cardano_message_signing.generated';

const wasm = {};
const wasm2 = {};

/**
 * Loads the WASM modules
 */

class LoaderClass {
  async load() {
    if (this._wasm && this._wasm2) return;
    try {
      await wasm.instantiate();
      await wasm2.instantiate();
    } catch (_e) {
      // Only happens when running with Jest (Node.js)
    }
    /**
     * @private
     */
    this._wasm = wasm;
    /**
     * @private
     */
    this._wasm2 = wasm2;
  }

  get Cardano() {
    return this._wasm;
  }

  get Message() {
    return this._wasm2;
  }
}

export const Loader = new LoaderClass();
