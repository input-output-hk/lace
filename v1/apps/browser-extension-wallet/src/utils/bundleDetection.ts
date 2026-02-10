export const isV2Bundle = (): boolean =>
  // eslint-disable-next-line camelcase
  (chrome.runtime.getManifest() as { bundle_type?: string }).bundle_type === 'v2';
