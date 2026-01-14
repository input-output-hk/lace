// Service worker bundle
// SW scripts have to be imported synchronously (or very fast, if async)

// Initialize bundle state tracking
globalThis.LMP_BUNDLE = true;
globalThis.SW_BUNDLE_STATE = {
  startTime: Date.now(),
  v1Loaded: false,
  v1Error: null,
  v2Loaded: false,
  v2Error: null,
  ready: false,
  errors: [],
  unhandledErrors: []
};

// Global error handler - capture ALL unhandled errors
globalThis.onerror = function(message, source, lineno, colno, error) {
  const errorInfo = {
    type: 'error',
    message: message,
    source: source,
    line: lineno,
    col: colno,
    stack: error?.stack,
    timestamp: new Date().toISOString()
  };
  globalThis.SW_BUNDLE_STATE.unhandledErrors.push(errorInfo);
  console.error('[SW-BUNDLE] UNHANDLED ERROR:', message);
  console.error('[SW-BUNDLE] Source:', source, 'Line:', lineno);
  if (error?.stack) console.error('[SW-BUNDLE] Stack:', error.stack);
  return false; // Don't suppress the error
};

// Global unhandled rejection handler
globalThis.onunhandledrejection = function(event) {
  const errorInfo = {
    type: 'unhandledrejection',
    reason: event.reason?.message || String(event.reason),
    stack: event.reason?.stack,
    timestamp: new Date().toISOString()
  };
  globalThis.SW_BUNDLE_STATE.unhandledErrors.push(errorInfo);
  console.error('[SW-BUNDLE] UNHANDLED REJECTION:', event.reason);
  if (event.reason?.stack) console.error('[SW-BUNDLE] Stack:', event.reason.stack);
};

console.log('[SW-BUNDLE] ========================================');
console.log('[SW-BUNDLE] Starting service worker bundle initialization');
console.log('[SW-BUNDLE] Timestamp:', new Date().toISOString());
console.log('[SW-BUNDLE] Global error handlers installed');
console.log('[SW-BUNDLE] ========================================');

// Load V1 (Lace) service worker
console.log('[SW-BUNDLE] Loading V1 (Lace) service worker...');
try {
  importScripts("/sw/background.js");
  globalThis.SW_BUNDLE_STATE.v1Loaded = true;
  console.log('[SW-BUNDLE] V1 (Lace) service worker loaded successfully');
} catch (error) {
  globalThis.SW_BUNDLE_STATE.v1Error = error?.message || String(error);
  console.error('[SW-BUNDLE] V1 (Lace) service worker FAILED to load:', error);
}

// Load V2 (Midnight) service worker
console.log('[SW-BUNDLE] Loading V2 (Midnight) service worker...');
try {
  importScripts("/js/sw/sw-script.js");
  globalThis.SW_BUNDLE_STATE.v2Loaded = true;
  console.log('[SW-BUNDLE] V2 (Midnight) service worker loaded successfully');
} catch (error) {
  globalThis.SW_BUNDLE_STATE.v2Error = error?.message || String(error);
  console.error('[SW-BUNDLE] V2 (Midnight) service worker FAILED to load:', error);
}

// Summary
const loadDuration = Date.now() - globalThis.SW_BUNDLE_STATE.startTime;
console.log('[SW-BUNDLE] ========================================');
console.log('[SW-BUNDLE] Bundle load complete in', loadDuration, 'ms');
console.log('[SW-BUNDLE] V1 loaded:', globalThis.SW_BUNDLE_STATE.v1Loaded);
console.log('[SW-BUNDLE] V2 loaded:', globalThis.SW_BUNDLE_STATE.v2Loaded);
if (globalThis.SW_BUNDLE_STATE.v1Error) {
  console.error('[SW-BUNDLE] V1 ERROR:', globalThis.SW_BUNDLE_STATE.v1Error);
}
if (globalThis.SW_BUNDLE_STATE.v2Error) {
  console.error('[SW-BUNDLE] V2 ERROR:', globalThis.SW_BUNDLE_STATE.v2Error);
}
console.log('[SW-BUNDLE] ========================================');

// Mark bundle as ready if both loaded successfully
if (globalThis.SW_BUNDLE_STATE.v1Loaded && globalThis.SW_BUNDLE_STATE.v2Loaded) {
  globalThis.SW_BUNDLE_STATE.ready = true;
  console.log('[SW-BUNDLE] ✓ Bundle ready - both service workers loaded');
} else {
  console.error('[SW-BUNDLE] ✗ Bundle NOT ready - service worker(s) failed to load');
}
