import { browser } from '@wdio/globals';
import { Logger } from '../support/logger';

export interface Page {
  visit(): void;
}

// Crash screen selector from CrashScreen.ts
const CRASH_SCREEN_SELECTOR = '[data-testid="crash-reload"]';

export abstract class LaceView {
  abstract getBaseUrl(): Promise<string>;

  /**
   * Wait for wallet APIs to be available in the page context.
   * These APIs (walletRepository, walletManager, firstValueFrom) are exposed by wallet-api-ui.ts
   * which is imported by DataCheckContainer when the main app routes mount.
   * 
   * On a fresh session, the app may redirect to /setup, but the APIs should still be available
   * once the React app fully initializes - we just need to wait for them.
   */
  async waitForWalletAPIs(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    let attempts = 0;
    let lastStatus: any = null;

    Logger.log(`[waitForWalletAPIs] START - waiting for wallet APIs to be exposed (timeout: ${timeoutMs}ms)`);

    await browser.waitUntil(
      async () => {
        attempts++;
        try {
          const status = await browser.execute(() => {
            return {
              hasWalletRepository: typeof (window as any).walletRepository !== 'undefined',
              hasWalletManager: typeof (window as any).walletManager !== 'undefined',
              hasFirstValueFrom: typeof (window as any).firstValueFrom !== 'undefined',
              hasAddWallet: typeof (window as any).walletRepository?.addWallet === 'function',
              hasActivate: typeof (window as any).walletManager?.activate === 'function',
              currentPath: window.location.hash,
              documentReady: document.readyState
            };
          });

          lastStatus = status;

          // Log progress periodically
          if (attempts === 1 || (Date.now() - startTime) % 3000 < 500) {
            Logger.log(`[waitForWalletAPIs] Attempt ${attempts} (${Date.now() - startTime}ms): ${JSON.stringify(status)}`);
          }

          // Success: all APIs are available and functional
          const ready = status.hasWalletRepository && status.hasWalletManager && 
                       status.hasFirstValueFrom && status.hasAddWallet && status.hasActivate;
          
          if (ready) {
            Logger.log(`[waitForWalletAPIs] SUCCESS after ${Date.now() - startTime}ms - APIs available at path: ${status.currentPath}`);
          }

          return ready;
        } catch (e: any) {
          lastStatus = { error: e.message };
          return false;
        }
      },
      {
        timeout: timeoutMs,
        interval: 300,
        timeoutMsg: `Wallet APIs not available after ${timeoutMs}ms. Last status: ${JSON.stringify(lastStatus)}. ` +
          `This may indicate the React app didn't fully initialize or wallet-api-ui.ts wasn't loaded.`
      }
    );
  }

  /**
   * Checks for app errors/crashes and returns diagnostic info
   */
  private async checkForAppErrors(): Promise<{ hasCrash: boolean; consoleErrors: string[] }> {
    const result = await browser.execute(() => {
      const crashElement = document.querySelector('[data-testid="crash-reload"]');
      // Collect any visible error messages in the DOM
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], [data-testid*="error"]');
      const errorTexts = Array.from(errorElements).map(el => el.textContent?.trim()).filter(Boolean);
      return {
        hasCrash: !!crashElement,
        visibleErrors: errorTexts.slice(0, 5) // Limit to first 5
      };
    });
    
    return {
      hasCrash: result.hasCrash,
      consoleErrors: result.visibleErrors as string[]
    };
  }

  async waitForPreloaderToDisappear(): Promise<void> {
    const startTime = Date.now();
    let sawPreloader = false;
    
    Logger.log(`[waitForPreloaderToDisappear] START`);
    
    await browser.waitUntil(
      async () => {
        // Check for crash first
        const crashExists = await $(CRASH_SCREEN_SELECTOR).isExisting();
        if (crashExists) {
          const errorInfo = await this.checkForAppErrors();
          Logger.error(`[waitForPreloaderToDisappear] CRASH DETECTED! Errors: ${JSON.stringify(errorInfo)}`);
          throw new Error(`App crashed during load. Crash screen detected.`);
        }
        
        const preloaderExists = await $('#preloader').isExisting();
        
        // Track if we ever saw the preloader (to detect false-positive early returns)
        if (preloaderExists) {
          sawPreloader = true;
        }
        
        // If preloader doesn't exist but we never saw it, check if app has content
        // This prevents returning true before app starts loading
        if (!preloaderExists && !sawPreloader) {
          const hasAppContent = await browser.execute(() => {
            // Lace app uses #lace-app, not #root
            const hasLaceApp = !!document.querySelector('#lace-app');
            const laceAppHasChildren = (document.querySelector('#lace-app')?.children?.length || 0) > 0;
            return hasLaceApp && laceAppHasChildren;
          });
          
          if (!hasAppContent) {
            if ((Date.now() - startTime) % 5000 < 500) {
              Logger.log(`[waitForPreloaderToDisappear] Waiting for app to start loading...`);
            }
            return false;
          }
        }
        
        if (!preloaderExists) {
          Logger.log(`[waitForPreloaderToDisappear] Complete after ${Date.now() - startTime}ms (sawPreloader: ${sawPreloader})`);
        }
        
        return !preloaderExists;
      },
      { timeout: 5 * 60 * 1000, interval: 500 }
    );
  }

  /**
   * Verifies browser navigated to extension page successfully and page is fully loaded.
   * Retries navigation if browser is still on non-extension page.
   * Checks SW status early to fail fast if extension is broken.
   * Fails fast if crash is detected.
   */
  async waitForExtensionPage(targetUrl: string): Promise<void> {
    const startTime = Date.now();
    let navAttempts = 0;
    const maxNavAttempts = 2;
    const SW_CHECK_AFTER_MS = 5000; // Check SW status if React not mounted after 5s
    const FAIL_FAST_AFTER_MS = 10000; // Fail fast if React still not mounted after 10s
    let swChecked = false;

    Logger.log(`[waitForExtensionPage] START - target: ${targetUrl}`);

    await browser.waitUntil(
      async () => {
        try {
          const elapsed = Date.now() - startTime;
          
          const status = await browser.execute(() => {
            const crashElement = document.querySelector('[data-testid="crash-reload"]');
            const laceAppElement = document.querySelector('#lace-app');
            return {
              url: window.location.href,
              isExtensionPage: window.location.protocol === 'chrome-extension:' || window.location.protocol === 'moz-extension:',
              readyState: document.readyState,
              hasBody: !!document.body,
              bodyChildCount: document.body?.children?.length || 0,
              hasCrash: !!crashElement,
              hasLaceApp: !!laceAppElement,
              laceAppChildCount: laceAppElement?.children?.length || 0
            };
          });

          // Check for crash first - fail fast
          if (status.hasCrash) {
            Logger.error(`[waitForExtensionPage] CRASH DETECTED at ${status.url}`);
            throw new Error(`App crashed during navigation. URL: ${status.url}`);
          }

          // Check if on extension page AND document is loaded AND #lace-app has content
          if (status.isExtensionPage && status.readyState === 'complete' && status.laceAppChildCount > 0) {
            Logger.log(`[waitForExtensionPage] SUCCESS after ${elapsed}ms - URL: ${status.url}, laceAppChildren: ${status.laceAppChildCount}`);
            return true;
          }

          // If not on extension page, retry navigation with verification
          if (!status.isExtensionPage) {
            navAttempts++;
            Logger.warn(`[waitForExtensionPage] Attempt ${navAttempts} - Not on extension page. Current: ${status.url}, Expected: ${targetUrl}`);

            if (navAttempts <= maxNavAttempts) {
              Logger.log(`[waitForExtensionPage] Retrying navigation to ${targetUrl}...`);
              
              // Navigate
              await browser.url(targetUrl);
              
              // Immediately verify URL changed (catch silent failures)
              const urlAfterNav = await browser.getUrl();
              const isOnExtension = urlAfterNav.startsWith('chrome-extension://') || urlAfterNav.startsWith('moz-extension://');
              
              if (!isOnExtension) {
                Logger.error(`[waitForExtensionPage] NAVIGATION FAILED SILENTLY - requested: ${targetUrl}, got: ${urlAfterNav}`);
                
                // Try harder: wait for extension to be ready, then navigate again
                if (navAttempts === 1) {
                  Logger.log(`[waitForExtensionPage] Waiting 2s for extension to load before retry...`);
                  await browser.pause(2000);
                  await browser.url(targetUrl);
                  const urlAfterSecondNav = await browser.getUrl();
                  Logger.log(`[waitForExtensionPage] After second navigation: ${urlAfterSecondNav}`);
                }
              } else {
                Logger.log(`[waitForExtensionPage] Navigation verified - now on: ${urlAfterNav}`);
              }
              
              await browser.pause(500);
            } else {
              // Collect diagnostics on final failure
              const diagInfo = await browser.execute(() => {
                return {
                  url: window.location.href,
                  protocol: window.location.protocol,
                  hasChromeRuntime: typeof chrome !== 'undefined' && !!chrome.runtime,
                  hasChromeTabs: typeof chrome !== 'undefined' && !!chrome.tabs,
                  documentReady: document.readyState,
                  bodyHTML: document.body?.innerHTML?.slice(0, 200) || 'NO BODY'
                };
              });
              Logger.error(`[waitForExtensionPage] Navigation diagnostics: ${JSON.stringify(diagInfo)}`);
              throw new Error(`Failed to navigate to extension page after ${navAttempts} attempts. Browser stuck on: ${status.url}. Extension may not be loaded.`);
            }
          } else {
            // On extension page but React hasn't mounted yet
            
            // After 5s, check if SW is responsive - fail fast if not
            if (elapsed > SW_CHECK_AFTER_MS && !swChecked) {
              swChecked = true;
              Logger.log(`[waitForExtensionPage] React not mounted after ${elapsed}ms, checking SW status...`);
              
              try {
                // Use Promise.race to add timeout to the entire browser.execute call
                const swCheckPromise = browser.execute(() => {
                  return new Promise((resolve) => {
                    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
                      resolve({ error: 'chrome.runtime.sendMessage not available' });
                      return;
                    }
                    
                    const timeout = setTimeout(() => {
                      resolve({ error: 'SW message timeout (3s)' });
                    }, 3000);
                    
                    try {
                      chrome.runtime.sendMessage({ type: 'GET_SW_BUNDLE_STATUS' }, (response) => {
                        clearTimeout(timeout);
                        if (chrome.runtime.lastError) {
                          resolve({ error: chrome.runtime.lastError.message });
                          return;
                        }
                        resolve(response || { error: 'No response from SW' });
                      });
                    } catch (e: any) {
                      clearTimeout(timeout);
                      resolve({ error: e.message });
                    }
                  });
                });
                
                // Timeout the entire browser.execute call after 5s
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('browser.execute timeout (5s) - browser may be unresponsive')), 5000)
                );
                
                const swStatus = await Promise.race([swCheckPromise, timeoutPromise]);
                
                Logger.log(`[waitForExtensionPage] SW status: ${JSON.stringify(swStatus)}`);
                
                // If SW is not ready/responding, fail fast
                if ((swStatus as any).error) {
                  Logger.error(`[waitForExtensionPage] SW NOT RESPONDING: ${(swStatus as any).error}`);
                  throw new Error(`Service worker not responding after ${elapsed}ms: ${(swStatus as any).error}. Extension may be broken.`);
                }
                
                // If SW reports errors, fail fast
                if ((swStatus as any).v1Error || (swStatus as any).v2Error) {
                  const swErr = (swStatus as any).v1Error || (swStatus as any).v2Error;
                  Logger.error(`[waitForExtensionPage] SW LOAD ERROR: ${swErr}`);
                  throw new Error(`Service worker load error: ${swErr}`);
                }
                
                // SW is OK but React not mounted - give it a bit more time
                Logger.log(`[waitForExtensionPage] SW OK (bundleReady=${(swStatus as any).bundleReady}), waiting for React...`);
              } catch (swCheckError: any) {
                // Fail fast on SW check errors - don't just warn
                Logger.error(`[waitForExtensionPage] SW check failed: ${swCheckError.message || swCheckError}`);
                Logger.error(`[waitForExtensionPage] Stack: ${swCheckError.stack?.split('\n').slice(0, 3).join(' | ')}`);
                throw new Error(`Extension health check failed after ${elapsed}ms: ${swCheckError.message}. Browser or extension may be unresponsive.`);
              }
            }
            
            // After 10s, fail fast - something is seriously wrong
            if (elapsed > FAIL_FAST_AFTER_MS && status.laceAppChildCount === 0) {
              Logger.error(`[waitForExtensionPage] React not mounted after ${elapsed}ms - collecting diagnostics...`);
              
              // Collect diagnostic information before failing
              try {
                const diagnostics = await browser.execute(() => {
                  const result: any = {
                    url: window.location.href,
                    title: document.title,
                    readyState: document.readyState,
                    // Check for visible errors
                    bodyText: document.body?.innerText?.slice(0, 1000) || '',
                    // Count scripts (should be several for React app)
                    scriptCount: document.querySelectorAll('script').length,
                    scriptSrcs: Array.from(document.querySelectorAll('script[src]')).map((s: any) => s.src).slice(0, 5),
                    // Check #lace-app state
                    laceAppHTML: document.querySelector('#lace-app')?.innerHTML?.slice(0, 200) || 'NOT FOUND',
                    // Check for error elements
                    hasErrorElement: !!document.querySelector('[data-testid="error"]') || !!document.querySelector('.error'),
                    // Check if main bundle loaded
                    hasReact: typeof (window as any).React !== 'undefined',
                    hasWalletRepository: typeof (window as any).walletRepository !== 'undefined',
                  };
                  
                  // Try to get SW crash log if available
                  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    return new Promise((resolve) => {
                      chrome.storage.local.get(['SW_CRASH_LOG'], (storageResult) => {
                        result.swCrashLog = storageResult.SW_CRASH_LOG || null;
                        resolve(result);
                      });
                      // Timeout fallback
                      setTimeout(() => resolve(result), 1000);
                    });
                  }
                  return result;
                });
                
                Logger.error(`[waitForExtensionPage] DIAGNOSTICS:`);
                Logger.error(`  URL: ${diagnostics.url}`);
                Logger.error(`  Title: ${diagnostics.title}`);
                Logger.error(`  Scripts loaded: ${diagnostics.scriptCount}`);
                Logger.error(`  Script sources: ${JSON.stringify(diagnostics.scriptSrcs)}`);
                Logger.error(`  #lace-app HTML: ${diagnostics.laceAppHTML}`);
                Logger.error(`  hasReact: ${diagnostics.hasReact}, hasWalletRepository: ${diagnostics.hasWalletRepository}`);
                
                if (diagnostics.bodyText.toLowerCase().includes('error')) {
                  Logger.error(`  Body text (contains 'error'): ${diagnostics.bodyText.slice(0, 500)}`);
                }
                
                if (diagnostics.swCrashLog) {
                  Logger.error(`  SW Crash Log: ${JSON.stringify(diagnostics.swCrashLog)}`);
                  if (diagnostics.swCrashLog.errors?.length > 0) {
                    Logger.error(`  SW Errors:`);
                    for (const err of diagnostics.swCrashLog.errors.slice(-5)) {
                      Logger.error(`    - ${err.timestamp}: ${err.type} - ${err.message || err.reason}`);
                    }
                  }
                }
              } catch (diagError) {
                Logger.error(`[waitForExtensionPage] Failed to collect diagnostics: ${diagError}`);
              }
              
              throw new Error(`React app failed to mount after ${elapsed}ms. hasLaceApp: ${status.hasLaceApp}, children: ${status.laceAppChildCount}. Extension JS may have failed to execute.`);
            }
            
            // Log progress periodically
            if (elapsed % 2000 < 500) {
              Logger.log(`[waitForExtensionPage] Loading... readyState: ${status.readyState}, hasLaceApp: ${status.hasLaceApp}, laceAppChildren: ${status.laceAppChildCount}, elapsed: ${elapsed}ms`);
            }
          }

          return false;
        } catch (e: any) {
          // Re-throw all errors to fail fast
          if (e.message?.includes('crashed') || e.message?.includes('Service worker') || 
              e.message?.includes('React app failed') || e.message?.includes('Failed to navigate')) {
            throw e;
          }
          Logger.warn(`[waitForExtensionPage] Check failed: ${e}`);
          return false;
        }
      },
      {
        timeout: 15000, // Reduced from 60s - fail fast
        interval: 500,
        timeoutMsg: `Failed to load extension page after ${Date.now() - startTime}ms. Target: ${targetUrl}`
      }
    );
  }
}
