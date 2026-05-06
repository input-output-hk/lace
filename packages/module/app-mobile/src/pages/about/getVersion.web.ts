import { runtime } from 'webextension-polyfill';

export const getVersion = (): string => runtime.getManifest().version;
