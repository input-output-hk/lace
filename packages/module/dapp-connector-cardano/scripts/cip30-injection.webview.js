/**
 * CIP-30 WebView injection runtime (REAL JS SOURCE).
 *
 * This file is the maintainable source of the injected code. It is **not**
 * imported/executed directly by React Native. Instead, it is converted into a
 * string at build-time by `scripts/generate-cip30-webview-source.mjs` and
 * emitted to `src/mobile/injection/cip30-injection.webview.generated.ts`.
 *
 * Config is provided by React Native as:
 *   window.__LACE_CIP30_CONFIG__ = { ... };
 */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-expressions */

(() => {
  'use strict';

  try {
    const CONFIG = window.__LACE_CIP30_CONFIG__ || {};
    // Best effort cleanup
    try {
      delete window.__LACE_CIP30_CONFIG__;
    } catch {}

    const PREFIX = '[Lace CIP-30]';

    // Debug logger (no-ops unless CONFIG.debug is true)
    const log = CONFIG.debug
      ? (...args) => console.log(PREFIX, ...args)
      : () => {};
    const warn = CONFIG.debug
      ? (...args) => console.warn(PREFIX, ...args)
      : () => {};
    const error = (...args) => console.error(PREFIX, ...args);

    // Capability token issued by the native bridge and delivered ONLY to the
    // main-frame runtime (injection is main-frame-only). Kept in this closure
    // and never assigned to `window`: a cross-origin subframe cannot read it, so
    // it cannot forge an envelope the native bridge will accept. Every outgoing
    // message carries it and the native side drops anything without an exact
    // match.
    const BRIDGE_TOKEN = CONFIG.bridgeToken;

    // Per-document identifier, regenerated every time this runtime executes
    // (i.e. on every main-frame document load). The native side echoes it back
    // on the matching response; a response minted for an earlier document is
    // rejected here after the top frame navigates, so a witness can never be
    // delivered into a different document than the one that requested it.
    const DOCUMENT_NONCE = (() => {
      try {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, byte =>
          byte.toString(16).padStart(2, '0'),
        ).join('');
      } catch {
        // crypto is effectively always present in a WebView; this only guards
        // against a total absence and still yields a per-load-distinct value.
        // Date.now() is acceptable here because the nonce only binds a response
        // to its document — it is not the security boundary (the capability
        // token is), so it need not be cryptographically unguessable.
        return 'doc_' + Date.now();
      }
    })();

    // Origin of THIS document, captured before any page script runs (this
    // runtime is injectedJavaScriptBeforeContentLoaded). window.location is
    // unforgeable, so a page cannot lie about its own origin, and a cross-origin
    // subframe cannot reach the bridge (injection is main-frame-only + the token
    // is secret to this closure). Stamped on every message so the native side
    // attributes each request to the exact document that made it — no dependency
    // on native navigation events, which race against message timing.
    const DOCUMENT_ORIGIN = window.location.origin;

    // Capture the send path BEFORE any page script runs. A hostile top-level page
    // could otherwise wrap JSON.stringify or ReactNativeWebView.postMessage and,
    // when this runtime later sends a request, read the capability token off the
    // outgoing envelope or rewrite its origin to impersonate an already-authorized
    // dApp. These pristine, bound references are immune to a later override of
    // those globals or a replacement of window.ReactNativeWebView.
    const jsonStringify = JSON.stringify;
    const nativePostMessage =
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage
        ? window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView)
        : null;

    // Prevent re-injection
    if (window.cardano && window.cardano.lace) {
      log('CIP-30 API already injected');
      return;
    }

    log('Initializing CIP-30 API...');

    // Pending requests map - stores Promise resolvers keyed by request ID
    const pendingRequests = new Map();
    let requestCounter = 0;
    let isEnabled = false;

    // Generate unique request ID
    const generateRequestId = () => {
      return 'req_' + ++requestCounter + '_' + Date.now();
    };

    /**
     * Send a request to React Native and wait for response.
     * This is the core communication mechanism between the WebView and the wallet.
     *
     * @param {string} type - The CIP-30 method name
     * @param {Array} args - Arguments for the method
     * @returns {Promise} - Resolves with result or rejects with error
     */
    const sendRequest = (type, args = []) => {
      return new Promise((resolve, reject) => {
        const id = generateRequestId();

        log('Sending request:', { id, type, args });

        pendingRequests.set(id, {
          resolve,
          reject,
          type,
          timestamp: Date.now(),
        });

        var iconLink = document.querySelector('link[rel~=icon]');
        // Pristine stringify + postMessage (captured at init): the token and
        // origin on this envelope cannot be read or rewritten by page code.
        const message = jsonStringify({
          id,
          type,
          args,
          source: 'lace-cip30',
          token: BRIDGE_TOKEN,
          nonce: DOCUMENT_NONCE,
          origin: DOCUMENT_ORIGIN,
          pageTitle: document.title || '',
          faviconUrl: iconLink ? iconLink.href : '',
        });

        // Send to React Native via the pristine bridge captured at init.
        if (nativePostMessage) {
          nativePostMessage(message);
        } else {
          warn('ReactNativeWebView not available');
          reject(new Error('ReactNativeWebView not available'));
          pendingRequests.delete(id);
          return;
        }

        // Timeout handler
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            log('Request timeout:', { id, type });
            pendingRequests.delete(id);
            reject(new Error('Request timeout'));
          }
        }, CONFIG.requestTimeout);
      });
    };

    /**
     * Handle responses from React Native.
     * Called by React Native via webViewRef.injectJavaScript().
     *
     * @param {string|object} responseJson - Response from React Native
     */
    window.laceCip30Response = responseJson => {
      try {
        const response =
          typeof responseJson === 'string'
            ? JSON.parse(responseJson)
            : responseJson;

        const { id, success, result, error: responseError, nonce } = response;

        // Only accept a response addressed to THIS document. After a top-frame
        // navigation the new document has a different DOCUMENT_NONCE, so a
        // witness minted for the previous document is dropped rather than
        // resolved into the wrong page.
        if (nonce !== DOCUMENT_NONCE) {
          log('Ignoring response for a different document:', id);
          return;
        }

        const pending = pendingRequests.get(id);

        if (!pending) {
          log('No pending request for id:', id);
          return;
        }

        log('Received response:', { id, success, type: pending.type });

        pendingRequests.delete(id);

        if (success) {
          pending.resolve(result);
        } else {
          const error_ = new Error(responseError?.info || 'Unknown error');
          error_.code = responseError?.code || -2;
          // CIP-30 PaginateError contract: dApps read maxSize, not a code.
          if (responseError && responseError.maxSize !== undefined) {
            error_.maxSize = responseError.maxSize;
          }
          pending.reject(error_);
        }
      } catch (error_) {
        error('Error handling response:', error_);
      }
    };

    /**
     * CIP-30 Enabled API - returned after successful enable()
     * These methods require prior authorization
     */
    const createEnabledApi = () => ({
      getNetworkId: () => sendRequest('getNetworkId'),
      getUtxos: (amount, paginate) =>
        sendRequest('getUtxos', [amount, paginate]),
      getCollateral: params => sendRequest('getCollateral', [params]),
      getBalance: () => sendRequest('getBalance'),
      getUsedAddresses: paginate => sendRequest('getUsedAddresses', [paginate]),
      getUnusedAddresses: () => sendRequest('getUnusedAddresses'),
      getChangeAddress: () => sendRequest('getChangeAddress'),
      getRewardAddresses: () => sendRequest('getRewardAddresses'),
      getExtensions: () => sendRequest('getExtensions'),
      signTx: (tx, partialSign) => sendRequest('signTx', [tx, partialSign]),
      signData: (addr, payload) => sendRequest('signData', [addr, payload]),
      submitTx: tx => sendRequest('submitTx', [tx]),
      cip95: {
        getPubDRepKey: () => sendRequest('getPubDRepKey'),
        signData: (addr, payload) => sendRequest('signData', [addr, payload]),
        getRegisteredPubStakeKeys: () =>
          sendRequest('getRegisteredPubStakeKeys'),
        getUnregisteredPubStakeKeys: () =>
          sendRequest('getUnregisteredPubStakeKeys'),
      },
      cip142: {
        getNetworkMagic: () => sendRequest('getNetworkMagic'),
      },
      experimental: {
        getCollateral: params => sendRequest('getCollateral', [params]),
      },
    });

    /**
     * CIP-30 Initial API - exposed as window.cardano.lace
     * Only isEnabled and enable are available before authorization
     */
    const laceWallet = {
      name: CONFIG.walletName,
      icon: CONFIG.walletIcon,
      apiVersion: CONFIG.apiVersion,
      supportedExtensions: CONFIG.supportedExtensions,

      /**
       * Check if the dApp is already authorized
       */
      isEnabled: async () => {
        if (isEnabled) return true;
        try {
          const result = await sendRequest('isEnabled');
          isEnabled = !!result;
          return isEnabled;
        } catch (error_) {
          log('isEnabled error:', error_);
          return false;
        }
      },

      /**
       * Request authorization to connect to the wallet
       * @param {Array} extensions - Optional CIP extensions to request
       * @returns {Promise<object>} - Enabled API object
       */
      enable: async extensions => {
        log('enable() called with extensions:', extensions);
        try {
          const result = await sendRequest('enable', [extensions]);
          if (result) {
            isEnabled = true;
            log('enable() successful');
            return createEnabledApi();
          }
          throw new Error('Access denied');
        } catch (error_) {
          log('enable() failed:', error_);
          const error = new Error(error_?.message || 'Failed to enable');
          error.code = error_?.code || -3;
          throw error;
        }
      },
    };

    // Create cardano namespace if it doesn't exist
    if (!window.cardano) {
      window.cardano = {};
    }

    // Inject lace wallet
    window.cardano.lace = laceWallet;

    log('CIP-30 API injected successfully');
    log('Available at window.cardano.lace');
  } catch (error) {
    // Always log hard failures
    console.error('[Lace CIP-30] Injection failed:', error);
  }
})();
true; // Required for injectedJavaScriptBeforeContentLoaded
//# sourceURL=lace-cip30-injection.js
