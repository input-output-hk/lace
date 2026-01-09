// ============================================
// Track script loading status for diagnostics
// ============================================
window.__SCRIPT_LOAD_STATUS__ = {
  loadAppStarted: Date.now(),
  trigger: null,
  optionsRequested: false,
  optionsLoaded: false,
  optionsError: null
};

console.log('[load-app.js] Script started, readyState:', document.readyState);

// Function to load the main app script
const loadOptionsScript = (trigger) => {
  // Check if already loaded (prevents double loading)
  if (window.__SCRIPT_LOAD_STATUS__.optionsRequested) {
    console.log('[load-app.js] options.js already requested, skipping. Trigger was:', trigger);
    return;
  }
  
  console.log('[load-app.js] Loading options.js, trigger:', trigger);
  window.__SCRIPT_LOAD_STATUS__.trigger = trigger;
  window.__SCRIPT_LOAD_STATUS__.optionsRequested = true;
  window.__SCRIPT_LOAD_STATUS__.optionsRequestedAt = Date.now();
  
  const script = document.createElement('script');
  script.setAttribute('src', 'app/options.js');
  
  // Track successful load
  script.onload = () => {
    console.log('[load-app.js] options.js file downloaded (onload fired)');
    window.__SCRIPT_LOAD_STATUS__.optionsLoaded = true;
    window.__SCRIPT_LOAD_STATUS__.optionsLoadedAt = Date.now();
    
    // Check if the script actually executed (not just loaded)
    // The options.js should set __LACE_INIT_ERRORS__ immediately
    setTimeout(() => {
      const executed = typeof window.__LACE_INIT_ERRORS__ !== 'undefined';
      window.__SCRIPT_LOAD_STATUS__.optionsExecuted = executed;
      
      if (!executed) {
        console.error('[load-app.js] WARNING: options.js loaded but did NOT execute!');
        console.error('[load-app.js] This indicates a script parse error or CSP blocking.');
        console.error('[load-app.js] Webpack chunk array exists:', typeof window.webpackChunklace_browser_extension_wallet !== 'undefined');
        
        // Try to detect why by checking for errors
        window.__SCRIPT_LOAD_STATUS__.executionError = 'Script loaded but __LACE_INIT_ERRORS__ not set';
        
        // Show error in UI
        const appElement = document.querySelector('#lace-app');
        if (appElement && !appElement.innerHTML) {
          appElement.innerHTML = `
            <div style="padding: 20px; color: #dc3545; font-family: sans-serif;">
              <h2>Script Execution Failed</h2>
              <p>The application script (options.js) was downloaded but failed to execute.</p>
              <p>This may indicate:</p>
              <ul>
                <li>A script parse error</li>
                <li>Content Security Policy blocking execution</li>
                <li>Extension context not fully initialized</li>
              </ul>
              <p>Try refreshing the page or restarting the browser.</p>
            </div>
          `;
        }
      } else {
        console.log('[load-app.js] options.js executed successfully');
      }
    }, 100);
  };
  
  // Track load errors
  script.onerror = (error) => {
    console.error('[load-app.js] FAILED to load options.js:', error);
    window.__SCRIPT_LOAD_STATUS__.optionsError = {
      message: 'Script load failed',
      type: error?.type || 'unknown',
      timestamp: Date.now()
    };
    
    // Display error in the app
    const appElement = document.querySelector('#lace-app');
    if (appElement) {
      appElement.innerHTML = `
        <div style="padding: 20px; color: #dc3545; font-family: sans-serif;">
          <h2>Failed to load application script</h2>
          <p>The main application bundle (options.js) could not be loaded.</p>
          <p>This may happen after a browser restart. Try refreshing the page.</p>
          <p><strong>URL:</strong> ${window.location.href}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
      `;
    }
  };
  
  document.head.appendChild(script);
  console.log('[load-app.js] Script tag appended to head');
};

// ============================================
// Multiple triggers to ensure script loads
// ============================================

// 1. Load on window load event (normal case)
window.addEventListener('load', () => loadOptionsScript('load_event'), { once: true });

// 2. Load on pageshow (handles bfcache restore)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    console.log('[load-app.js] Page restored from bfcache, forcing reload');
    window.location.reload();
  } else {
    loadOptionsScript('pageshow_event');
  }
});

// 3. Load immediately if document already complete (handles race conditions)
if (document.readyState === 'complete') {
  console.log('[load-app.js] Document already complete');
  // Use setTimeout to ensure this runs after any synchronous code
  setTimeout(() => loadOptionsScript('immediate_complete'), 0);
} else if (document.readyState === 'interactive') {
  console.log('[load-app.js] Document interactive, waiting for complete');
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'complete') {
      loadOptionsScript('readystatechange');
    }
  });
}

// 4. Fallback: if nothing loaded after 1 second, try anyway
setTimeout(() => {
  if (!window.__SCRIPT_LOAD_STATUS__.optionsRequested) {
    console.warn('[load-app.js] Fallback trigger after 1s timeout');
    loadOptionsScript('timeout_fallback');
  }
}, 1000);

// Prevent bfcache
window.onunload = () => {};
window.addEventListener('beforeunload', () => {});
