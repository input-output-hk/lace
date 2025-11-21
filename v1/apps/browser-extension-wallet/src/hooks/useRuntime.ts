import { runtime } from 'webextension-polyfill';

export type LaceRuntime = { reload: () => void };

export const useRuntime = (): LaceRuntime => ({
  reload: runtime.reload
});
