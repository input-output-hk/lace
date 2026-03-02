import { runtime } from 'webextension-polyfill';

export const isV2Bundle = (): boolean =>
  // eslint-disable-next-line camelcase
  (runtime.getManifest() as { bundle_type?: string }).bundle_type === 'v2';
