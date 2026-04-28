// Replaces @sentry/browser's lazyLoadIntegration in the service worker bundle.
// The original contains a hard-coded "https://browser.sentry-cdn.com" string
// that Chrome Web Store flags as remotely hosted code under Manifest V3.
// Wired up via webpack.NormalModuleReplacementPlugin in base/serviceworker.webpack.config.js.
export const lazyLoadIntegration = () => {
  throw new Error(
    'lazyLoadIntegration is unavailable in the MV3 service worker bundle',
  );
};
