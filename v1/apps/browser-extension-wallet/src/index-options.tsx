// ============================================
// Global error capture for debugging
// ============================================
const initErrors: Array<{ type: string; message: string; stack?: string; timestamp: number }> = [];
(window as any).__LACE_INIT_ERRORS__ = initErrors;

const captureError = (type: string, error: Error | string, stack?: string) => {
  const errorInfo = {
    type,
    message: typeof error === 'string' ? error : error?.message || 'Unknown',
    stack: stack || (error instanceof Error ? error.stack : undefined),
    timestamp: Date.now()
  };
  initErrors.push(errorInfo);
  console.error(`[options.js] ${type}:`, errorInfo.message);
  if (errorInfo.stack) console.error(`[options.js] Stack:`, errorInfo.stack);
};

// Capture uncaught errors
window.addEventListener('error', (event) => {
  captureError('UNCAUGHT_ERROR', event.error || event.message, event.error?.stack);
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  captureError('UNHANDLED_REJECTION', event.reason, event.reason?.stack);
});

// Capture webpack chunk loading errors
const originalWebpackJsonpPush = (window as any).webpackChunklace_browser_extension_wallet?.push;
if (typeof (window as any).webpackChunklace_browser_extension_wallet !== 'undefined') {
  console.log('[options.js] Webpack chunk array found, monitoring for errors...');
}

// Display errors in the UI
const displayErrorInUI = (title: string, error: Error | string, additionalInfo?: string) => {
  const appElement = document.querySelector('#lace-app');
  if (appElement) {
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    appElement.innerHTML = `
      <div style="padding: 20px; color: #dc3545; font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 40px auto;">
        <h2 style="margin-bottom: 16px;">⚠️ ${title}</h2>
        <p style="margin-bottom: 8px;"><strong>Error:</strong> ${errorMessage}</p>
        ${additionalInfo ? `<p style="margin-bottom: 8px;">${additionalInfo}</p>` : ''}
        <p style="margin-bottom: 8px;"><strong>Possible causes:</strong></p>
        <ul style="margin-bottom: 16px;">
          <li>Extension files not fully loaded after browser restart</li>
          <li>Browser session was interrupted</li>
          <li>Corrupted extension state</li>
        </ul>
        <p style="margin-bottom: 16px;">Try refreshing the page (F5) or restarting the browser.</p>
        <details style="background: #f8f9fa; padding: 12px; border-radius: 4px;">
          <summary style="cursor: pointer; font-weight: bold;">Technical Details</summary>
          <pre style="white-space: pre-wrap; word-break: break-all; margin-top: 8px; font-size: 12px;">${errorStack || 'No stack trace available'}</pre>
          <p style="margin-top: 8px; font-size: 12px;"><strong>All captured errors:</strong></p>
          <pre style="white-space: pre-wrap; word-break: break-all; font-size: 11px;">${JSON.stringify(initErrors, null, 2)}</pre>
        </details>
      </div>
    `;
  }
};

// ============================================
// Dynamic import with error handling
// ============================================
console.log('[options.js] Starting dynamic import of browser-view...');
console.log('[options.js] Extension URL:', window.location.href);
console.log('[options.js] Document readyState:', document.readyState);

import('./views/browser-view')
  .then(() => {
    console.log('[options.js] browser-view chunk loaded successfully');
    console.log('[options.js] Init errors captured:', initErrors.length);
    if (initErrors.length > 0) {
      console.warn('[options.js] Errors during init:', JSON.stringify(initErrors));
    }
  })
  .catch((error) => {
    captureError('CHUNK_LOAD_FAILED', error);
    
    // Check for specific webpack chunk loading errors
    const isChunkLoadError = error?.message?.includes('Loading chunk') || 
                              error?.message?.includes('ChunkLoadError') ||
                              error?.name === 'ChunkLoadError';
    
    const isNetworkError = error?.message?.includes('Failed to fetch') ||
                           error?.message?.includes('NetworkError') ||
                           error?.message?.includes('net::');
    
    let additionalInfo = '';
    if (isChunkLoadError) {
      additionalInfo = 'Webpack failed to load a required code chunk. The extension files may be incomplete.';
    } else if (isNetworkError) {
      additionalInfo = 'Network error while loading application files.';
    }
    
    displayErrorInUI('Failed to load application', error, additionalInfo);
  });
