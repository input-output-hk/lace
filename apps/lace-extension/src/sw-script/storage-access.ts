// Everything the extension keeps at rest — encrypted keys, the password
// sentinel, the dApp authorization table (an authorized origin connects with no
// prompt) — lives in chrome.storage.local, which Chrome opens to content
// scripts by default. Code in their world (injected via chrome.debugger, or a
// compromised page renderer) could read or forge those records directly,
// never meeting the messenger's sender gate. No content script reads storage,
// so the area is closed to them.

export type StorageAccessDeps = {
  storage: {
    setAccessLevel(details: { accessLevel: 'TRUSTED_CONTEXTS' }): Promise<void>;
  };
  logger: { warn: (...args: unknown[]) => void };
};

/**
 * Restrict chrome.storage.local to trusted contexts (extension pages and the
 * SW). Chrome keeps the level as an extension preference, so calling it on
 * every SW boot is idempotent and applies it on the first boot after an
 * update. Never rejects: a browser that cannot restrict `local` (Chrome before
 * 140, older Chromium forks) keeps the area exposed and logs a warning —
 * failing the SW boot would lock the user out instead.
 */
export const restrictStorageToTrustedContexts = async ({
  storage,
  logger,
}: StorageAccessDeps): Promise<void> => {
  try {
    await storage.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  } catch (error) {
    logger.warn(
      'chrome.storage.local stays reachable from content scripts',
      error,
    );
  }
};
